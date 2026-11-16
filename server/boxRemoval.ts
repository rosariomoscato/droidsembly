import type { BoxApi } from './box.ts';

/** An accepted DELETE is not proof of absence. No retry and no inferred success on transport errors. */
export async function removeBoxVerified(api: BoxApi, id: string): Promise<boolean> {
  await api.remove(id);
  const absent = await api.get(id) === null;
  const remaining = await api.list();
  return absent && !remaining.some((box) => box.id === id);
}
