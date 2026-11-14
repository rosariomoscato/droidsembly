/** Test-only synchronous fixture boundary. */
export function withFixtureCleanupSync<T>(body: () => T, cleanup: () => void): T {
  let failed = false;
  let primary: unknown;
  try { return body(); }
  catch (error) {
    failed = true;
    primary = error;
    throw error;
  } finally {
    try { cleanup(); }
    catch (secondary) {
      if (failed) throw new AggregateError([primary, secondary], 'Fixture body and cleanup both failed', { cause: primary });
      throw secondary;
    }
  }
}

/** Async counterpart: body and cleanup must settle before the fixture ends. */
export async function withFixtureCleanup<T>(body: () => Promise<T>, cleanup: () => void | Promise<void>): Promise<T> {
  let failed = false;
  let primary: unknown;
  try { return await body(); }
  catch (error) { failed = true; primary = error; throw error; }
  finally {
    try { await cleanup(); }
    catch (secondary) {
      if (failed) throw new AggregateError([primary, secondary], 'Fixture body and cleanup both failed', { cause: primary });
      throw secondary;
    }
  }
}
