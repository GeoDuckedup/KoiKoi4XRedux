import { defineConfig } from "vite";

import { approvedRuntimeDeckPlugin } from "./approved-deck-plugin.ts";

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? "/",
  plugins: [approvedRuntimeDeckPlugin()],
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
