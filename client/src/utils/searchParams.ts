/** Read a positive page number from the URL, defaulting to 1. */
export function readPage(params: URLSearchParams): number {
  const page = Number(params.get('page'));
  return Number.isInteger(page) && page > 0 ? page : 1;
}

/** Read an enum value from the URL, ignoring anything not in `allowed`. */
export function readEnum<T extends string>(
  params: URLSearchParams,
  key: string,
  allowed: readonly T[],
): T | undefined {
  const value = params.get(key);
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

/** Copy `params` with the given keys set (or removed when empty). */
export function withParams(
  params: URLSearchParams,
  updates: Record<string, string | number | undefined>,
): URLSearchParams {
  const next = new URLSearchParams(params);
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined || value === '' || (key === 'page' && value === 1)) {
      next.delete(key);
    } else {
      next.set(key, String(value));
    }
  }
  return next;
}
