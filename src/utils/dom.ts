export function getClosestElementFromEvent<T extends Element = HTMLElement>(
  event: MouseEvent,
  selector: string,
): T | null {
  const target = event.target;
  if (!(target instanceof Element)) return null;

  return target.closest(selector) as T | null;
}
