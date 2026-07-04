import { t } from "@lingui/core/macro";
import { matchSorter } from "match-sorter";

import { h } from "../h";
import { serverStore } from "../store/serverStore";
import { debounce } from "../utils/debounce";
import {
  addRecentEmoji,
  allCustomEmojis,
  allEmojis,
  categorizedCustomEmojis,
  customEmojiById,
  unicodeToTwemojiUrl,
  type CustomEmoji,
  type EmojiData,
} from "../utils/emojis";
import { buildImageUrl } from "../utils/image";
import { getLocalItem } from "../utils/localStorage";
import { throttle } from "../utils/throttle";
import { Avatar } from "./avatar";
import { Icon } from "./icon";
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
const CustomEmojiItem = ({ emoji }: { emoji: CustomEmoji }) => {
  const [url] = buildImageUrl(
    `emojis/${emoji.id}.${!emoji.webp && emoji.gif ? "gif" : "webp"}`,
    {
      animate: true,
    },
  );

  return (
    <div class={style.emojiItem} title={emoji.name} data-id={emoji.id}>
      <img src={url} style={{ width: `${size}px`, height: `${size}px` }} />
    </div>
  );
};

const GroupHeader = (props: { category: CategoryCol }) => {
  const server = props.category.serverId
    ? serverStore.servers.get(props.category.serverId!)
    : null;

  const emojiUrl =
    props.category.emoji && unicodeToTwemojiUrl(props.category.emoji.emoji);

  return (
    <div class={style.groupHeader}>
      {server && <Avatar server={server} size={16} />}
      {emojiUrl && <img src={emojiUrl} class={style.groupEmoji} />}
      {props.category.icon && (
        <Icon class={style.icon} name={props.category.icon} />
      )}
      <span>{props.category.name || server?.name}</span>
    </div>
  );
};

type EmojiCol = {
  type: "emoji";
  data: EmojiData | CustomEmoji;
};
type CategoryCol = {
  type: "category";
  name?: string;
  serverId?: string;
  icon?: string;
  emoji?: EmojiData;
};
const groupEmojisIntoRows = (emojis: EmojiData[], rowCount: number) => {
  let cols: Array<Array<EmojiCol | CategoryCol>> = [];
  let currentCategory = "";
  let currentRow: Array<EmojiCol | CategoryCol> | null = null;

  for (let i = 0; i < emojis.length; i++) {
    const emoji = emojis[i]!;

    if (emoji.category !== currentCategory) {
      currentCategory = emoji.category;
      cols.push([{ type: "category", name: emoji.category, emoji: emoji }]);
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

  let emojiContainer = (
    <div class={style.emojiContainer}></div>
  ) as HTMLDivElement;

  let emojis: EmojiData[] | null = null;
  let cachedCustomEmojis: CustomEmoji[] | null = null;
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
            <GroupHeader category={emoji} />
          ) : "id" in emoji.data ? (
            <CustomEmojiItem emoji={emoji.data} />
          ) : (
            <EmojiItem emoji={emoji.data} />
          ),
        )}
      </div>
    ),
  });
  emojiContainer.appendChild(vt.render());

  let el = (
    <div class={style.emojiPicker}>
      <Input class={"search"} placeholder={t`Search Emojis...`} />
      {emojiContainer}
    </div>
  ) as HTMLDivElement;

  const rerender = async () => {
    const searchVal = (
      el.querySelector(".search input") as HTMLInputElement
    ).value.trim();

    emojis = emojis || (await allEmojis());
    cachedCustomEmojis =
      cachedCustomEmojis || (await allCustomEmojis({ uniqueName: true }));

    if (!emojis) return;
    const rowCount = getRowFitCount(size + 8, emojiContainer);

    emojiContainer.style.setProperty("--row-count", String(rowCount));
    const groups = [
      ...(searchVal
        ? searchResults(searchVal, emojis, cachedCustomEmojis, rowCount)
        : []),
      ...(searchVal ? [] : recentEmojis(emojis, cachedCustomEmojis, rowCount)),
      ...(searchVal ? [] : customEmojis(cachedCustomEmojis, rowCount)),
      ...(searchVal ? [] : groupEmojisIntoRows(emojis, rowCount)),
    ];

    virtualItems = groups.map((g) => ({ group: g, type: 0 }));
    vt.updateItems();
    vt.rerenderItems();
  };

  window.addEventListener(
    "resize",
    throttle(rerender, 10, { leading: true, trailing: true }),
    { signal },
  );
  rerender();

  const getEmojiByElement = async (el: HTMLElement) => {
    const index = parseInt(el.dataset.index!);
    const id = el.dataset.id;

    if (id) {
      const emoji = await customEmojiById(id);
      return { custom: emoji };
    }
    const emoji = emojis![index]!;
    return { emoji: emoji };
  };

  emojiContainer.addEventListener(
    "click",
    async (e) => {
      const target = e.target as HTMLDivElement;
      const emojiEl = target.closest(`.${style.emojiItem}`) as HTMLDivElement;
      if (!emojiEl) return;
      const { emoji, custom } = await getEmojiByElement(emojiEl);

      if (custom) {
        addRecentEmoji({ id: custom.id, type: "custom" });
        return;
      }

      if (emoji) {
        addRecentEmoji({ id: emoji.emoji, type: "default" });
      }
    },
    { signal },
  );

  el.querySelector(".search")!.addEventListener(
    "input",
    debounce(rerender, 100),
    { signal },
  );

  signal.addEventListener(
    "abort",
    () => {
      vt.destroy();

      el.remove();
      (el as any) = null;

      emojiContainer.remove();
      (emojiContainer as any) = null;
    },
    { once: true },
  );

  return { abortController, el };
};

const recentEmojis = (
  emojis: EmojiData[],
  customEmojis: CustomEmoji[],
  rowCount: number,
) => {
  const recentEmojis = getLocalItem("recentEmojis", [])!;
  if (!recentEmojis.length) return [];
  let currentRow: Array<EmojiCol | CategoryCol> | null = null;
  const mappedEmojis: Array<Array<EmojiCol | CategoryCol>> = [];

  const customEmojiIdToEmoji = new Map(customEmojis.map((e) => [e.id, e]));

  mappedEmojis.push([
    { type: "category", name: t`Recent Emojis`, icon: "history" },
  ]);

  for (let i = 0; i < recentEmojis.length; i++) {
    const emoji =
      emojis.find((e) => e.emoji === recentEmojis[i]!.id)! ||
      customEmojiIdToEmoji.get(recentEmojis[i]!.id);
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
  customEmojis: CustomEmoji[],
  rowCount: number,
) => {
  const results = matchSorter([...customEmojis, ...emojis], value, {
    keys: ["short_names", "name"],
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

const customEmojis = (emojis: CustomEmoji[], rowCount: number) => {
  const customEmojis = categorizedCustomEmojis(emojis);

  let currentRow: Array<EmojiCol | CategoryCol> | null = null;
  const mappedEmojis: Array<Array<EmojiCol | CategoryCol>> = [];

  for (let i = 0; i < customEmojis.length; i++) {
    const data = customEmojis[i]!;
    mappedEmojis.push([{ type: "category", serverId: data?.serverId }]);
    currentRow = null;

    for (let j = 0; j < data.emojis.length; j++) {
      const emoji = data.emojis[j]!;
      if (!currentRow || currentRow.length >= rowCount) {
        currentRow = [];
        mappedEmojis.push(currentRow);
      }
      currentRow.push({ type: "emoji", data: emoji });
    }
  }

  return mappedEmojis;
};
