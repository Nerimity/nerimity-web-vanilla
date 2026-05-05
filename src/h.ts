type Props = {
  class?: string | string[];
  style?: string | Partial<CSSStyleDeclaration>;
  [key: string]:
    | string
    | string[]
    | Partial<CSSStyleDeclaration>
    | EventListener
    | boolean
    | null
    | undefined;
};
type Child = Node | string | number | null | undefined | false;

export function h(
  tag: keyof HTMLElementTagNameMap,
  props?: Props | null,
  ...children: Child[]
): HTMLElement;
export function h(
  tag: (props: any, ...children: Child[]) => DocumentFragment,
  props?: Props | null,
  ...children: Child[]
): DocumentFragment;
export function h(
  tag:
    | keyof HTMLElementTagNameMap
    | ((props: any, ...children: Child[]) => Node),
  props?: Props | null,
  ...children: Child[]
): Node {
  if (typeof tag === "function") {
    return tag(props, ...children);
  }

  const el = document.createElement(tag);

  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (key === "__source" || key === "__self") continue;

      if (value == null || value === false) continue;

      if (key === "class") {
        el.className = Array.isArray(value)
          ? value.join(" ")
          : (value as string);
      } else if (key === "style" && typeof value === "object") {
        Object.assign(el.style, value);
      } else if (typeof value === "boolean") {
        if (value) el.setAttribute(key, "");
      } else if (typeof value !== "object") {
        el.setAttribute(key, value as string);
      }
    }
  }

  for (const child of children) {
    if (child == null || child === false) continue;
    el.append(
      typeof child === "string" || typeof child === "number"
        ? document.createTextNode(String(child))
        : child,
    );
  }

  return el;
}

export function Fragment(_: unknown, ...children: Child[]): DocumentFragment {
  const frag = document.createDocumentFragment();
  for (const child of children) {
    if (child == null || child === false) continue;
    frag.append(
      typeof child === "string" || typeof child === "number"
        ? document.createTextNode(String(child))
        : child,
    );
  }
  return frag;
}
