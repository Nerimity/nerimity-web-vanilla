interface ReconcileOpts<T> {
  container: HTMLElement;
  dataAttr: string;
  values: T[];
  valueId: keyof T;
  create: (item: T) => JSX.Element;
  chunkSize?: number;
  onDone?: () => void;
}

const toCamelCase = (str: string) =>
  str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

const activeJobs = new WeakMap<HTMLElement, { cancelled: boolean }>();

export function reconcile<T extends { id: string }>(opts: ReconcileOpts<T>) {
  const { container, dataAttr, values, create, chunkSize, onDone } = opts;
  const camelAttr = toCamelCase(dataAttr);

  const prev = activeJobs.get(container);
  if (prev) prev.cancelled = true;

  const job = { cancelled: false };
  activeJobs.set(container, job);

  const valueIds = new Set(values.map((v) => String(v[opts.valueId])));

  const existingMap = new Map<string, HTMLElement>();
  for (const child of container.children) {
    const el = child as HTMLElement;
    const id = el.dataset[camelAttr];
    if (id !== undefined) existingMap.set(id, el);
  }

  for (const [id, el] of existingMap) {
    if (!valueIds.has(id)) {
      el.remove();
      existingMap.delete(id);
    }
  }

  const getChildren = () => Array.from(container.children) as HTMLElement[];

  const insertChunk = (start: number, children: HTMLElement[]) => {
    if (job.cancelled) return;

    for (let i = start; i < values.length; i++) {
      if (job.cancelled) return;

      const item = values[i]!;
      const id = String(item[opts.valueId]);
      const existing = existingMap.get(id);
      const node = (existing ?? create(item)) as unknown as HTMLElement;

      if (children[i] !== node) {
        container.insertBefore(node, children[i] ?? null);
        children.splice(i, 0, node);
        if (existing === undefined) existingMap.set(id, node);
      }

      if (chunkSize && i - start + 1 >= chunkSize && i < values.length - 1) {
        requestAnimationFrame(() => insertChunk(i + 1, getChildren()));
        return;
      }
    }

    activeJobs.delete(container);
    onDone?.();
  };

  insertChunk(0, getChildren());
}
