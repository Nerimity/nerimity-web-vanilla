import { defineConfig } from "oxlint";

export default defineConfig({
  jsPlugins: ["eslint-plugin-lingui"],
  categories: {
    correctness: "warn",
  },
  rules: {
    "typescript/no-non-null-asserted-optional-chain": "off",
    "lingui/t-call-in-function": "error",
    "lingui/no-single-tag-to-translate": "warn",
    "lingui/no-single-variables-to-translate": "warn",
    "lingui/no-trans-inside-trans": "warn",
    "lingui/no-expression-in-message": "warn",

    "eslint/no-unused-vars": [
      "error",
      {
        varsIgnorePattern: "^(_|Fragment)",
        argsIgnorePattern: "^_",
        fix: {
          imports: "safe-fix",
        },
      },
    ],
  },
});
