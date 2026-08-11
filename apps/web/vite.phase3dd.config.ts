import { resolve } from "node:path";

import { defineConfig } from "vite";

import { approvedRuntimeDeckPlugin } from "./approved-deck-plugin.ts";

export default defineConfig({
  root: import.meta.dirname,
  base: process.env.VITE_BASE_PATH ?? "/",
  plugins: [approvedRuntimeDeckPlugin()],
  build: {
    outDir: "dist-phase3dd",
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: resolve(import.meta.dirname, "field-density-review.html"),
    },
  },
});
