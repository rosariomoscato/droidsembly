/** Test-only ownership of fire-and-forget work. Return original promises unchanged. */
export function fixtureWork() {
  const tasks: Promise<unknown>[] = [];
  return {
    track<T>(task: Promise<T>): Promise<T> {
      tasks.push(task);
      return task;
    },
    async drain(): Promise<void> {
      // Work may enqueue children while settling; one snapshot is not a barrier.
      let consumed = 0;
      while (consumed < tasks.length) {
        const batch = tasks.slice(consumed);
        consumed = tasks.length;
        await Promise.all(batch);
      }
    },
  };
}
