import { emojiUrl } from "../config";

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
