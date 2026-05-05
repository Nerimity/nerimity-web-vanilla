import { defineConfig } from "vite";

export default defineConfig({
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
