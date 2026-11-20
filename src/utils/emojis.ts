import { emojiUrl } from "../config";
import { serverStore } from "../store/serverStore";
import type { RawCustomEmoji, RawServer } from "../Types";
import { _allCustomEmojis, _createCustomEmojiLoader } from "./emojis.worker";
import EmojisWorker from "./emojis.worker?worker";
import { getIdb } from "./idb";
import { getLocalItem, setLocalItem, type RecentEmoji } from "./localStorage";

const worker = new EmojisWorker();
worker.onmessage = ({ data }) => {
  if (data.customShortcodeToIds) {
    customShortcodeToIds = data.customShortcodeToIds;
  }
};

const U200D = String.fromCharCode(0x200d);
const UFE0Fg = /\uFE0F/g;

export const unicodeToTwemojiUrl = (unicode: string) => {
  const codePoint = toCodePoint(
    unicode.indexOf(U200D) < 0 ? unicode.replace(UFE0Fg, "") : unicode,
  );

  if (emojiUrl) {
    return `${emojiUrl}${codePoint}.svg`;
  }

  return `https://twemoji.maxcdn.com/v/latest/svg/${codePoint}.svg`;
};

function toCodePoint(
  unicodeSurrogates: string,
  separator: string = "-",
): string {
  const codePoints: string[] = [];
  let lead = 0;
  let index = 0;

  while (index < unicodeSurrogates.length) {
    const current = unicodeSurrogates.charCodeAt(index++);

    if (lead) {
      const combined = 0x10000 + ((lead - 0xd800) << 10) + (current - 0xdc00);
      codePoints.push(combined.toString(16));
      lead = 0;
    } else if (current >= 0xd800 && current <= 0xdbff) {
      lead = current;
    } else {
      codePoints.push(current.toString(16));
    }
  }

  return codePoints.join(separator);
}

export interface EmojiData {
  category: string;
  emoji: string;
  short_names: string[];
  order?: number;
}

export const shortcodeToUnicode: Record<string, string> = {};
export const unicodeToShortcode: Record<string, string> = {};

export async function lazyLoadEmojis() {
  const idb = await getIdb();
  if (!idb) return;
  const count = await idb.count("emojis");
  if (count > 0) return buildEmojiMaps();
  const emojis = (await fetch("/emojis.json")
    .then((res) => res.json())
    .catch(() => [])) as EmojiData[];

  const tx = idb.transaction("emojis", "readwrite");
  for (let i = 0; i < emojis.length; i++) {
    const emoji = emojis[i]!;
    tx.store.put({ ...emoji, order: i });
  }
  await tx.done;
  buildEmojiMaps();
}

export async function allEmojis() {
  const db = await getIdb();
  if (!db) return null;
  return db.getAllFromIndex("emojis", "order");
}

async function buildEmojiMaps() {
  const db = await getIdb();
  if (!db) return null;

  const all = await db.getAll("emojis");

  for (let index = 0; index < all.length; index++) {
    const emoji = all[index]!;

    unicodeToShortcode[emoji.emoji] = emoji.short_names[0]!;
    for (let i = 0; i < emoji.short_names.length; i++) {
      const name = emoji.short_names[i]!;
      shortcodeToUnicode[name] = emoji.emoji;
    }
  }
}

export const removeEmojisByServerId = async (serverId: string) => {
  const db = await getIdb();
  if (!db) return;

  const tx = db.transaction("custom_emojis", "readwrite");
  const keys = await tx.store.index("serverId").getAllKeys(serverId);

  for (let i = 0; i < keys.length; i++) {
    await tx.store.delete(keys[i]!);
  }

  await tx.done;
  loadCustomShortcodeToIds();
};

export type CustomEmoji = RawCustomEmoji & {
  serverId: string;
};
export const createCustomEmojiLoader = async (opts?: { clear?: boolean }) => {
  return _createCustomEmojiLoader({ ...opts, shortcodeToUnicode });
};

export const loadCustomEmojisFromServers = async (servers: RawServer[]) => {
  worker.postMessage({
    event: "loadCustomEmojisFromServers",
    payload: {
      servers,
      shortcodeToUnicode: true,
    },
  });
};

export const addRecentEmoji = (recentEmoji: RecentEmoji) => {
  let recentEmojis = getLocalItem("recentEmojis", [])!;

  recentEmojis = recentEmojis.filter((emoji) => emoji.id !== recentEmoji.id);

  recentEmojis.unshift(recentEmoji);
  if (recentEmojis.length > 20) {
    recentEmojis = recentEmojis.slice(0, 20);
  }

  setLocalItem("recentEmojis", recentEmojis);
};

export let customShortcodeToIds: Record<string, string> = {};

export const loadCustomShortcodeToIds = async () => {
  const customEmojis = await allCustomEmojis({ uniqueName: true });

  customShortcodeToIds = {};

  for (let i = 0; i < customEmojis.length; i++) {
    const emoji = customEmojis[i]!;
    const isGif = emoji.gif && !emoji.webp;
    const isAWebp = emoji.webp && emoji.gif;
    customShortcodeToIds[emoji.name] =
      `${isGif ? "ace" : isAWebp ? "wace" : "ce"}:${emoji.id}`;
  }
};

export async function allCustomEmojis(opts?: { uniqueName?: boolean }) {
  return _allCustomEmojis({ ...opts, shortcodeToUnicode });
}

export async function customEmojiById(id: string) {
  const db = await getIdb();
  if (!db) return undefined;
  return db.get("custom_emojis", id);
}

export function categorizedCustomEmojis(customEmojis: CustomEmoji[] = []) {
  const categorized: Record<string, CustomEmoji[]> = {};

  for (let i = 0; i < customEmojis.length; i++) {
    const emoji = customEmojis[i]!;
    const arr = categorized[emoji.serverId] || [];

    arr.push(emoji);
    categorized[emoji.serverId] = arr;
  }

  const selectedServerId = serverStore.currentServerId;

  const servers = serverStore
    .orderedServers()
    .servers.filter((s) => s.type === "s");

  if (selectedServerId) {
    const index = servers.findIndex((s) => s.id === selectedServerId);
    if (index !== -1) {
      servers.unshift(servers.splice(index, 1)[0]!);
    }
  }

  return servers
    .map((s) => ({
      serverId: s.id,
      emojis: categorized[s.id] || [],
    }))
    .filter((s) => s.emojis.length);
}
