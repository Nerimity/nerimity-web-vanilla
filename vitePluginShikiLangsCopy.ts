import { copyFileSync, mkdirSync, readdirSync } from "fs";
import { join } from "path";
import type { Plugin } from "vite";

export function shikiLangsPlugin(): Plugin {
  return {
    name: "shiki-langs-copy",
    buildStart() {
      const src = "node_modules/@shikijs/langs/dist";
      const dest = "public/shiki-langs";
      mkdirSync(dest, { recursive: true });
      for (const file of readdirSync(src)) {
        if (file.endsWith(".mjs")) {
          copyFileSync(join(src, file), join(dest, file));
        }
      }
    },
  };
}
