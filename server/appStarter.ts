// Validation and recoverable, deterministic publication; never calls an AI or provisions infrastructure.
import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { appPlanText, type AppPlan, type AppStarter, type DraftRef } from '../shared/appStarter.ts';
import { HttpError } from './httpError.ts';

const text = z.string().trim().min(1).max(4000);
export const appPlanSchema = z.object({
  requirements: text, users: text, dataModel: text, mvp: text, exclusions: text,
  stack: text, design: text, risks: text,
  environments: z.object({
    workerHost: z.enum(['local', 'box']), testPreview: text, deployment: text,
    data: z.enum(['sample', 'existing']),
    dataAccess: z.enum(['sample', 'local-only', 'anonymized-copy', 'secure-service']),
    database: text, isolation: text, prerequisites: text,
  }).strict(),
  tasks: z.array(z.object({
    id: z.string().regex(/^[a-z][a-z0-9-]{0,39}$/),
    title: z.string().trim().min(1).max(120), body: text,
    dependsOn: z.array(z.string()).max(10),
  }).strict()).min(1).max(12),
}).strict();

/** Heuristic guard against accidental secret pastes, not a claim to detect every secret. */
export function planningText(value: string) {
  if (/(?:[a-z][a-z0-9+.-]*:\/\/)[^\s/]+:[^\s/@]+@|-----BEGIN .*PRIVATE KEY-----|\b(?:sk-[a-zA-Z0-9_-]{16,}|gh[pousr]_[a-zA-Z0-9]{16,})|\b(?:password|passwd|token|secret|api[_-]?key)\s*[:=]\s*["']?[^\s"']{4,}/i.test(value))
    throw new HttpError(400, 'Do not put credentials, connection strings or data dumps in planning. Use synthetic descriptions.');
  return value;
}

export function newAppStarter(brief: string): AppStarter {
  planningText(brief);
  return { id: crypto.randomUUID(), revision: 1, status: 'interview',
    messages: brief ? [{ id: crypto.randomUUID(), from: 'manager', text: brief }] : [],
    decisions: '', ledger: [] };
}

export function checkDraft(d: AppStarter | undefined, ref: DraftRef): asserts d is AppStarter {
  if (!d || d.id !== ref.draftId || d.revision !== ref.revision)
    throw new HttpError(409, 'This planning revision is stale. Read the current project plan.');
}

export function validatePlan(input: unknown): AppPlan {
  const result = appPlanSchema.safeParse(input);
  if (!result.success) throw new HttpError(400, result.error.message);
  const p = result.data;
  planningText(JSON.stringify(p));
  if (appPlanText(p).length > 30000) throw new HttpError(400, 'Plan exceeds 30000 characters.');
  const e = p.environments;
  if ((e.data === 'sample') !== (e.dataAccess === 'sample'))
    throw new HttpError(400, 'Describe how existing data can safely be used.');
  if (e.dataAccess === 'local-only' && e.workerHost !== 'local')
    throw new HttpError(400, 'Non-transferable local data needs confirmed local workers; SQLite or Docker alone does not.');
  const ids = new Set(p.tasks.map((t) => t.id));
  if (ids.size !== p.tasks.length) throw new HttpError(400, 'Task IDs must be unique.');
  const visit = (id: string, seen: string[] = []): number => {
    if (seen.includes(id)) throw new HttpError(400, 'Task dependencies form a cycle.');
    const t = p.tasks.find((t) => t.id === id);
    if (!t) throw new HttpError(400, `Unknown dependency ${id}.`);
    if (/Depends on #\d+/i.test(t.body)) throw new HttpError(400, 'Use stable task IDs for dependencies, not issue numbers.');
    return Math.max(0, ...t.dependsOn.map((dep) => 1 + visit(dep, [...seen, id])));
  };
  for (const t of p.tasks) if (visit(t.id) > 2) throw new HttpError(400, 'Keep dependency chains to two steps.');
  return p;
}

export const planHash = (p: AppPlan) => crypto.createHash('sha256').update(JSON.stringify(p)).digest('hex');
export const planningSkill = () => readFileSync(new URL('./skills/ceo-app-starter.md', import.meta.url), 'utf8');

export function presentPlan(d: AppStarter, input: unknown, decisions: string) {
  if (!['interview', 'awaiting-approval'].includes(d.status) || d.ledger.length)
    throw new HttpError(409, 'This draft is not editable.');
  const plan = validatePlan(input);
  planningText(decisions);
  d.plan = plan;
  d.decisions = decisions;
  d.revision++;
  d.hash = planHash(plan);
  delete d.approved;
  d.status = 'awaiting-approval';
}

export function approvePlan(d: AppStarter, hash: string, confirmedEnvironments: boolean, confirmedLocal: boolean) {
  if (d.status !== 'awaiting-approval' || !d.plan || d.hash !== hash || hash !== planHash(d.plan))
    throw new HttpError(409, 'Only the exact displayed revision can be approved, once.');
  if (!confirmedEnvironments || (d.plan.environments.dataAccess === 'local-only' && !confirmedLocal))
    throw new HttpError(400, 'Confirm isolated test/preview environments and, if needed, local workers with the computer kept on.');
  d.approved = { revision: d.revision, hash, at: Date.now(), environments: true, localWorkers: confirmedLocal };
  d.ledger = d.plan.tasks.map((t) => ({ taskId: t.id, state: 'pending' }));
  d.status = 'publishing';
}

export const taskMarker = (d: AppStarter, taskId: string) =>
  `<!-- droidsembly-plan:${d.id}:${d.approved!.revision}:${d.approved!.hash}:${taskId} -->`;

export interface PlanRemote {
  create(title: string, body: string): Promise<number>;
  /** All states, full pagination, no search-index assumptions. */
  find(marker: string): Promise<{ number: number; title: string; body: string }[]>;
  details(number: number): Promise<{ title: string; body: string }>;
}

export function taskBody(d: AppStarter, taskId: string) {
  const t = d.plan!.tasks.find((t) => t.id === taskId)!;
  const deps = t.dependsOn.map((id) => {
    const entry = d.ledger.find((l) => l.taskId === id);
    if (entry?.state !== 'confirmed' || !entry.number) throw new Error('Dependencies are not confirmed.');
    return `#${entry.number}`;
  });
  return `${deps.length ? `Depends on ${deps.join(', ')}\n\n` : ''}${t.body}\n\n${taskMarker(d, t.id)}\n\n---\nApproved project plan (revision ${d.approved!.revision})\n\n${appPlanText(d.plan!)}`;
}

/** Caller serializes per project. An ambiguous create is reconciled, never blindly retried. */
export async function publishPlan(d: AppStarter, remote: PlanRemote, persist: () => Promise<void>, active: () => boolean) {
  if (!d.plan || !d.approved || !d.approved.environments || (d.plan.environments.dataAccess === 'local-only' && !d.approved.localWorkers) || d.approved.hash !== planHash(d.plan) || d.approved.revision !== d.revision)
    throw new HttpError(409, 'No exact approved plan.');
  const live = () => active() && d.status === 'publishing';
  try {
    // A restart must not trust an old local confirmation after a remote edit.
    for (const entry of d.ledger.filter((l) => l.state === 'confirmed')) {
      if (!live()) return;
      const task = d.plan.tasks.find((t) => t.id === entry.taskId)!;
      const actual = await remote.details(entry.number!);
      if (actual.title !== task.title || actual.body !== taskBody(d, task.id))
        throw new Error('A previously confirmed issue was changed.');
    }
    while (live()) {
      const entry = d.ledger.find((l) => l.state !== 'confirmed' &&
        d.plan!.tasks.find((t) => t.id === l.taskId)!.dependsOn.every((id) => d.ledger.find((l) => l.taskId === id)?.state === 'confirmed'));
      if (!entry) break;
      const task = d.plan.tasks.find((t) => t.id === entry.taskId)!;
      const body = taskBody(d, task.id);
      if (entry.state === 'in-flight' || entry.state === 'unknown') {
        const matches = await remote.find(taskMarker(d, task.id));
        if (!live()) return;
        if (matches.length !== 1 || matches[0].title !== task.title || matches[0].body !== body)
          throw new Error('Ambiguous GitHub outcome. Reconcile the marked issue; no automatic recreation or deletion.');
        entry.number = matches[0].number;
      } else {
        entry.state = 'in-flight';
        await persist(); // Durable intent BEFORE the remote side effect.
        if (!live()) return;
        try { entry.number = await remote.create(task.title, body); }
        catch (err) { entry.state = 'unknown'; throw err; }
      }
      const actual = await remote.details(entry.number!);
      if (actual.title !== task.title || actual.body !== body) throw new Error('Published issue differs from the approved task/dependencies.');
      entry.state = 'confirmed';
      await persist();
    }
    if (live() && d.ledger.every((l) => l.state === 'confirmed')) {
      for (const entry of d.ledger) {
        if (!live()) return;
        const task = d.plan.tasks.find((t) => t.id === entry.taskId)!;
        const actual = await remote.details(entry.number!);
        if (actual.title !== task.title || actual.body !== taskBody(d, task.id))
          throw new Error('A published issue was changed.');
      }
      if (!live()) return;
      d.status = 'ready';
      delete d.problem;
      await persist();
    }
  } catch {
    if (d.status === 'publishing') d.status = 'paused';
    d.problem = 'Publication paused: GitHub outcome may be ambiguous. Reconcile marked issues before resuming; no automatic recreation or deletion.';
    await persist();
  }
}
