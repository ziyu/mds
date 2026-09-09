import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { createMdsThemeApi } from "./theme-api.js";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const themesRoot = join(workspaceRoot, "themes");

export default defineConfig({
  // Markdown's entity decoder has a DOM-free worker export. Vite otherwise
  // selects its browser implementation, which accesses document at module load.
  resolve: { conditions: ["worker", "module", "browser", "development|production"] },
  plugins: [
    createMdsThemeApi({
      workspaceRoot,
      themesRoot
    }),
    react()
  ]
});
