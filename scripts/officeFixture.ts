/** Test fixtures only: never remove files while the office is still draining.
 * If shutdown rejects, preserve the directory for diagnosis instead of masking
 * that error or racing its unfinished writers with recursive removal.
 */
export async function closeOfficeFixture(
  office: { shutdown(): Promise<void> },
  remove: () => void | Promise<void>,
  drain?: (shutdown: Promise<void>) => Promise<void>,
): Promise<void> {
  const shutdown = office.shutdown();
  // A frozen-clock fixture must keep servicing parser callbacks scheduled by
  // queued saves until shutdown settles, not just flush the current parsers.
  if (drain) await drain(shutdown);
  await shutdown;
  await remove();
}
