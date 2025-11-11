// vite.config.js
import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "index.ts"),
      name: "betterknown",
      fileName: "betterknown",
    },
    rollupOptions: {
      external: [],
      output: {},
    },
  },
});
