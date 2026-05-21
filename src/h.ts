type Props = {
  class?: string | string[];
  style?: string | Partial<CSSStyleDeclaration>;
  children?: Child | Child[];
  [key: string]:
    | string
    | string[]
    | Partial<CSSStyleDeclaration>
    | EventListener
    | boolean
    | Child
    | Child[]
    | null
    | undefined;
};
type Child = Node | string | number | null | undefined | false;

const SVG_NS = "http://www.w3.org/2000/svg";
const SVG_TAGS = new Set([
  "svg",
  "path",
  "g",
  "rect",
  "circle",
  "ellipse",
  "line",
  "polyline",
  "polygon",
  "text",
  "tspan",
  "defs",
  "use",
  "symbol",
  "clipPath",
  "mask",
  "pattern",
  "image",
  "foreignObject",
  "marker",
  "linearGradient",
  "radialGradient",
  "stop",
  "filter",
  "feBlend",
  "feColorMatrix",
  "feComposite",
  "feGaussianBlur",
  "feMerge",
  "feMergeNode",
]);

export function h(
  tag: keyof HTMLElementTagNameMap,
  props?: Props | null,
  ...children: Child[]
): HTMLElement;
export function h(
  tag:
    | keyof HTMLElementTagNameMap
    | ((props: any, ...children: Child[]) => Node),
  props?: Props | null,
  ...children: Child[]
): Node;
export function h(
  tag:
    | keyof HTMLElementTagNameMap
    | ((props: any, ...children: Child[]) => Node),
  props?: Props | null,
  ...children: Child[]
): Node {
  if (typeof tag === "function") {
    const componentProps = {
      ...props,
      children: children.length === 1 ? children[0] : children,
    };
    return tag(componentProps, ...children);
  }
  const el = SVG_TAGS.has(tag)
    ? document.createElementNS(SVG_NS, tag)
    : document.createElement(tag);

  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (key === "__source" || key === "__self") continue;

      if (value == null || value === false) continue;

      if (key === "class") {
        const classValue = [value].flat(Infinity).filter(Boolean).join(" ");
        if (classValue) {
          el.setAttribute("class", classValue);
        }
      } else if (key === "style" && typeof value === "object") {
        for (const [prop, val] of Object.entries(value)) {
          if (val == null) continue;
          if (prop.startsWith("--")) {
            el.style.setProperty(prop, val as string);
          } else {
            (el.style as any)[prop] = val;
          }
        }
      } else if (typeof value === "boolean") {
        if (key.startsWith("data-")) {
          el.setAttribute(key, String(value));
        } else if (value) {
          el.setAttribute(key, "");
        }
      } else if (typeof value !== "object") {
        el.setAttribute(key, value as string);
      }
    }
  }

  for (const child of children) {
    appendChild(el, child);
  }
  return el;
}

export function Fragment(_: unknown, ...children: Child[]): DocumentFragment {
  const frag = document.createDocumentFragment();
  for (const child of children) {
    appendChild(frag, child);
  }
  return frag;
}

function appendChild(
  parent: Element | DocumentFragment,
  child: Child | Child[],
) {
  if (child == null || child === false) return;
  if (Array.isArray(child)) {
    child.forEach((c) => appendChild(parent, c));
    return;
  }
  parent.append(
    typeof child === "string" || typeof child === "number"
      ? document.createTextNode(String(child))
      : child,
  );
}
