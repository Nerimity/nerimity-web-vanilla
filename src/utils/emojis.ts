import { emojiUrl } from "../config";
import { Server, serverStore } from "../store/serverStore";
import type { RawCustomEmoji, RawServer } from "../Types";
import { getIdb } from "./idb";
import { getLocalItem, setLocalItem, type RecentEmoji } from "./localStorage";

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

export type CustomEmoji = RawCustomEmoji & {
  serverId: string;
};
export const createCustomEmojiLoader = async (opts?: { clear?: boolean }) => {
  const db = await getIdb();
  if (!db) return null;

  const tx = db.transaction("custom_emojis", "readwrite");

  if (opts?.clear) {
    tx.store.clear();
  }

  const putFromServers = (servers: RawServer[]) => {
    for (let i = 0; i < servers.length; i++) {
      const server = servers[i]!;
      putFromServer(server);
    }
  };

  const putFromServer = (server: RawServer) => {
    const customEmojis = server.customEmojis || [];
    putMany(server.id, customEmojis);
  };

  const putMany = (serverId: string, emojis: RawCustomEmoji[]) => {
    for (let i = 0; i < emojis.length; i++) {
      const emoji = emojis[i]!;
      tx.store.put({ ...emoji, serverId });
    }
  };

  const put = (serverId: string, emoji: RawCustomEmoji) => {
    tx.store.put({ ...emoji, serverId });
  };
  const remove = (emojiId: string) => {
    tx.store.delete(emojiId);
  };

  const update = async (emojiId: string, name: string) => {
    const existing = await tx.store.get(emojiId);
    if (!existing) return;
    tx.store.put({ ...existing, name });
  };

  const done = async () => {
    await tx.done;
    loadCustomShortcodeToIds();
  };

  return {
    put,
    putFromServers,
    putFromServer,
    putMany,
    done,
    remove,
    update,
  };
};

export const loadCustomEmojisFromServers = async (servers: RawServer[]) => {
  const customEmojiLoader = await createCustomEmojiLoader({ clear: true });
  customEmojiLoader?.putFromServers(servers);
  customEmojiLoader?.done();
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
  const db = await getIdb();
  if (!db) return [];
  const customEmojis = await db.getAllFromIndex("custom_emojis", "name");

  const counts: { [key: string]: number } = {};

  if (!opts?.uniqueName) return customEmojis;
  for (let i = 0; i < customEmojis.length; i++) {
    const emoji = customEmojis[i]!;

    let count = counts[emoji.name] || 0;

    const name = emoji.name;
    const isDuplicate = shortcodeToUnicode[name];
    if (isDuplicate) {
      count++;
    }
    const uniqueName = count ? `${emoji.name}-${count}` : emoji.name;

    counts[emoji.name] = count + 1;
    emoji.name = uniqueName;
  }

  return customEmojis;
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
    .servers.filter((s) => s.type === "s") as Server[];

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
