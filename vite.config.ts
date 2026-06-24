import { defineConfig } from "vite";
import babel from "@rolldown/plugin-babel";
import { lingui, linguiTransformerBabelPreset } from "@lingui/vite-plugin";
import { googleFontsLocal } from "./vitePluginGoogleFontsLocal";
import { devRerenderHighlighter } from "./vitePluginRerenderhighlighter";
import { shikiLangsPlugin } from "./vitePluginShikiLangsCopy";

export default defineConfig({
  resolve: {
    alias: {
      "@trans": "/src/macro.ts",
      "@trans-runtime": "/src/Trans.ts",
    },
  },
  plugins: [
    shikiLangsPlugin(),
    devRerenderHighlighter(),
    googleFontsLocal({
      icons: [
        "open_in_new",
        "warning",
        "terminal",
        "music_note",
        "movie",
        "gamepad",
        "folder_open",
        "attach_file",
        "download",
        "schedule",
        "draft",
        "upload_file",
        "logout",
        "block",
        "call",
        "trending_up",
        "keep",
        "article_person",
        "book",
        "mail",
        "keyboard_arrow_down",
        "check",
        "reply",
        "wrap_text",
        "content_copy",
        "alternate_email",
        "cached",
        "close",
        "delete",
        "diversity_1",
        "edit",
        "home",
        "inbox",
        "info",
        "login",
        "more_horiz",
        "pending",
        "segment",
        "send",
        "side_navigation",
        "tag",
      ],
    }),
    lingui(),
    babel({
      presets: [linguiTransformerBabelPreset()],
    }),
  ],

  oxc: {
    jsx: {
      pragma: "h",
      pragmaFrag: "Fragment",
    },
  },
  build: {
    sourcemap: true,
  },
  server: {
    port: 3000,
    host: true,
    allowedHosts: ["local.nerimity.com"],

    watch: {
      ignored: ["**/vitePluginRerenderhighlighter.ts"],
    },
  },
  preview: {
    port: 3000,
  },
});
