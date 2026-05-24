import { defineConfig } from "@lingui/conf";

export default defineConfig({
  sourceLocale: "en",
  locales: ["en"],
  compileNamespace: "ts",
  macro: {
    jsxPackage: ["@lingui/react/macro", "@trans"],
  },
  runtimeConfigModule: {
    i18n: ["@lingui/core", "i18n"],
    Trans: ["@trans-runtime", "Trans"],
  },
  catalogs: [
    {
      path: "src/locales/{locale}/messages",
      include: ["src"],
    },
  ],
});
