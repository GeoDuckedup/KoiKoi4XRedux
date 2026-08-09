import { defineConfig } from "vite";

import { createWorkshopVitePlugin } from "./workshop-vite-plugin.ts";

export default defineConfig(() => {
  const workshop = createWorkshopVitePlugin();
  return {
    base: "/",
    define: { __WORKSHOP_TOKEN__: JSON.stringify(workshop.token) },
    plugins: [workshop.plugin],
  };
});
