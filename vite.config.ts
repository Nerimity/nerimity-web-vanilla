import { defineConfig } from "vite";
import wyw from "@wyw-in-js/vite";

export default defineConfig({
  plugins: [
    wyw({
      classNameSlug: "[title]_[hash]",
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
