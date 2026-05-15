import wyw from "@wyw-in-js/vite";
import { defineConfig } from "vite";
import babel from "@rolldown/plugin-babel";
import { lingui, linguiTransformerBabelPreset } from "@lingui/vite-plugin";
import { googleFontsLocal } from "./vite-plugin-google-fonts-local";

export default defineConfig({
  plugins: [
    googleFontsLocal(),
    lingui(),
    babel({
      presets: [linguiTransformerBabelPreset()],
    }),
    wyw({
      classNameSlug: "[title]_[hash]",
      babelOptions: {
        presets: ["@babel/preset-typescript"],
        plugins: ["@babel/plugin-transform-modules-commonjs"],
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
  },
  preview: {
    port: 3000,
  },
});
