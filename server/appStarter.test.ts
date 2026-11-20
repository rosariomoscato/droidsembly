import { describe, expect, it, vi } from 'vitest';
import { appPlanText, compatibleHost, planningHeld, type AppPlan } from '../shared/appStarter.ts';
import { approvePlan, checkDraft, newAppStarter, planHash, planningSkill, planningText, presentPlan, publishPlan, taskBody, taskMarker, validatePlan, type PlanRemote } from './appStarter.ts';
import { demoAppTurn } from './demoAppStarter.ts';
import { askedFor, ceoJobPrompt } from './ceo.ts';

function plan(): AppPlan {
  return {
    requirements: 'Track books', users: 'Private reader', dataModel: 'Books: title, status, owner',
    mvp: 'Add and edit books', exclusions: 'No sharing', stack: 'React recommended; alternatives welcome',
    design: 'Warm paper, keyboard accessible',
    environments: { workerHost: 'box', testPreview: 'Per-Box isolated preview', deployment: 'Private server',
      data: 'sample', dataAccess: 'sample', database: 'SQLite', isolation: 'Disposable seed DBs, never production', prerequisites: 'Verify runtime tools' },
    risks: 'SQLite to Postgres needs migration tests',
    tasks: [
      { id: 'core', title: 'Build core', body: 'Acceptance: ownership tests pass.', dependsOn: ['foundation'] },
      { id: 'foundation', title: 'Build foundation', body: 'Acceptance: isolated migration / seed / build pass.', dependsOn: [] },
    ],
  };
}
function approved() {
  const d = newAppStarter('Books');
  presentPlan(d, plan(), 'Agreed with the manager');
  approvePlan(d, d.hash!, true, false);
  return d;
}
function remote() {
  const issues: { number: number; title: string; body: string }[] = [];
  const api: PlanRemote = {
    create: vi.fn(async (title, body) => { const n = issues.length + 1; issues.push({ number: n, title, body }); return n; }),
    find: vi.fn(async (marker) => issues.filter((i) => i.body.includes(marker))),
    details: vi.fn(async (n) => issues.find((i) => i.number === n)!),
  };
  return { api, issues };
}

describe('original CEO planning resource', () => {
  it('is local, scoped, non-executing and database/host aware', () => {
    const skill = planningSkill();
    for (const expected of ['Before recommending ANY database', 'SQLite and Docker do not imply local workers', 'Neon is an option', 'never production', 'one relevant question', 'You may NOT approve', 'install globally', 'No mandatory framework', 'global CEO notes'])
      expect(skill).toContain(expected);
    expect(skill).not.toContain('npx skills');
    expect(askedFor({ kind: 'app-starter' })).toBe(false);
    expect(ceoJobPrompt({ kind: 'app-starter', repoId: 'acme/books', draftId: 'd', revision: 4, at: 0 }, null)).toContain('revision 4');
  });
  it('keeps the full approved build sheet visible, including exact tasks and environments', () => {
    const text = appPlanText(plan());
    for (const value of ['No sharing', 'Books: title', 'Per-Box', 'Private server', 'SQLite', 'ownership tests', 'foundation', 'Warm paper', 'Verify runtime'])
      expect(text).toContain(value);
  });
});

describe('draft transitions and bounds', () => {
  it('rejects foreign and stale revisions; never infers approval from answers', () => {
    const a = newAppStarter('yes'), b = newAppStarter('yes');
    expect(a.approved).toBeUndefined();
    expect(() => checkDraft(a, { draftId: b.id, revision: 1 })).toThrow('stale');
    const old = { draftId: a.id, revision: a.revision };
    presentPlan(a, plan(), 'first');
    expect(() => checkDraft(a, old)).toThrow('stale');
    expect(() => approvePlan(a, 'yes', true, true)).toThrow('exact');
    expect(a.ledger).toEqual([]);
  });
  it('invalidates fingerprints and approvals when a presented plan changes', () => {
    const d = newAppStarter('');
    presentPlan(d, plan(), 'first');
    const first = d.hash, rev = d.revision;
    presentPlan(d, { ...plan(), mvp: 'Different MVP' }, 'second');
    expect(d.revision).toBe(rev + 1);
    expect(d.hash).not.toBe(first);
    expect(() => approvePlan(d, first!, true, false)).toThrow();
    approvePlan(d, d.hash!, true, false);
    expect(d.approved).toMatchObject({ revision: d.revision, hash: d.hash });
    expect(() => approvePlan(d, d.hash!, true, false)).toThrow();
    expect(() => presentPlan(d, plan(), 'edit while publishing')).toThrow('not editable');
  });
  it('requires independent confirmation of environments and non-transferable local data', () => {
    const d = newAppStarter('');
    const p = plan();
    p.environments = { ...p.environments, workerHost: 'local', data: 'existing', dataAccess: 'local-only' };
    presentPlan(d, p, 'Local data');
    expect(() => approvePlan(d, d.hash!, false, true)).toThrow('Confirm');
    expect(() => approvePlan(d, d.hash!, true, false)).toThrow('Confirm');
    approvePlan(d, d.hash!, true, true);
    expect(d.status).toBe('publishing');
  });
  it('bounds tasks, size, stable IDs, dependency depth and cycles', () => {
    expect(() => validatePlan({ ...plan(), tasks: [] })).toThrow();
    expect(() => validatePlan({ ...plan(), tasks: Array(13).fill(plan().tasks[0]) })).toThrow();
    expect(() => validatePlan({ ...plan(), requirements: 'x'.repeat(4001) })).toThrow();
    expect(() => validatePlan({ ...plan(), tasks: [plan().tasks[1], plan().tasks[1]] })).toThrow('unique');
    const p = plan();
    p.tasks[1].dependsOn = ['core'];
    expect(() => validatePlan(p)).toThrow('cycle');
    p.tasks[1].dependsOn = ['missing'];
    expect(() => validatePlan(p)).toThrow('Unknown');
    p.tasks = ['a', 'b', 'c', 'd'].map((id, i, ids) => ({ id, title: id, body: 'test', dependsOn: i ? [ids[i - 1]] : [] }));
    expect(() => validatePlan(p)).toThrow('two steps');
    p.tasks = [{ id: 'a', title: 'a', body: 'Depends on #123', dependsOn: [] }];
    expect(() => validatePlan(p)).toThrow('stable task');
  });
  it.each(['postgres://reader:password@private/db', 'password=hunter2', 'token=abcdefg', '-----BEGIN RSA PRIVATE KEY-----', `ghp_${'a'.repeat(30)}`])('refuses accidental secrets: %s', (value) => {
    expect(() => planningText(value)).toThrow('credentials');
  });
  it('round-trips project state without approving, cross-project leakage or changing the hash', () => {
    const a = approved(), b = newAppStarter('Other project');
    const copy = JSON.parse(JSON.stringify([a, b]));
    expect(copy).toEqual([a, b]);
    expect(copy[1].approved).toBeUndefined();
    expect(copy[1].messages[0].text).toBe('Other project');
    expect(planHash(copy[0].plan)).toBe(a.hash);
  });
});

describe('host / database / data matrix', () => {
  for (const host of ['local', 'box'] as const) for (const database of ['SQLite', 'Docker Postgres', 'Neon / cloud Postgres'])
    for (const dataAccess of ['sample', 'local-only', 'anonymized-copy', 'secure-service'] as const) {
      it(`${host} / ${database} / ${dataAccess}`, () => {
        const p = plan();
        p.environments = { ...p.environments, workerHost: host, database, data: dataAccess === 'sample' ? 'sample' : 'existing', dataAccess };
        if (host === 'box' && dataAccess === 'local-only') expect(() => validatePlan(p)).toThrow('Non-transferable');
        else {
          const d = newAppStarter('');
          presentPlan(d, p, 'decision');
          expect(planningHeld(d)).toBe(true);
          expect(compatibleHost(d, host)).toBe(false);
          d.status = 'ready';
          expect(compatibleHost(d, host)).toBe(true);
          expect(compatibleHost(d, host === 'local' ? 'box' : 'local')).toBe(false);
        }
      });
    }
  it('does not change legacy projects', () => {
    expect(planningHeld()).toBe(false);
    expect(compatibleHost(undefined, 'local')).toBe(true);
    expect(compatibleHost(undefined, 'box')).toBe(true);
  });
});

describe('deterministic recoverable publisher', () => {
  it('persists intent first, topologically publishes exact tasks and verifies dependencies before ready', async () => {
    const d = approved(), r = remote();
    const saves: string[] = [];
    const persist = vi.fn(async () => { saves.push(JSON.stringify(d)); });
    await publishPlan(d, r.api, persist, () => true);
    expect(d.status).toBe('ready');
    expect(r.issues.map((i) => i.title)).toEqual(['Build foundation', 'Build core']);
    expect(JSON.parse(saves[0]).ledger.find((l: { taskId: string }) => l.taskId === 'foundation').state).toBe('in-flight');
    expect(r.issues[1].body).toBe(taskBody(d, 'core'));
    expect(r.issues[1].body).toContain('Depends on #1');
    expect(r.issues[1].body).toContain(taskMarker(d, 'core'));
    expect(r.issues[1].body).toContain(appPlanText(d.plan!));
    expect(d.ledger.every((l) => l.state === 'confirmed')).toBe(true);
  });
  it('refuses publication without exact approval, including a mutated approved document', async () => {
    const d = approved(), r = remote();
    d.plan!.mvp = 'Tampered';
    await expect(publishPlan(d, r.api, async () => {}, () => true)).rejects.toThrow('exact approved');
    expect(r.api.create).not.toHaveBeenCalled();
    delete d.approved;
    await expect(publishPlan(d, r.api, async () => {}, () => true)).rejects.toThrow();
  });
  it('does not call GitHub if durable intent fails', async () => {
    const d = approved(), r = remote();
    await expect(publishPlan(d, r.api, async () => { throw new Error('disk failed'); }, () => true)).rejects.toThrow('disk failed');
    expect(r.api.create).not.toHaveBeenCalled();
    expect(d.status).toBe('paused');
  });
  it('retains partial success, reconciles a lost response after restart, and never regenerates tasks', async () => {
    const d = approved(), r = remote();
    const create = r.api.create;
    r.api.create = vi.fn(async (title, body) => {
      const n = await create(title, body);
      if (title === 'Build core') throw new Error('response lost');
      return n;
    });
    await publishPlan(d, r.api, async () => {}, () => true);
    expect(d.status).toBe('paused');
    expect(d.ledger.map((l) => l.state)).toEqual(['unknown', 'confirmed']);
    const restarted = JSON.parse(JSON.stringify(d));
    restarted.status = 'publishing';
    await publishPlan(restarted, r.api, async () => {}, () => true);
    expect(restarted.status).toBe('ready');
    expect(r.api.create).toHaveBeenCalledTimes(2);
    expect(r.issues).toHaveLength(2);
    expect(r.api.find).toHaveBeenCalledWith(taskMarker(d, 'core'));
  });
  it.each([0, 2])('pauses on %i marker matches without blind recreation or deletion', async (matches) => {
    const d = approved(), r = remote();
    const l = d.ledger.find((l) => l.taskId === 'foundation')!;
    l.state = 'in-flight';
    r.api.find = vi.fn(async () => Array.from({ length: matches }, (_, i) => ({ number: i + 1, title: 'Build foundation', body: taskBody(d, 'foundation') })));
    await publishPlan(d, r.api, async () => {}, () => true);
    expect(d.status).toBe('paused');
    expect(r.api.create).not.toHaveBeenCalled();
    expect(d.problem).toContain('ambiguous');
  });
  it('pauses if remote content/dependencies were changed', async () => {
    const d = approved(), r = remote();
    r.api.details = vi.fn(async () => ({ title: 'Wrong task', body: 'edited' }));
    await publishPlan(d, r.api, async () => {}, () => true);
    expect(d.status).toBe('paused');
    expect(r.api.create).toHaveBeenCalledTimes(1);
  });
  it('pause or cancellation stops subsequent calls while retaining a completed in-flight issue', async () => {
    const d = approved(), r = remote();
    const create = r.api.create;
    r.api.create = vi.fn(async (title, body) => { d.status = 'cancelled'; return create(title, body); });
    await publishPlan(d, r.api, async () => {}, () => true);
    expect(d.status).toBe('cancelled');
    expect(r.api.create).toHaveBeenCalledTimes(1);
    expect(d.ledger.find((l) => l.taskId === 'foundation')?.state).toBe('confirmed');
  });
  it('stopping before a persisted intent prevents the remote call', async () => {
    const d = approved(), r = remote();
    let active = true;
    await publishPlan(d, r.api, async () => { active = false; }, () => active);
    expect(r.api.create).not.toHaveBeenCalled();
    expect(d.status).not.toBe('ready');
  });
});

it('scripted demo follows isolated questions and presents without publishing', () => {
  const d = newAppStarter('Book tracker');
  const answers = ['Private readers', 'Books and ownership', 'Box', 'Per-Box fixtures', 'Private hosted server', 'sample', 'No existing data', 'CRUD only', 'Paper style'];
  for (const answer of answers) {
    const turn = demoAppTurn(d, true);
    expect(turn.question).toBeTruthy();
    expect(turn.plan).toBeUndefined();
    d.messages.push({ id: crypto.randomUUID(), from: 'ceo', text: turn.question! }, { id: crypto.randomUUID(), from: 'manager', text: answer });
  }
  const final = demoAppTurn(d, true);
  expect(validatePlan(final.plan).environments).toMatchObject({ workerHost: 'box', database: expect.stringContaining('SQLite'), dataAccess: 'sample' });
  const originalEnvironments = final.plan!.environments;
  d.messages.push({ id: crypto.randomUUID(), from: 'manager', text: 'Add an author filter to the MVP.' });
  const revised = demoAppTurn(d, true);
  expect(validatePlan(revised.plan).environments).toEqual(originalEnvironments);
  expect(revised.plan!.mvp).toContain('Add an author filter');
  expect(revised.plan!.tasks[1].body).toContain('Add an author filter');
  expect(d.approved).toBeUndefined();
  expect(d.ledger).toEqual([]);
});
