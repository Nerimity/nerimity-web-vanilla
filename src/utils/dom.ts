export function closestFromEvent<T extends Element = HTMLDivElement>(
  event: { target?: EventTarget | null },
  selector: string,
): T | null {
  const target = event.target;
  if (!(target instanceof Element)) return null;

  return target.closest(selector) as T | null;
}

export function querySelectorArray<T extends Element = HTMLDivElement>(
  target: Element,
  selector: string,
): T[] | null {
  return [...target.querySelectorAll<T>(selector)];
}
