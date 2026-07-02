import { t } from "@lingui/core/macro";

import { h } from "../h";
import { allEmojis, type EmojiData } from "../utils/emojis";
import { Input } from "./input";

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
    <div
      style={{
        width: `${size}px`,
        height: `${size}px`,
        background: "url(/emoji_sprites_17.webp)",
        backgroundPosition: `-${posX * size}px -${posY * size}px`,
        backgroundSize: `${size * 40}px`,
      }}
    ></div>
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

  allEmojis().then((emojis) => {
    if (!emojis) return;
    const rowCount = getRowFitCount(size, emojiContainer);

    const groups = groupEmojisIntoRows(emojis, rowCount);
    groups[1]?.forEach((emoji) =>
      emojiContainer.append(
        <EmojiItem index={emoji.type === "emoji" ? emoji.data.order! : 0} />,
      ),
    );
  });

  const el = (
    <div class={style.emojiPicker}>
      <Input placeholder={t`Search Emojis...`} />
      {emojiContainer}
    </div>
  ) as HTMLDivElement;

  signal.addEventListener(
    "abort",
    () => {
      el.remove();
    },
    { once: true },
  );

  return {
    abortController,
    el,
  };
};
