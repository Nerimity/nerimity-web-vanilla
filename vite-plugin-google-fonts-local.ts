import fs from "node:fs/promises";
import type { Plugin } from "vite";

const FONTS_DIR = "public/fonts";
const FONT_CSS_PATH = `${FONTS_DIR}/material-symbols.css`;
const LOCK_FILE = `${FONTS_DIR}/material-symbols.lock`;
const LOCAL_CSS_PATH = "/fonts/material-symbols.css";

export function googleFontsLocal(): Plugin {
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

        const cachedUrl = await fs
          .readFile(LOCK_FILE, "utf-8")
          .catch(() => null);
        if (cachedUrl === googleFontsUrl) {
          console.log(
            "[google-fonts-local] Font already cached, skipping download",
          );
          continue;
        }

        console.log(`[google-fonts-local] Processing: ${googleFontsUrl}`);

        const cssRes = await fetch(googleFontsUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
        });
        let css = await cssRes.text();

        const urlRegex = /url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g;
        const downloads: Promise<void>[] = [];

        css = css.replace(urlRegex, (_, fontUrl: string) => {
          const filename = "material-symbols-rounded.woff2";
          const localPath = `${FONTS_DIR}/${filename}`;
          const publicPath = `/fonts/${filename}`;

          downloads.push(
            fetch(fontUrl)
              .then((r) => r.arrayBuffer())
              .then((buf) => fs.writeFile(localPath, Buffer.from(buf)))
              .then(() =>
                console.log(`[google-fonts-local] Downloaded ${filename}`),
              ),
          );

          return `url(${publicPath})`;
        });

        await Promise.all(downloads);
        await fs.writeFile(FONT_CSS_PATH, css);
        await fs.writeFile(LOCK_FILE, googleFontsUrl);
        console.log(`[google-fonts-local] Wrote ${FONT_CSS_PATH}`);
      }
    },

    transformIndexHtml(html) {
      const linkRegex =
        /<link[^>]+href="https:\/\/fonts\.googleapis\.com\/css2\?[^"]*Material[^"]*"[^>]*\/?>\n?/gi;

      const cleaned = html.replace(linkRegex, "");

      return cleaned.replace(
        "</head>",
        `  <link rel="stylesheet" href="${LOCAL_CSS_PATH}" />\n  </head>`,
      );
    },
  };
}
