import wyw from "@wyw-in-js/vite";
import { defineConfig } from "vite";
import babel from "@rolldown/plugin-babel";
import { lingui, linguiTransformerBabelPreset } from "@lingui/vite-plugin";
import { googleFontsLocal } from "./vitePluginGoogleFontsLocal";
import { devRerenderHighlighter } from "./vitePluginRerenderhighlighter";
import { cssScopedPlugin } from "./vitePluginScopedCss";
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
    cssScopedPlugin(),
    devRerenderHighlighter(),
    googleFontsLocal({
      icons: [
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
    wyw({
      classNameSlug: "[title]_[hash]",
      include: ["src/components/**/*", "src/pages/**/*"],
      babelOptions: {
        presets: ["@babel/preset-typescript"],
        plugins: ["@babel/plugin-transform-modules-commonjs", "macros"],
      },
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
