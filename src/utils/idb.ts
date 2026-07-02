import { openDB, type DBSchema } from "idb";

import type { EmojiData } from "./emojis";

interface Database extends DBSchema {
  emojis: {
    key: string;
    value: EmojiData;
    indexes: {
      short_names: string;
      order: number;
    };
  };
}

let _idb: Awaited<ReturnType<typeof openDB<Database>>> | undefined;

export async function getIdb() {
  if (_idb) return _idb;
  _idb = await openDB<Database>("nerimity", 3, {
    upgrade(db) {
      if (db.objectStoreNames.contains("emojis")) {
        db.deleteObjectStore("emojis");
      }

      const store = db.createObjectStore("emojis", { keyPath: "emoji" });
      store.createIndex("short_names", "short_names", { multiEntry: true });
      store.createIndex("order", "order");
    },
  });
  return _idb;
}
