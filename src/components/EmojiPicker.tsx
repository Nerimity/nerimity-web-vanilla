import { t } from "@lingui/core/macro";
import { matchSorter } from "match-sorter";
import morphdom from "morphdom";

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
import { userAgent } from "../utils/userAgent";
import { Avatar } from "./avatar";
import { Icon } from "./icon";
import { Input } from "./input";
import { createVirtualList } from "./virtualList";

import style from "./EmojiPicker.module.css";

const size = 30;
const SPRITE_ROWS = 40;

const getRowFitCount = (itemWidth: number, el: HTMLDivElement) => {
  const width = el.clientWidth;
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
      style={{ "--size": `${size}px` }}
    >
      <div
        class={style.emojiImage}
        style={{
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
    <div
      class={style.emojiItem}
      style={{ "--size": `${size}px` }}
      title={emoji.name}
      data-id={emoji.id}
    >
      <img src={url} />
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

const SidebarItem = (props: { category: CategoryCol }) => {
  const server = props.category.serverId
    ? serverStore.servers.get(props.category.serverId!)
    : null;

  const emojiUrl =
    props.category.emoji && unicodeToTwemojiUrl(props.category.emoji.emoji);

  return (
    <div class={style.sidebarItem}>
      {server && <Avatar server={server} size={28} />}
      {emojiUrl && <img src={emojiUrl} class={style.groupEmoji} />}
      {props.category.icon && (
        <Icon class={style.icon} name={props.category.icon} />
      )}
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

interface EmojiPickerOpts {
  abortController: AbortController;
  onPick: (emoji?: EmojiData, custom?: CustomEmoji) => void;
}
export const createEmojiPicker = (opts: EmojiPickerOpts) => {
  const abortController = new AbortController();
  const { signal } = abortController;

  let overlayEl = (<div class={style.overlay}></div>) as HTMLDivElement;
  let emojiContainer = (
    <div class={style.emojiContainer}>{overlayEl}</div>
  ) as HTMLDivElement;

  let searchEl = (
    <Input class={"search"} placeholder={t`Search Emojis...`} />
  ) as HTMLDivElement;
  let inputEl = searchEl.querySelector("input")! as HTMLInputElement;

  let emojis: EmojiData[] | null = null;
  let cachedCustomEmojis: CustomEmoji[] | null = null;
  let cachedCategories: { group: CategoryCol; index: number }[] | null = null;
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
  emojiContainer.prepend(vt.render());

  const sidebar = (<div class={style.sidebar}></div>) as HTMLDivElement;
  let el = (
    <div class={style.emojiPicker}>
      {sidebar}
      <div class={style.innerEmojiPicker}>
        {searchEl}
        {emojiContainer}
      </div>
    </div>
  ) as HTMLDivElement;

  const rerender = async () => {
    const searchVal = inputEl.value.trim();

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

    if (!searchVal) {
      renderSidebar(groups);
    }

    virtualItems = groups.map((g) => ({ group: g, type: 0 }));
    vt.updateItems();
    vt.rerenderItems();
    handleScroll();
  };

  const renderSidebar = (groups: (CategoryCol | EmojiCol)[][]) => {
    cachedCategories = [];

    for (let i = 0; i < groups.length; i++) {
      const group = groups[i]!;
      if (group[0]?.type === "category") {
        cachedCategories.push({ group: group[0]!, index: i });
      }
    }

    morphdom(
      sidebar,
      <div>
        {cachedCategories.map((category) => (
          <SidebarItem category={category.group} />
        ))}
      </div>,
      { childrenOnly: true },
    );
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
      if (emoji) {
        emoji.name = el.title;
      }
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
      }

      if (emoji) {
        addRecentEmoji({ id: emoji.emoji, type: "default" });
      }

      if (emoji || custom) {
        if (!userAgent.mobile && !e.shiftKey) {
          opts.abortController.abort();
        }
        opts.onPick(emoji, custom);
      }
    },
    { signal },
  );
  sidebar.addEventListener(
    "click",
    async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const target = e.target as HTMLDivElement;
      const sidebarItemEl = target.closest(
        `.${style.sidebarItem}`,
      ) as HTMLDivElement;
      if (!sidebarItemEl) return;
      if (inputEl.value.trim()) {
        inputEl.value = "";
        await rerender();
      }
      const index = [...sidebar.children].findIndex((c) => c === sidebarItemEl);
      const category = cachedCategories![index]!;

      emojiContainer.scrollTop = category.index * (size + 8);
      handleScroll();
    },
    { signal },
  );

  const handleScroll = () => {
    const scrollTop = emojiContainer.scrollTop;
    if (!cachedCategories?.length) return;

    let activeIdx = 0;
    for (let i = 0; i < cachedCategories.length; i++) {
      if (cachedCategories[i]!.index * (size + 8) <= scrollTop) {
        activeIdx = i;
      } else {
        break;
      }
    }
    const searchVal = inputEl.value.trim();

    if (searchVal) {
      activeIdx = -1;
    }

    [...sidebar.children].forEach((c, i) => {
      const isActive = i === activeIdx;
      c.classList.toggle(style.active!, isActive);
      if (isActive) {
        c.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    });
  };

  emojiContainer.addEventListener(
    "scroll",
    throttle(handleScroll, 100, { trailing: true, leading: true }),
    {
      signal,
      passive: true,
    },
  );

  const renderOverlay = (opts: { emoji?: EmojiData; custom?: CustomEmoji }) => {
    const emojiEl = opts.emoji ? (
      <EmojiItem emoji={opts.emoji} />
    ) : (
      <CustomEmojiItem emoji={opts.custom!} />
    );

    const name = opts.emoji
      ? opts.emoji.short_names.join(", ")
      : opts.custom!.name;

    const sub = opts.custom
      ? serverStore.servers.get(opts.custom!.serverId!)?.name
      : null;

    overlayEl.style.display = "flex";

    morphdom(
      overlayEl,
      (
        <div>
          <div class={style.overlayContent}>
            {emojiEl}
            <div class={style.info}>
              <div class={style.name}>{name}</div>
              {sub && <div class={style.sub}>{sub}</div>}
            </div>
          </div>
        </div>
      ) as HTMLElement,
      { childrenOnly: true },
    );
  };

  emojiContainer.addEventListener(
    "mouseover",
    async (e) => {
      if (userAgent.mobile) return;
      const target = e.target as HTMLDivElement;
      const emojiEl = target.closest(`.${style.emojiItem}`) as HTMLDivElement;
      if (!emojiEl) return;
      const { emoji, custom } = await getEmojiByElement(emojiEl);

      renderOverlay({ emoji, custom });
    },
    { signal },
  );

  inputEl.addEventListener(
    "input",
    debounce(() => {
      overlayEl.style.display = "none";
      rerender();
      emojiContainer.scrollTop = 0;
    }, 100),
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
