import { openDB, type DBSchema } from "idb";

import type { CustomEmoji, EmojiData } from "./emojis";

interface Database extends DBSchema {
  emojis: {
    key: string;
    value: EmojiData;
    indexes: {
      short_names: string;
      order: number;
    };
  };
  custom_emojis: {
    key: string;
    value: CustomEmoji;
    indexes: {
      name: string;
    };
  };
}

let _idb: Awaited<ReturnType<typeof openDB<Database>>> | undefined;

export async function getIdb() {
  if (_idb) return _idb;
  _idb = await openDB<Database>("nerimity", 5, {
    upgrade(db) {
      if (db.objectStoreNames.contains("emojis")) {
        db.deleteObjectStore("emojis");
      }
      if (db.objectStoreNames.contains("custom_emojis")) {
        db.deleteObjectStore("custom_emojis");
      }

      const emojiStore = db.createObjectStore("emojis", { keyPath: "emoji" });
      emojiStore.createIndex("short_names", "short_names", {
        multiEntry: true,
      });
      emojiStore.createIndex("order", "order");

      const customEmojiStore = db.createObjectStore("custom_emojis", {
        keyPath: "id",
      });
      customEmojiStore.createIndex("name", "name");
    },
  });
  return _idb;
}
