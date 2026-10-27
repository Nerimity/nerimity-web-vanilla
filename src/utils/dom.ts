export function closestFromEvent<T extends Element = HTMLDivElement>(
  event: MouseEvent | TouchEvent | FocusEvent,
  selector: string,
): T | null {
  const target = event.target;
  if (!(target instanceof Element)) return null;

  return target.closest(selector) as T | null;
}
