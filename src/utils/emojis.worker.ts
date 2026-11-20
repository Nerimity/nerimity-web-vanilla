import type { RawCustomEmoji, RawServer } from "../Types";
import { getIdb } from "./idb";

export const _createCustomEmojiLoader = async (opts: {
  clear?: boolean;
  shortcodeToUnicode: Record<string, string>;
}) => {
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
    loadCustomShortcodeToIds(opts.shortcodeToUnicode);
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

const loadCustomShortcodeToIds = async (
  shortcodeToUnicode: Record<string, string>,
) => {
  const customEmojis = await _allCustomEmojis({
    uniqueName: true,
    shortcodeToUnicode,
  });

  let customShortcodeToIds: Record<string, string> = {};

  for (let i = 0; i < customEmojis.length; i++) {
    const emoji = customEmojis[i]!;
    const isGif = emoji.gif && !emoji.webp;
    const isAWebp = emoji.webp && emoji.gif;
    customShortcodeToIds[emoji.name] =
      `${isGif ? "ace" : isAWebp ? "wace" : "ce"}:${emoji.id}`;
  }
  self.postMessage({ customShortcodeToIds });
};

export async function _allCustomEmojis(opts?: {
  uniqueName?: boolean;
  shortcodeToUnicode: Record<string, string>;
}) {
  const db = await getIdb();
  if (!db) return [];
  const customEmojis = await db.getAllFromIndex("custom_emojis", "name");

  const counts: { [key: string]: number } = {};

  if (!opts?.uniqueName) return customEmojis;
  for (let i = 0; i < customEmojis.length; i++) {
    const emoji = customEmojis[i]!;

    let count = counts[emoji.name] || 0;

    const name = emoji.name;
    const isDuplicate = opts.shortcodeToUnicode[name];
    if (isDuplicate) {
      count++;
    }
    const uniqueName = count ? `${emoji.name}-${count}` : emoji.name;

    counts[emoji.name] = count + 1;
    emoji.name = uniqueName;
  }

  return customEmojis;
}

self.onmessage = async (e: MessageEvent<{ event: string; payload: any }>) => {
  if (e.data.event === "loadCustomEmojisFromServers") {
    const customEmojiLoader = await _createCustomEmojiLoader({
      clear: true,
      shortcodeToUnicode: e.data.payload.shortcodeToUnicode,
    });
    customEmojiLoader?.putFromServers(e.data.payload.servers);
    customEmojiLoader?.done();
  }
};
