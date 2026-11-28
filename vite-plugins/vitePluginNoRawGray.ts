import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative } from "node:path";

import type { Plugin, ViteDevServer } from "vite";

const SCAN_DIR = "src";

const EXEMPT_FILES = new Set(["src/utils/theme.ts"]);

const SCAN_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".css"]);

const GRAY_TOKEN = /-{0,2}gray-\d+/;

interface GrayUsage {
  file: string;
  line: number;
  column: number;
  text: string;
}

interface NoRawGrayOptions {
  allowOnBuild?: boolean;
}

const walk = (dir: string, files: string[]): void => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path, files);
    else if (SCAN_EXTENSIONS.has(extname(entry.name))) files.push(path);
  }
};

export function findRawGrayUsages(root: string): GrayUsage[] {
  const files: string[] = [];
  walk(join(root, SCAN_DIR), files);

  const usages: GrayUsage[] = [];
  for (const file of files) {
    const filePath = relative(root, file).split("\\").join("/");
    if (EXEMPT_FILES.has(filePath)) continue;

    const lines = readFileSync(file, "utf8").split("\n");
    for (const [index, text] of lines.entries()) {
      const match = GRAY_TOKEN.exec(text);
      if (!match) continue;
      usages.push({
        file: filePath,
        line: index + 1,
        column: match.index + 1,
        text: text.trim(),
      });
    }
  }
  return usages;
}

function formatUsages(usages: GrayUsage[]): string {
  return usages
    .map(
      ({ file, line, column, text }) => `  ${file}:${line}:${column}  ${text}`,
    )
    .join("\n");
}

export function noRawGray(options: NoRawGrayOptions = {}): Plugin {
  let root = "";
  let command: "build" | "serve" = "serve";
  let timer: ReturnType<typeof setTimeout> | undefined;

  const message = (usages: GrayUsage[]) =>
    `${usages.length} direct --gray-* usage(s) found. Use a semantic token from src/utils/theme.ts instead:\n${formatUsages(usages)}`;

  const warnInDev = (server: ViteDevServer) => {
    const usages = findRawGrayUsages(root);
    if (usages.length === 0) return;
    server.config.logger.warn(`[theme] ${message(usages)}`);
  };

  return {
    name: "theme-no-raw-gray",

    configResolved(config) {
      root = config.root;
      command = config.command;
    },

    configureServer(server) {
      warnInDev(server);

      const onWatch = () => {
        clearTimeout(timer);
        timer = setTimeout(() => warnInDev(server), 150);
      };

      server.watcher.on("add", onWatch);
      server.watcher.on("unlink", onWatch);
      server.watcher.on("change", onWatch);

      server.httpServer?.once("close", () => clearTimeout(timer));
    },

    buildStart() {
      if (command !== "build") return;
      const usages = findRawGrayUsages(root);
      if (usages.length === 0) return;
      if (options.allowOnBuild) {
        this.warn(`[theme] ${message(usages)}`);
        return;
      }
      this.error(`[theme] ${message(usages)}`);
    },
  };
}
