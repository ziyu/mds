import { readdir, readFile } from "node:fs/promises";
import { basename, join, relative, resolve, sep } from "node:path";
import type { HtmlTheme } from "@mds/html-types";
import {
  createThemeFromSources,
  createThemeResultFromSources,
  resolveThemeName,
  type ThemeManifest,
  type ThemeCreationResult,
  type ThemeSource
} from "./source-theme.js";
import { createThemeSummary, type ThemeRegistry, type ThemeSummary } from "./registry.js";
import { THEME_MANIFEST_FILE } from "./artifact.js";
import { ThemeValidationError, validateThemeManifest, type ThemeDiagnostic } from "./validation.js";
import {
  normalizeThemeResolutionOptions,
  resolveThemeRef,
  ThemeResolutionError,
  tryResolveThemeArtifactDirectory,
  type ThemeResolutionOptions
} from "./resolution.js";

export async function loadThemeDirectory(themeDirectory: string): Promise<HtmlTheme> {
  return createThemeFromSources(await readThemeDirectory(themeDirectory));
}

export async function readThemeDirectory(themeDirectory: string): Promise<ThemeSource> {
  const root = resolve(themeDirectory);
  try {
    const manifest = await readThemeManifest(root);
    const files = await readThemeFiles(root, manifest);

    return {
      manifest,
      files,
      rootName: resolveThemeName(manifest, basename(root))
    };
  } catch (error) {
    if (error instanceof ThemeValidationError) {
      throw error;
    }

    throw new ThemeValidationError([createThemeLoadDiagnostic(basename(root), error, root)], basename(root));
  }
}

export async function readThemeRef(ref: string, options: FileThemeRegistryOptions = {}): Promise<ThemeSource> {
  return readThemeSourceFromRef(ref, normalizeThemeResolutionOptions(options));
}

export interface FileThemeRegistryOptions extends ThemeResolutionOptions {}

export function createFileThemeRegistry(options: FileThemeRegistryOptions = {}): ThemeRegistry {
  const resolutionOptions = normalizeThemeResolutionOptions(options);

  return {
    async listThemes() {
      const themeLists = await Promise.all(resolutionOptions.roots.map((root) => listThemeRoot(root)));
      return themeLists.flat().sort((left, right) => left.name.localeCompare(right.name));
    },

    async loadTheme(ref) {
      return createThemeFromSources(await readThemeSourceFromRef(ref, resolutionOptions));
    },

    async loadThemeWithDiagnostics(ref) {
      let themeDirectory: string | undefined;
      try {
        themeDirectory = await resolveThemeRef(ref, resolutionOptions);
        return await loadThemeDirectoryWithDiagnostics(themeDirectory);
      } catch (error) {
        if (error instanceof ThemeValidationError) {
          throw error;
        }

        throw new ThemeValidationError([createThemeLoadDiagnostic(ref, error, themeDirectory)], ref);
      }
    }
  };
}

async function readThemeSourceFromRef(
  ref: string,
  resolutionOptions: ReturnType<typeof normalizeThemeResolutionOptions>
): Promise<ThemeSource> {
  let themeDirectory: string | undefined;
  try {
    themeDirectory = await resolveThemeRef(ref, resolutionOptions);
    return await readThemeDirectory(themeDirectory);
  } catch (error) {
    if (error instanceof ThemeValidationError) {
      throw error;
    }

    throw new ThemeValidationError([createThemeLoadDiagnostic(ref, error, themeDirectory)], ref);
  }
}

async function loadThemeDirectoryWithDiagnostics(themeDirectory: string): Promise<ThemeCreationResult> {
  return createThemeResultFromSources(await readThemeDirectory(themeDirectory));
}

async function readThemeManifest(root: string): Promise<ThemeManifest> {
  const manifestPath = join(root, THEME_MANIFEST_FILE);
  const raw = await readFile(manifestPath, "utf8");
  const manifest = JSON.parse(raw) as unknown;
  const errors = validateThemeManifest(manifest)
    .filter((diagnostic) => diagnostic.severity === "error")
    .map((diagnostic) => themeManifestDiagnosticToLoadDiagnostic(diagnostic, manifestPath));

  if (errors.length > 0) {
    throw new ThemeValidationError(errors, basename(root));
  }

  return manifest as ThemeManifest;
}

function themeManifestDiagnosticToLoadDiagnostic(diagnostic: ThemeDiagnostic, manifestPath: string): ThemeDiagnostic {
  return {
    ...diagnostic,
    ...(diagnostic.field === undefined ? { field: THEME_MANIFEST_FILE } : {}),
    ...(diagnostic.path === undefined ? { path: manifestPath } : {})
  };
}

function createThemeLoadDiagnostic(ref: string, error: unknown, themeDirectory: string | undefined): ThemeDiagnostic {
  if (error instanceof ThemeResolutionError) {
    return {
      severity: "error",
      code: error.code,
      message: error.message,
      ...(error.field === undefined ? {} : { field: error.field }),
      ...(error.path === undefined ? {} : { path: error.path })
    };
  }

  const manifestPath = themeDirectory === undefined ? undefined : join(themeDirectory, THEME_MANIFEST_FILE);
  if (isNodeError(error) && error.code === "ENOENT" && manifestPath !== undefined && error.path === manifestPath) {
    return {
      severity: "error",
      code: "missing-theme-manifest",
      message: `Theme "${ref}" is missing ${THEME_MANIFEST_FILE} at ${manifestPath}.`,
      field: THEME_MANIFEST_FILE,
      path: manifestPath
    };
  }

  if (error instanceof SyntaxError && manifestPath !== undefined) {
    return {
      severity: "error",
      code: "invalid-theme-manifest",
      message: `Theme "${ref}" has invalid ${THEME_MANIFEST_FILE} at ${manifestPath}: ${error.message}`,
      field: THEME_MANIFEST_FILE,
      path: manifestPath
    };
  }

  return {
    severity: "error",
    code: "theme-load-error",
    message: `Unable to load theme "${ref}": ${error instanceof Error ? error.message : String(error)}.`,
    ...(themeDirectory === undefined ? {} : { path: themeDirectory })
  };
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

async function readThemeFiles(root: string, _manifest: ThemeManifest): Promise<Record<string, string>> {
  const paths = (await listThemeFiles(root)).filter((path) => path !== THEME_MANIFEST_FILE);
  const entries = await Promise.all(paths.map(async (path) => [path, await readFile(join(root, path), "utf8")] as const));
  return Object.fromEntries(entries);
}

async function listThemeFiles(root: string): Promise<string[]> {
  const paths: string[] = [];

  async function walk(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    await Promise.all(
      entries.map(async (entry) => {
        const absolutePath = join(directory, entry.name);
        if (entry.isDirectory()) {
          await walk(absolutePath);
          return;
        }

        if (entry.isFile()) {
          paths.push(relative(root, absolutePath).split(sep).join("/"));
        }
      })
    );
  }

  await walk(root);
  return paths;
}

async function listThemeRoot(root: string): Promise<ThemeSummary[]> {
  try {
    const entries = await readdir(root, { withFileTypes: true });
    const themes = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .map(async (entry): Promise<ThemeSummary | undefined> => {
          const directory = join(root, entry.name);
          try {
            const artifactDirectory = await tryResolveThemeArtifactDirectory(directory);
            if (artifactDirectory === undefined) {
              return undefined;
            }

            const manifest = await readThemeManifest(artifactDirectory);
            return createThemeSummary(manifest, {
              fallbackName: entry.name,
              source: artifactDirectory,
            });
          } catch {
            return undefined;
          }
        })
    );

    return themes.filter((theme): theme is ThemeSummary => theme !== undefined);
  } catch {
    return [];
  }
}
