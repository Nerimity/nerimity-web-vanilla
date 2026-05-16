import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import type { Plugin } from "vite";

const FONTS_DIR = "public/fonts";
const LOCK_FILE = `${FONTS_DIR}/material-symbols.lock`;

function urlHash(url: string): string {
  return createHash("sha1").update(url).digest("hex").slice(0, 8);
}

function fontFilename(hash: string): string {
  return `material-symbols-rounded.${hash}.woff2`;
}

export function googleFontsLocal(): Plugin {
  let inlinedCss = "";

  return {
    name: "google-fonts-local",

    async buildStart() {
      const html = await fs.readFile("index.html", "utf-8");

      const linkRegex =
        /<link[^>]+href="(https:\/\/fonts\.googleapis\.com\/css2\?[^"]*Material[^"]*)"[^>]*\/?>/gi;

      const matches = [...html.matchAll(linkRegex)];
      if (!matches.length) {
        console.log(
          "[google-fonts-local] No Material Symbols links found in index.html",
        );
        return;
      }

      await fs.mkdir(FONTS_DIR, { recursive: true });

      for (const match of matches) {
        const googleFontsUrl = match[1];
        if (!googleFontsUrl) continue;

        const hash = urlHash(googleFontsUrl);
        const filename = fontFilename(hash);
        const localPath = `${FONTS_DIR}/${filename}`;

        const lockContent = await fs
          .readFile(LOCK_FILE, "utf-8")
          .catch(() => null);
        const [lockedHash, ...rest] = lockContent?.split(":") ?? [];
        const lockedUrl = rest.join(":");

        const fontExists = await fs
          .access(localPath)
          .then(() => true)
          .catch(() => false);

        if (lockedUrl === googleFontsUrl && fontExists) {
          console.log(
            "[google-fonts-local] Font already cached, skipping download",
          );
          inlinedCss = buildInlineCss(filename);
          continue;
        }

        // Clean up old versioned file if hash changed
        if (lockedHash && lockedHash !== hash) {
          const oldFile = `${FONTS_DIR}/${fontFilename(lockedHash)}`;
          await fs.rm(oldFile, { force: true });
          console.log(
            `[google-fonts-local] Removed stale font ${fontFilename(lockedHash)}`,
          );
        }

        console.log(`[google-fonts-local] Processing: ${googleFontsUrl}`);

        const cssRes = await fetch(googleFontsUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
        });
        const css = await cssRes.text();

        const urlRegex = /url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g;
        const downloads: Promise<void>[] = [];

        css.replace(urlRegex, (_, fontUrl: string) => {
          downloads.push(
            fetch(fontUrl)
              .then((r) => r.arrayBuffer())
              .then((buf) => fs.writeFile(localPath, Buffer.from(buf)))
              .then(() =>
                console.log(`[google-fonts-local] Downloaded ${filename}`),
              ),
          );
          return "";
        });

        await Promise.all(downloads);
        await fs.writeFile(LOCK_FILE, `${hash}:${googleFontsUrl}`);
        console.log(`[google-fonts-local] Downloaded and cached font`);

        inlinedCss = buildInlineCss(filename);
      }
    },

    transformIndexHtml(html) {
      const linkRegex =
        /<link[^>]+href="https:\/\/fonts\.googleapis\.com\/css2\?[^"]*Material[^"]*"[^>]*\/?>\n?/gi;

      const cleaned = html.replace(linkRegex, "");

      return cleaned.replace(
        "</head>",
        `  <style>\n${inlinedCss}  </style>\n  </head>`,
      );
    },
  };
}

function buildInlineCss(filename: string): string {
  return `    @font-face {
      font-family: 'Material Symbols Rounded';
      font-style: normal;
      font-weight: 400;
      font-display: swap;
      src: url('/fonts/${filename}') format('woff2');
    }
    .material-symbols-rounded {
      font-family: 'Material Symbols Rounded';
      font-weight: normal;
      font-style: normal;
      font-size: 24px;
      line-height: 1;
      letter-spacing: normal;
      text-transform: none;
      display: inline-block;
      white-space: nowrap;
      word-wrap: normal;
      direction: ltr;
      -webkit-font-feature-settings: 'liga';
      -webkit-font-smoothing: antialiased;
    }\n`;
}
