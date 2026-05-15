import fs from "node:fs/promises";
import type { Plugin } from "vite";

const FONTS_DIR = "public/fonts";
const LOCK_FILE = `${FONTS_DIR}/material-symbols.lock`;

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

        const cachedUrl = await fs
          .readFile(LOCK_FILE, "utf-8")
          .catch(() => null);

        const fontExists = await fs
          .access(`${FONTS_DIR}/material-symbols-rounded.woff2`)
          .then(() => true)
          .catch(() => false);

        if (cachedUrl === googleFontsUrl && fontExists) {
          console.log(
            "[google-fonts-local] Font already cached, skipping download",
          );
          inlinedCss = buildInlineCss();
          continue;
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
          const filename = "material-symbols-rounded.woff2";
          const localPath = `${FONTS_DIR}/${filename}`;

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
        await fs.writeFile(LOCK_FILE, googleFontsUrl);
        console.log(`[google-fonts-local] Downloaded and cached font`);

        inlinedCss = buildInlineCss();
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

function buildInlineCss(): string {
  return `    @font-face {
      font-family: 'Material Symbols Rounded';
      font-style: normal;
      font-weight: 400;
      font-display: swap;
      src: url('/fonts/material-symbols-rounded.woff2') format('woff2');
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
