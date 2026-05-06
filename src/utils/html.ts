interface ReconcileOpts<T extends { id: string }> {
  container: HTMLElement;
  dataAttr: string;
  values: T[];
  create: (item: T) => JSX.Element;
}

const toCamelCase = (str: string) =>
  str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

export function reconcile<T extends { id: string }>(opts: ReconcileOpts<T>) {
  const { container, dataAttr, values, create } = opts;
  const camelAttr = toCamelCase(dataAttr);

  for (const child of [...container.children]) {
    const id = (child as HTMLElement).dataset[camelAttr];
    if (!values.find((v) => v.id === id)) {
      child.remove();
    }
  }

  for (let i = 0; i < values.length; i++) {
    const item = values[i]!;
    const existing = container.querySelector(
      `[data-${dataAttr}="${item.id}"]`,
    ) as HTMLElement | null;

    const node = existing ?? create(item);

    if (container.children[i] !== node) {
      container.insertBefore(
        node as unknown as Node,
        container.children[i] ?? null,
      );
    }
  }
}
