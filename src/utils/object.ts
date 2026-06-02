export function patchProperty<T extends object>(
  target: T,
  source: T,
  key: keyof T,
) {
  if (source[key] !== undefined) {
    target[key] = source[key];
  }
}
