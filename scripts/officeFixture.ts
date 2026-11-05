/** Test fixtures only: never remove files while the office is still draining.
 * If shutdown rejects, preserve the directory for diagnosis instead of masking
 * that error or racing its unfinished writers with recursive removal.
 */
export async function closeOfficeFixture(office: { shutdown(): Promise<void> }, remove: () => void | Promise<void>): Promise<void> {
  await office.shutdown();
  await remove();
}
