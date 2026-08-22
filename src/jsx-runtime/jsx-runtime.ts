import { Fragment, h } from "../h";

export { Fragment };

type RuntimeProps = Record<string, unknown> | null;

type RuntimeTag = Parameters<typeof h>[0];

export function jsx(
  tag: RuntimeTag,
  props: RuntimeProps,
  _key?: unknown,
): Node {
  const { children, ...attributes } = props ?? {};
  const childList = Array.isArray(children) ? children : [children];

  return h(tag, attributes as never, ...(childList as never[]));
}

export const jsxs = jsx;
