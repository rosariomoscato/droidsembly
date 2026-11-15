// One office tab reads each message aloud: every tab that would speak it claims it on a BroadcastChannel, and after a
// short wait the best claim wins (voiceQueue.ts's claimWinner). Opened with the page rather than with the lazy player
// (voiceMessages.ts), so a tab hears the others' claims before its own first message arrives.
import { claimWinner, type VoiceClaim } from './voiceQueue';

/** How long tabs offer to read a message before the winner starts. */
export const CLAIM_MS = 250;
const KEEP = 50;

const tab = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
const claims = new Map<number, VoiceClaim[]>(); // kept for claims that arrive before this tab has the message
const channels = typeof document !== 'undefined' && typeof BroadcastChannel !== 'undefined'
  ? ['droidsembly:voice', 'cubefarm:voice'].flatMap((name) => {
    try { return [new BroadcastChannel(name)]; }
    catch { return []; } // blocked storage/messaging must not prevent office startup
  }) : [];

function claimsFor(id: number): VoiceClaim[] {
  let list = claims.get(id);
  if (!list) {
    list = [];
    claims.set(id, list);
    if (claims.size > KEEP) claims.delete(claims.keys().next().value!);
  }
  return list;
}

function remember(id: number, claim: VoiceClaim) {
  const list = claimsFor(id);
  if (!list.some((c) => c.tab === claim.tab && c.at === claim.at)) list.push(claim);
}

for (const channel of channels) channel.addEventListener('message', (e: MessageEvent) => {
  const d = e.data as { id?: unknown; tab?: unknown; visible?: unknown; at?: unknown } | null;
  if (typeof d?.id === 'number' && typeof d.tab === 'string' && typeof d.at === 'number') remember(d.id, { tab: d.tab, visible: d.visible === true, at: d.at });
});

/** Offers to read message `id` in this tab; returns how long to wait before asking wonVoice (0 with no other tabs). */
export function claimVoice(id: number): number {
  const mine: VoiceClaim = { tab, visible: document.visibilityState === 'visible', at: Date.now() };
  remember(id, mine);
  for (const channel of channels) channel.postMessage({ id, ...mine });
  return channels.length ? CLAIM_MS : 0;
}

/** Whether this tab's claim on message `id` won. */
export const wonVoice = (id: number) => claimWinner(claimsFor(id), CLAIM_MS) === tab;

import.meta.hot?.dispose(() => channels.forEach((channel) => channel.close()));
