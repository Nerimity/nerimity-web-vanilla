import { t } from "@lingui/core/macro";

import { h } from "../h";
import { allEmojis, type EmojiData } from "../utils/emojis";
import { throttle } from "../utils/throttle";
import { Input } from "./input";
import { createVirtualList } from "./virtualList";

import style from "./EmojiPicker.module.css";

const size = 30;
const SPRITE_ROWS = 40;

const getRowFitCount = (itemWidth: number, el: HTMLDivElement) => {
  const { width } = el.getBoundingClientRect();
  const canFit = Math.floor(width / itemWidth);
  return canFit;
};

const EmojiItem = (props: { index: number }) => {
  const posX = props.index % SPRITE_ROWS;
  const posY = Math.floor(props.index / SPRITE_ROWS);
  return (
    <div class={style.emojiItem}>
      <div
        class={style.emojiImage}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          backgroundPosition: `-${posX * size}px -${posY * size}px`,
          backgroundSize: `${size * 40}px`,
        }}
      ></div>
    </div>
  );
};

const GroupHeader = (props: { name: string }) => {
  return (
    <div class={style.groupHeader}>
      <span>{props.name}</span>
    </div>
  );
};

type EmojiCol = {
  type: "emoji";
  data: EmojiData;
};
type CategoryCol = {
  type: "category";
  name: string;
};
const groupEmojisIntoRows = (emojis: EmojiData[], rowCount: number) => {
  let cols: Array<Array<EmojiCol | CategoryCol>> = [];
  let currentCategory = "";
  let currentRow: Array<EmojiCol | CategoryCol> | null = null;

  for (let i = 0; i < emojis.length; i++) {
    const emoji = emojis[i]!;

    if (emoji.category !== currentCategory) {
      currentCategory = emoji.category;
      cols.push([{ type: "category", name: emoji.category }]);
      currentRow = null;
    }

    if (!currentRow || currentRow.length >= rowCount) {
      currentRow = [];
      cols.push(currentRow);
    }

    currentRow.push({ type: "emoji", data: emoji });
  }

  return cols;
};

export const createEmojiPicker = () => {
  const abortController = new AbortController();
  const { signal } = abortController;

  const emojiContainer = (
    <div class={style.emojiContainer}></div>
  ) as HTMLDivElement;

  let cachedEmojis: EmojiData[] | null = null;
  let virtualItems: Array<{ group: (EmojiCol | CategoryCol)[]; type: 0 }> = [];

  const vt = createVirtualList({
    items: () => virtualItems,
    type: { 0: { height: size + 8 } },
    id: (g) => virtualItems.indexOf(g).toString(),
    parentEl: emojiContainer,
    renderItem: (item) => (
      <div class={style.emojiGroup} data-type={item.group[0]?.type}>
        {item.group.map((emoji) =>
          emoji.type === "category" ? (
            <GroupHeader name={emoji.name} />
          ) : (
            <EmojiItem index={emoji.data.order!} />
          ),
        )}
      </div>
    ),
  });
  emojiContainer.appendChild(vt.render());

  const rerender = async () => {
    const emojis = cachedEmojis || (await allEmojis());
    if (!emojis) return;
    cachedEmojis = emojis;
    const rowCount = getRowFitCount(size + 8, emojiContainer);
    emojiContainer.style.setProperty("--row-count", String(rowCount));
    const groups = groupEmojisIntoRows(emojis, rowCount);
    virtualItems = groups.map((g) => ({ group: g, type: 0 }));
    vt.updateItems();
    vt.rerenderItems();
  };

  window.addEventListener(
    "resize",
    throttle(rerender, 10, { leading: true, trailing: true }),
  );
  rerender();

  const el = (
    <div class={style.emojiPicker}>
      <Input placeholder={t`Search Emojis...`} />
      {emojiContainer}
    </div>
  ) as HTMLDivElement;

  signal.addEventListener(
    "abort",
    () => {
      vt.destroy();
      el.remove();
    },
    { once: true },
  );

  return { abortController, el };
};
