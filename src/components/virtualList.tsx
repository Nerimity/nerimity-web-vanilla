import morphdom from "morphdom";

import { h } from "../h";

type Item<T, V> = T & { type: V };

interface VirtualListProps<T, V extends string | number> {
  items: () => Item<T, V>[];
  type: Record<V, { height: number; sticky?: boolean }>;
  renderItem: (item: Item<T, V>) => JSX.Element;
  id: (item: Item<T, V>) => string;
  parentEl: HTMLDivElement;
}
export function createVirtualList<T, V extends string | number>(
  props: VirtualListProps<T, V>,
) {
  const abortController = new AbortController();
  const { signal } = abortController;
  let cacheItems: Item<T, V>[] = props.items();
  const elMap = new Map<string, HTMLElement>();
  let cachedScrollTop = 0;
  let cachedClientHeight = 0;

  const containerEl = (
    <div style={{ "flex-shrink": 0, position: "relative" }}></div>
  ) as unknown as HTMLDivElement;

  let rafId: number;

  const totalHeight = () => {
    let h = 0;
    for (const item of cacheItems) h += props.type[item.type].height;
    return h;
  };

  const onResize = () => {
    cachedClientHeight = props.parentEl.clientHeight;
    updateChunks();
  };

  const onScroll = () => {
    cachedScrollTop = props.parentEl.scrollTop; // read immediately on scroll
    cachedClientHeight = props.parentEl.clientHeight;
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(updateChunks);
  };

  const updateChunks = () => {
    const top = cachedScrollTop;
    const bottom = top + cachedClientHeight;

    const items: Item<T, V>[] = [];
    const pos: number[] = [];

    let height = 0;
    for (let i = 0; i < cacheItems.length; i++) {
      const item = cacheItems[i]!;
      const { height: itemHeight, sticky } = props.type[item.type];

      if (!sticky && height > bottom) break;

      if (sticky || (height + itemHeight > top && height < bottom)) {
        items.push(item);
        pos.push(height);
      }

      height += itemHeight;
    }

    const newIds = new Set(items.map((i) => props.id(i)));

    for (const [id, el] of elMap) {
      if (!newIds.has(id)) {
        el.remove();
        elMap.delete(id);
      }
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      let el = elMap.get(props.id(item));
      if (!el) {
        el = (
          <div
            style={{
              position: "absolute",
              width: "100%",
              height: props.type[item.type].height + "px",
            }}
          >
            {props.renderItem(item)}
          </div>
        ) as HTMLElement;
        containerEl.appendChild(el);
        elMap.set(props.id(item), el);
      }
      el.style.top = pos[i] + "px";
    }
  };

  const render = () => {
    const el = containerEl;
    requestAnimationFrame(() => {
      cachedScrollTop = props.parentEl.scrollTop;
      cachedClientHeight = props.parentEl.clientHeight;
      updateItems();
    });
    return el;
  };

  const updateItems = () => {
    cacheItems = props.items();
    containerEl.style.height = `${totalHeight()}px`;
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(updateChunks);
  };

  window.addEventListener("resize", onResize, { signal });
  props.parentEl.addEventListener("scroll", onScroll, { signal });

  const destroy = () => {
    abortController.abort();
    cacheItems = [];
    elMap.clear();

    cancelAnimationFrame(rafId);
  };

  const rerenderItem = (id: string) => {
    const el = elMap.get(id);
    if (!el) return;
    const item = cacheItems.find((i) => props.id(i) === id);
    if (!item) return;
    const existing = el.firstElementChild;
    if (!existing) return;
    morphdom(existing, props.renderItem(item) as unknown as HTMLElement);
  };

  const rerenderItems = () => {
    for (const [id, el] of elMap) {
      const item = cacheItems.find((i) => props.id(i) === id);
      if (!item) continue;
      const existing = el.firstElementChild;
      if (!existing) continue;
      morphdom(existing, props.renderItem(item) as unknown as HTMLElement);
    }
  };

  return {
    rerenderItem,
    updateItems,
    render,
    destroy,
    rerenderItems,
  };
}
