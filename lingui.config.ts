import { defineConfig } from "@lingui/conf";

export default defineConfig({
  sourceLocale: "en",
  locales: ["en"],
  compileNamespace: "ts",
  catalogs: [
    {
      path: "src/locales/{locale}/messages",
      include: ["src"],
    },
  ],
});
