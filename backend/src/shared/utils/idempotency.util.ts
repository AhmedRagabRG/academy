export async function resolveIdempotently<T>(
  key: string | undefined,
  find: (key: string) => Promise<T | null>,
  create: () => Promise<T>,
): Promise<T> {
  if (key) {
    const existing = await find(key);
    if (existing) return existing;
  }
  return create();
}
