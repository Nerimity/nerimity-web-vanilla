export function applyIfPresent<T, S, K extends keyof T & keyof S>(
  target: T,
  source: S,
  key: K,
) {
  if (key in (source as object)) {
    target[key] = source[key] as unknown as T[K];
  }
}
