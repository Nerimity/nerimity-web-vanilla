import { emojiUrl } from "../config";
import { getIdb } from "./idb";

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
    tx.store.put(emoji);
  }
  await tx.done;
  buildEmojiMaps();
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
