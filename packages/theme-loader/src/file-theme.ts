import { readdir, readFile } from "node:fs/promises";
import { basename, isAbsolute, join, relative, resolve, sep } from "node:path";
import type { HtmlTheme } from "@mds/html-types";
import {
  createThemeFromSources,
  getThemeFilePaths,
  type ThemeManifest,
  type ThemeSource
} from "./source-theme.js";
import type { ThemeRegistry, ThemeSummary } from "./registry.js";

export async function loadThemeDirectory(themeDirectory: string): Promise<HtmlTheme> {
  return createThemeFromSources(await readThemeDirectory(themeDirectory));
}

export async function readThemeDirectory(themeDirectory: string): Promise<ThemeSource> {
  const root = resolve(themeDirectory);
  const manifest = await readThemeManifest(root);
  const files = await readThemeFiles(root, manifest);

  return {
    manifest,
    files,
    rootName: manifest.name ?? basename(root)
  };
}

export interface FileThemeRegistryOptions {
  roots?: string[];
  baseDirectory?: string;
}

export function createFileThemeRegistry(options: FileThemeRegistryOptions = {}): ThemeRegistry {
  const roots = options.roots?.map((root) => resolve(root)) ?? [resolve("themes")];
  const baseDirectory = resolve(options.baseDirectory ?? ".");

  return {
    async listThemes() {
      const themeLists = await Promise.all(roots.map((root) => listThemeRoot(root)));
      return themeLists.flat().sort((left, right) => left.name.localeCompare(right.name));
    },

    async loadTheme(ref) {
      return loadThemeDirectory(resolveThemeDirectory(ref, roots, baseDirectory));
    }
  };
}

async function readThemeManifest(root: string): Promise<ThemeManifest> {
  const raw = await readFile(join(root, "theme.json"), "utf8");
  return JSON.parse(raw) as ThemeManifest;
}

async function readThemeFiles(root: string, manifest: ThemeManifest): Promise<Record<string, string>> {
  const paths = [...new Set([...(await listThemeFiles(root)), ...getThemeFilePaths(manifest)])];
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
            const manifest = await readThemeManifest(directory);
            return {
              name: manifest.name ?? entry.name,
              label: manifest.name ?? entry.name,
              source: directory
            };
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

function resolveThemeDirectory(ref: string, roots: string[], baseDirectory: string): string {
  if (isAbsolute(ref)) {
    return ref;
  }

  if (isPathRef(ref)) {
    return resolve(baseDirectory, ref);
  }

  return resolveNamedTheme(ref, roots);
}

function resolveNamedTheme(ref: string, roots: string[]): string {
  return join(roots[0] ?? resolve("themes"), ref);
}

function isPathRef(ref: string): boolean {
  return ref.startsWith(".") || ref.includes("/") || ref.includes("\\");
}
