import type { IncomingMessage, ServerResponse } from "node:http";
import { dirname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { createFileThemeRegistry, readThemeDirectory } from "@mds/theme-loader";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const themesRoot = join(workspaceRoot, "themes");
const themeRegistry = createFileThemeRegistry({
  roots: [themesRoot],
  baseDirectory: workspaceRoot
});

export default defineConfig({
  plugins: [mdsThemeApi(), react()]
});

function mdsThemeApi(): Plugin {
  return {
    name: "mds-theme-api",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        try {
          const url = new URL(request.url ?? "/", "http://localhost");
          if (url.pathname === "/__mds/themes") {
            await sendJson(response, await themeRegistry.listThemes());
            return;
          }

          if (url.pathname.startsWith("/__mds/themes/")) {
            const ref = decodeURIComponent(url.pathname.slice("/__mds/themes/".length));
            const theme = (await themeRegistry.listThemes()).find((availableTheme) => availableTheme.name === ref);
            if (theme === undefined) {
              sendError(response, `Unknown theme: ${ref}`, 404);
              return;
            }

            await sendJson(response, await readThemeDirectory(theme.source ?? resolveThemeDirectory(ref)));
            return;
          }
        } catch (error) {
          sendError(response, error);
          return;
        }

        next();
      });
    }
  };
}

function resolveThemeDirectory(ref: string): string {
  const themeDirectory = normalize(join(themesRoot, ref));
  if (themeDirectory !== themesRoot && themeDirectory.startsWith(`${themesRoot}${sep}`)) {
    return themeDirectory;
  }

  throw new Error(`Invalid theme ref: ${ref}`);
}

async function sendJson(response: ServerResponse<IncomingMessage>, value: unknown): Promise<void> {
  response.statusCode = 200;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(value));
}

function sendError(response: ServerResponse<IncomingMessage>, error: unknown, statusCode = 500): void {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "text/plain");
  response.end(error instanceof Error ? error.message : String(error));
}
