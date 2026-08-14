import type { IncomingMessage, ServerResponse } from "node:http";
import { isAbsolute, join, normalize, relative, sep } from "node:path";
import {
  buildPackageTheme,
  inspectThemeArtifact,
  ThemeBuildError,
  themeBuildErrorToDiagnostics,
  type PackageThemeBuildResult
} from "@mds-crate/theme-builder";
import {
  createFileThemeRegistry,
  createUnknownThemeError,
  findThemePackageDirectoryForArtifact,
  readThemeDirectory,
  readThemeRef,
  ThemeValidationError,
  type ThemeRegistry
} from "@mds-crate/theme-loader";
import {
  serializeThemeBuildErrorBody,
  serializeThemeBuildErrorHmrPayload,
  serializeThemeBuildResult,
  serializeThemeBuildSuccessHmrPayload,
  serializeThemeInspectionResult
} from "./src/theme-build-contract.js";
import { serializeThemeValidationErrorBody } from "./src/theme-validation-contract.js";
import type { Plugin, ViteDevServer } from "vite";

export interface MdsThemeApiOptions {
  workspaceRoot: string;
  themesRoot: string;
}

interface WatchedTheme {
  packageDirectory: string;
  inputFiles: Set<string>;
}

interface ThemeApiContext {
  workspaceRoot: string;
  themesRoot: string;
  themeRegistry: ThemeRegistry;
}

export interface ThemeApiErrorResponse {
  statusCode: number;
  contentType: "application/json" | "text/plain";
  body: string;
}

export function createMdsThemeApi(options: MdsThemeApiOptions): Plugin {
  const context: ThemeApiContext = {
    workspaceRoot: options.workspaceRoot,
    themesRoot: options.themesRoot,
    themeRegistry: createFileThemeRegistry({
      roots: [options.themesRoot],
      baseDirectory: options.workspaceRoot
    })
  };
  const watchedThemes = new Map<string, WatchedTheme>();

  return {
    name: "mds-theme-api",
    configureServer(server) {
      server.watcher.on("change", (path) => {
        const refs = [...watchedThemes.entries()]
          .filter(([, theme]) => theme.inputFiles.has(path))
          .map(([ref]) => ref);

        for (const ref of refs) {
          void rebuildWatchedTheme(ref, watchedThemes, server);
        }
      });

      server.middlewares.use(async (request, response, next) => {
        try {
          const url = new URL(request.url ?? "/", "http://localhost");
          if (url.pathname === "/__mds/themes") {
            await sendJson(response, await context.themeRegistry.listThemes());
            return;
          }

          if (url.pathname.startsWith("/__mds/theme-build/")) {
            if (request.method !== "POST") {
              sendError(response, "Theme build endpoint only accepts POST requests.", 405);
              return;
            }

            const ref = decodeURIComponent(url.pathname.slice("/__mds/theme-build/".length));
            const packageDirectory = await resolveBuildableThemePackage(ref, context);
            const result = await buildPackageTheme(packageDirectory);
            watchThemeBuildResult(ref, result, watchedThemes, server);
            await sendJson(response, serializeThemeBuildResult(result));
            return;
          }

          if (url.pathname.startsWith("/__mds/theme-inspect/")) {
            if (request.method !== "GET") {
              sendError(response, "Theme inspect endpoint only accepts GET requests.", 405);
              return;
            }

            const ref = decodeURIComponent(url.pathname.slice("/__mds/theme-inspect/".length));
            const result = await inspectThemeArtifact(ref, {
              roots: [context.themesRoot],
              baseDirectory: context.workspaceRoot
            });
            await sendJson(response, serializeThemeInspectionResult(result));
            return;
          }

          if (url.pathname.startsWith("/__mds/themes/")) {
            const ref = decodeURIComponent(url.pathname.slice("/__mds/themes/".length));
            const theme = (await context.themeRegistry.listThemes()).find((availableTheme) => availableTheme.name === ref);
            if (theme !== undefined) {
              await sendJson(response, await readThemeSourceForListedTheme(ref, theme, context));
              return;
            }

            if (!canTryUnlistedThemeRef(ref)) {
              sendError(response, createUnknownThemeError(ref), 404);
              return;
            }

            await sendJson(
              response,
              await readThemeRef(ref, {
                roots: [context.themesRoot],
                baseDirectory: context.workspaceRoot
              })
            );
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

async function readThemeSourceForListedTheme(
  ref: string,
  theme: { source?: string },
  context: ThemeApiContext
) {
  if (theme.source !== undefined) {
    try {
      return await readThemeDirectory(theme.source);
    } catch {
      return readThemeRef(ref, {
        roots: [context.themesRoot],
        baseDirectory: context.workspaceRoot
      });
    }
  }

  return readThemeRef(ref, {
    roots: [context.themesRoot],
    baseDirectory: context.workspaceRoot
  });
}

async function rebuildWatchedTheme(
  ref: string,
  watchedThemes: Map<string, WatchedTheme>,
  server: ViteDevServer
): Promise<void> {
  const watchedTheme = watchedThemes.get(ref);
  if (watchedTheme === undefined) {
    return;
  }

  try {
    const result = await buildPackageTheme(watchedTheme.packageDirectory);
    watchThemeBuildResult(ref, result, watchedThemes, server);
    server.ws.send({
      type: "custom",
      event: "mds-theme-build",
      data: serializeThemeBuildSuccessHmrPayload(ref, result)
    });
  } catch (error) {
    const diagnostics = themeBuildErrorToDiagnostics(error);
    server.ws.send({
      type: "custom",
      event: "mds-theme-build",
      data: serializeThemeBuildErrorHmrPayload(ref, diagnostics)
    });
  }
}

function watchThemeBuildResult(
  ref: string,
  result: PackageThemeBuildResult,
  watchedThemes: Map<string, WatchedTheme>,
  server: ViteDevServer
): void {
  const inputFiles = filterWatchInputFiles(result);
  watchedThemes.set(ref, {
    packageDirectory: result.packageDirectory,
    inputFiles: new Set(inputFiles)
  });
  server.watcher.add(inputFiles);
}

export function filterWatchInputFiles(result: Pick<PackageThemeBuildResult, "filesWritten" | "inputFiles" | "outputDirectory">): string[] {
  const outputFiles = new Set(result.filesWritten.map((file) => join(result.outputDirectory, file)));
  return result.inputFiles.filter((path) => !outputFiles.has(path) && !isPathInside(path, result.outputDirectory));
}

export { serializeThemeBuildResult as serializeBuildResult } from "./src/theme-build-contract.js";

async function resolveBuildableThemePackage(ref: string, context: ThemeApiContext): Promise<string> {
  const theme = (await context.themeRegistry.listThemes()).find((availableTheme) => availableTheme.name === ref);
  if (theme === undefined) {
    throw createUnknownThemeError(ref);
  }

  const source = theme.source ?? resolveThemeDirectory(ref, context.themesRoot);
  return (await findThemePackageDirectoryForArtifact(source, { stopAt: context.workspaceRoot })) ?? source;
}

function resolveThemeDirectory(ref: string, themesRoot: string): string {
  const themeDirectory = normalize(join(themesRoot, ref));
  if (themeDirectory !== themesRoot && themeDirectory.startsWith(`${themesRoot}${sep}`)) {
    return themeDirectory;
  }

  throw new Error(`Invalid theme ref: ${ref}`);
}

function canTryUnlistedThemeRef(ref: string): boolean {
  return ref.startsWith("@");
}

function isPathInside(path: string, directory: string): boolean {
  const relativePath = relative(directory, path);
  return relativePath.length === 0 || (!relativePath.startsWith("..") && !isAbsolute(relativePath));
}

async function sendJson(response: ServerResponse<IncomingMessage>, value: unknown): Promise<void> {
  response.statusCode = 200;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(value));
}

function sendError(response: ServerResponse<IncomingMessage>, error: unknown, statusCode = 500): void {
  const errorResponse = themeApiErrorResponse(error, statusCode);
  response.statusCode = errorResponse.statusCode;
  response.setHeader("Content-Type", errorResponse.contentType);
  response.end(errorResponse.body);
}

export function themeApiErrorResponse(error: unknown, fallbackStatusCode = 500): ThemeApiErrorResponse {
  if (error instanceof ThemeValidationError) {
    return {
      statusCode: themeApiErrorStatusCode(error, fallbackStatusCode),
      contentType: "application/json",
      body: JSON.stringify(serializeThemeValidationErrorBody(error.diagnostics, error.message))
    };
  }

  const builderDiagnostics = themeBuildErrorToDiagnostics(error);
  if (error instanceof ThemeBuildError || builderDiagnostics.some((diagnostic) => diagnostic.stage !== undefined)) {
    return {
      statusCode: fallbackStatusCode,
      contentType: "application/json",
      body: JSON.stringify(serializeThemeBuildErrorBody(builderDiagnostics))
    };
  }

  return {
    statusCode: fallbackStatusCode,
    contentType: "text/plain",
    body: error instanceof Error ? error.message : String(error)
  };
}

export function themeApiErrorStatusCode(error: unknown, fallbackStatusCode = 500): number {
  if (
    error instanceof ThemeValidationError &&
    error.diagnostics.length > 0 &&
    error.diagnostics.every((diagnostic) => diagnostic.code === "unknown-theme")
  ) {
    return 404;
  }

  return fallbackStatusCode;
}
