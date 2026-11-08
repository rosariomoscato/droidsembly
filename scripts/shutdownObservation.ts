// Diagnostic only. Return the original result/promise, never add an awaited
// boundary, change queue order, drive timers, or log terminal contents/paths.
function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return value !== null && typeof value === 'object' && 'then' in value && typeof value.then === 'function';
}

/** Sample each terminal's current queue prefix once per changed promise.
 * This is settlement telemetry, not a count of active/successful file writes.
 */
export function createPrefixSampler(observe: (promise: Promise<void>) => void) {
  const latest = new WeakMap<object, Promise<void>>();
  return (terminal: object, prefix: Promise<void>) => {
    if (latest.get(terminal) === prefix) return false;
    latest.set(terminal, prefix);
    observe(prefix);
    return true;
  };
}

export function createShutdownObservation(now = () => performance.now()) {
  const metrics = new Map<string, { started: number; fulfilled: number; rejected: number; active: number; peak: number; settledMs: number; maxSettledMs: number }>();
  const active = new Map<number, { label: string; at: number }>();
  let sequence = 0;
  function measure<T>(label: string, work: () => T): T {
    const metric = metrics.get(label) ?? { started: 0, fulfilled: 0, rejected: 0, active: 0, peak: 0, settledMs: 0, maxSettledMs: 0 };
    metrics.set(label, metric);
    const start = now(), id = ++sequence;
    metric.started++;
    metric.active++;
    metric.peak = Math.max(metric.peak, metric.active);
    active.set(id, { label, at: start });
    const finish = (rejected: boolean) => {
      const duration = now() - start;
      metric.active--;
      metric[rejected ? 'rejected' : 'fulfilled']++;
      metric.settledMs += duration;
      metric.maxSettledMs = Math.max(metric.maxSettledMs, duration);
      active.delete(id);
    };
    try {
      const result = work();
      if (isPromiseLike(result)) {
        void result.then(() => finish(false), () => finish(true));
      } else finish(false);
      return result;
    } catch (error) {
      finish(true);
      throw error;
    }
  }
  function snapshot() {
    const at = now();
    return {
      metrics: Object.fromEntries([...metrics].map(([label, value]) => [label, { ...value }])),
      pending: Object.fromEntries([...metrics.keys()].flatMap(label => {
        const entries = [...active.values()].filter(item => item.label === label);
        return entries.length ? [[label, { count: entries.length, oldestMs: Math.max(...entries.map(item => at - item.at)) }]] : [];
      })),
    };
  }
  return { measure, snapshot };
}
