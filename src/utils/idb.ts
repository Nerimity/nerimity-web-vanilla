import { openDB, type DBSchema } from "idb";
import type { EmojiData } from "./emojis";

interface Database extends DBSchema {
  emojis: {
    key: string;
    value: EmojiData;
    indexes: {
      short_names: string;
    };
  };
}

let _idb: Awaited<ReturnType<typeof openDB<Database>>> | undefined;

export async function getIdb() {
  if (_idb) return _idb;
  _idb = await openDB<Database>("nerimity", 1, {
    upgrade(db) {
      const store = db.createObjectStore("emojis", { keyPath: "emoji" });
      store.createIndex("short_names", "short_names", { multiEntry: true });
    },
  });
  return _idb;
}
