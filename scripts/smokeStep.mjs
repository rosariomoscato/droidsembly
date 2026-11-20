// Safe, durable phase boundaries; never record command arguments or environment.
export function smokeStep(label, run, mark, now = () => performance.now()) {
  if (!/^[a-z][a-z0-9-]*$/.test(label)) throw new Error('Invalid smoke phase label');
  const start = now();
  mark({ phase: label, event: 'start' });
  try {
    const result = run();
    mark({
      phase: label, event: 'end', ms: Math.max(0, Math.floor(now() - start)),
      status: result.status ?? null,
      errorCode: /^[A-Z][A-Z0-9_]+$/.test(result.error?.code ?? '') ? result.error.code : result.error ? 'OTHER' : null,
    });
    return result;
  } catch (error) {
    mark({ phase: label, event: 'throw', ms: Math.max(0, Math.floor(now() - start)) });
    throw error;
  }
}
