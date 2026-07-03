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
    indexes: {};
  };
}

let _idb: Awaited<ReturnType<typeof openDB<Database>>> | undefined;

export async function getIdb() {
  if (_idb) return _idb;
  _idb = await openDB<Database>("nerimity", 4, {
    upgrade(db) {
      if (db.objectStoreNames.contains("emojis")) {
        db.deleteObjectStore("emojis");
      }
      if (db.objectStoreNames.contains("custom_emojis")) {
        db.deleteObjectStore("custom_emojis");
      }

      const store = db.createObjectStore("emojis", { keyPath: "emoji" });
      store.createIndex("short_names", "short_names", { multiEntry: true });
      store.createIndex("order", "order");

      db.createObjectStore("custom_emojis", { keyPath: "id" });
    },
  });
  return _idb;
}
