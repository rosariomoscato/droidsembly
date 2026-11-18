import { fixtureWork } from './fixtureWork.ts';

/** Test-only ownership: settle foreground work and all background children before releasing an office. */
export function fixtureOffice(shutdown: () => Promise<void>) {
  const work = fixtureWork();
  const failures: unknown[] = [];
  let closing: Promise<void> | undefined;
  function track<T>(task: Promise<T>, background = false): Promise<T> {
    // Drain settlement, not rejection: an expected foreground refusal must keep
    // rejecting to its caller, without preventing shutdown or hiding other work.
    work.track(task.then(() => undefined, (error) => { if (background) failures.push(error); }));
    return task;
  }
  return {
    track,
    background: <T>(task: Promise<T>) => track(task, true),
    drain: () => work.drain(),
    close(): Promise<void> {
      return closing ??= (async () => {
        await work.drain();
        try { await shutdown(); }
        catch (error) { failures.push(error); }
        await work.drain();
        if (failures.length) throw new AggregateError([...failures], 'Office fixture release failed', { cause: failures[0] });
      })();
    },
  };
}
