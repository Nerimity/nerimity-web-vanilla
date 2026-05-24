import { i18n } from "@lingui/core";

const tagRe = /<([a-zA-Z0-9]+)>([\s\S]*?)<\/\1>|<([a-zA-Z0-9]+)\/>/;

function formatElements(
  value: string,
  elements: Record<string, Node> = {},
): (string | Node)[] {
  const parts = value.split(tagRe);
  if (parts.length === 1) return [value];

  const tree: (string | Node)[] = [];
  const before = parts.shift();
  if (before) tree.push(before);

  for (const [index, children, after] of getElements(parts)) {
    const template = elements[index];
    if (!template) {
      console.error(`Trans: missing component at index '${index}'`);
      continue;
    }
    const clone = template.cloneNode(false) as Element;
    const childNodes = children ? formatElements(children, elements) : [];
    for (const child of childNodes) {
      clone.append(
        typeof child === "string" ? document.createTextNode(child) : child,
      );
    }
    tree.push(clone);
    if (after) tree.push(after);
  }

  return tree;
}

function getElements(parts: string[]): [string, string, string | undefined][] {
  if (!parts.length) return [];
  const [paired, children, unpaired, after] = parts.slice(0, 4);
  const index = paired ?? unpaired ?? "";
  return [[index, children ?? "", after], ...getElements(parts.slice(4))];
}

interface TransProps {
  id?: string;
  message?: string;
  values?: Record<string, string | number>;
  components?: Record<string, Node>;
  children?: unknown;
}

export function Trans({
  id,
  message,
  values,
  components = {},
}: TransProps): Node {
  const translated = i18n._(id ?? "", values as any, { message });
  const nodes = formatElements(translated, components);
  const frag = document.createDocumentFragment();
  for (const node of nodes) {
    frag.append(
      typeof node === "string" ? document.createTextNode(node) : node,
    );
  }
  return frag;
}
