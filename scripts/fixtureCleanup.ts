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
