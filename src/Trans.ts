import { i18n } from "@lingui/core";

const tagRe = /<([a-zA-Z0-9]+)>([\s\S]*?)<\/\1>|<([a-zA-Z0-9]+)\/>/;

const voidElementTags = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "keygen",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
  "menuitem",
]);

function formatElements(
  value: string,
  elements: Record<string, Node | Node[]> = {},
): (string | Node)[] {
  const parts = value.split(tagRe);
  if (parts.length === 1) return [value];

  const tree: (string | Node)[] = [];
  const before = parts.shift();
  if (before) tree.push(before);

  for (const [index, children, after] of getElements(parts)) {
    let template = typeof index !== "undefined" ? elements[index] : undefined;

    if (
      !template ||
      (!Array.isArray(template) &&
        voidElementTags.has((template as Element).tagName?.toLowerCase()) &&
        children)
    ) {
      if (!template) {
        console.error(`Trans: missing component at index '${index}'`);
      } else {
        console.error(
          `Trans: ${(template as Element).tagName} is a void element and cannot have children`,
        );
      }
      tree.push(document.createDocumentFragment());
      if (after) tree.push(after);
      continue;
    }

    const hasChildren = children.length > 0;

    let clone: Element | DocumentFragment;
    if (Array.isArray(template)) {
      clone = document.createDocumentFragment();
      for (const node of template) clone.append(node.cloneNode(true));
    } else {
      clone = template.cloneNode(!hasChildren) as Element;
    }

    const childNodes = hasChildren ? formatElements(children, elements) : [];
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
  values?: Record<string, string | number | Node>;
  components?: Record<string, Node | Node[]>;
  children?: unknown;
}

function getInterpolationValuesAndComponents(props: TransProps): {
  values: Record<string, string | number> | undefined;
  components: Record<string, Node | Node[]>;
} {
  if (!props.values) {
    return { values: undefined, components: props.components ?? {} };
  }

  const values: Record<string, string | number> = {};
  const components: Record<string, Node | Node[]> = { ...props.components };

  for (const [key, value] of Object.entries(props.values)) {
    if (typeof value === "string" || typeof value === "number") {
      values[key] = value;
    } else {
      const index = Object.keys(components).length;
      components[index] = value;
      values[key] = `<${index}/>`;
    }
  }

  return { values, components };
}

export function Trans(props: TransProps): Node {
  const { values, components } = getInterpolationValuesAndComponents(props);
  const translated = i18n._(props.id ?? "", values as any, {
    message: props.message,
  });
  const nodes = formatElements(translated, components);
  const frag = document.createDocumentFragment();
  for (const node of nodes) {
    frag.append(
      typeof node === "string" ? document.createTextNode(node) : node,
    );
  }
  return frag;
}
