import { h } from "../h";
import { reconcile } from "../utils/html";

type Item<T, V> = T & { type: V; id: string };

interface VirtualListProps<T, V extends string> {
  items: () => Item<T, V>[];
  type: Record<V, { height: number; sticky?: boolean }>;
  renderItem: (item: Item<T, V>) => JSX.Element;
  parentEl: HTMLDivElement;
}
export function createVirtualList<T, V extends string>(
  props: VirtualListProps<T, V>,
) {
  let cacheItems: Item<T, V>[] = props.items();
  const elMap = new Map<string, HTMLElement>();

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
    updateChunks();
  };

  const onScroll = () => {
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(updateChunks);
  };

  const updateChunks = () => {
    const parentEl = props.parentEl;
    const top = parentEl.scrollTop;
    const containerHeight = parentEl.clientHeight;
    const bottom = top + containerHeight;

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

    const newIds = new Set(items.map((i) => i.id));

    for (const [id, el] of elMap) {
      if (!newIds.has(id)) {
        el.remove();
        elMap.delete(id);
      }
    }

    for (let i = 0; i < items.length; i++) {
      const item = items[i]!;
      let el = elMap.get(item.id);
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
        elMap.set(item.id, el);
      }
      el.style.top = pos[i] + "px";
    }
  };

  const render = () => {
    updateItems();
    return containerEl;
  };

  const updateItems = () => {
    cacheItems = props.items();
    containerEl.style.height = `${totalHeight()}px`;
    updateChunks();
  };

  window.addEventListener("resize", onResize);

  props.parentEl.addEventListener("scroll", onScroll);
  const destroy = () => {
    cacheItems = [];
    elMap.clear();

    cancelAnimationFrame(rafId);
    props.parentEl.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onResize);
  };

  return {
    updateItems,
    render,
    destroy,
  };
}
