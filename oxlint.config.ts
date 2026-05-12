import { defineConfig } from "oxlint";

export default defineConfig({
  categories: {
    correctness: "warn",
  },
  rules: {
    "typescript/no-non-null-asserted-optional-chain": "off",

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
