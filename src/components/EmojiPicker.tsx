import { t } from "@lingui/core/macro";
import { matchSorter } from "match-sorter";

import { h } from "../h";
import { addRecentEmoji, allEmojis, type EmojiData } from "../utils/emojis";
import { getLocalItem } from "../utils/localStorage";
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

const EmojiItem = (props: { emoji: EmojiData }) => {
  const index = props.emoji.order!;
  const posX = index % SPRITE_ROWS;
  const posY = Math.floor(index / SPRITE_ROWS);
  return (
    <div
      class={style.emojiItem}
      data-index={index}
      title={props.emoji.short_names[0]}
    >
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
            <EmojiItem emoji={emoji.data} />
          ),
        )}
      </div>
    ),
  });
  emojiContainer.appendChild(vt.render());

  const el = (
    <div class={style.emojiPicker}>
      <Input class={"search"} placeholder={t`Search Emojis...`} />
      {emojiContainer}
    </div>
  ) as HTMLDivElement;

  const rerender = async () => {
    const searchVal = (
      el.querySelector(".search input") as HTMLInputElement
    ).value.trim();

    const emojis = cachedEmojis || (await allEmojis());
    if (!emojis) return;
    cachedEmojis = emojis;
    const rowCount = getRowFitCount(size + 8, emojiContainer);

    if (searchVal) {
      searchResults(searchVal, cachedEmojis!, rowCount);
    }

    emojiContainer.style.setProperty("--row-count", String(rowCount));
    const groups = [
      ...(searchVal ? searchResults(searchVal, emojis, rowCount) : []),
      ...(searchVal ? [] : recentEmojis(emojis, rowCount)),
      ...(searchVal ? [] : groupEmojisIntoRows(emojis, rowCount)),
    ];

    virtualItems = groups.map((g) => ({ group: g, type: 0 }));
    vt.updateItems();
    vt.rerenderItems();
  };

  window.addEventListener(
    "resize",
    throttle(rerender, 10, { leading: true, trailing: true }),
  );
  rerender();

  emojiContainer.addEventListener("click", (e) => {
    const target = e.target as HTMLDivElement;
    const emojiEl = target.closest(`.${style.emojiItem}`) as HTMLDivElement;
    if (!emojiEl) return;
    const index = parseInt(emojiEl.dataset.index!);
    const emoji = cachedEmojis![index]!;
    addRecentEmoji({
      id: emoji.emoji,
      type: "default",
    });
  });

  el.querySelector(".search")!.addEventListener("input", rerender);

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

const recentEmojis = (emojis: EmojiData[], rowCount: number) => {
  const recentEmojis = getLocalItem("recentEmojis", [])!;
  if (!recentEmojis.length) return [];
  let currentRow: Array<EmojiCol | CategoryCol> | null = null;
  const mappedEmojis: Array<Array<EmojiCol | CategoryCol>> = [];

  mappedEmojis.push([{ type: "category", name: t`Recent Emojis` }]);

  for (let i = 0; i < recentEmojis.length; i++) {
    const emoji = emojis.find((e) => e.emoji === recentEmojis[i]!.id)!;
    if (!emoji) continue;
    if (!currentRow || currentRow.length >= rowCount) {
      currentRow = [];
      mappedEmojis.push(currentRow);
    }
    currentRow.push({ type: "emoji", data: emoji });
  }

  return mappedEmojis;
};

const searchResults = (
  value: string,
  emojis: EmojiData[],
  rowCount: number,
) => {
  const results = matchSorter(emojis, value, {
    keys: ["short_names"],
  });
  let currentRow: Array<EmojiCol | CategoryCol> | null = null;
  const mappedEmojis: Array<Array<EmojiCol | CategoryCol>> = [];

  for (let i = 0; i < results.length; i++) {
    const emoji = results[i]!;
    if (!currentRow || currentRow.length >= rowCount) {
      currentRow = [];
      mappedEmojis.push(currentRow);
    }
    currentRow.push({ type: "emoji", data: emoji });
  }

  return mappedEmojis;
};
