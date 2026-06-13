import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { normalizeRelativePosixPath } from "./path.js";
import { isRecord } from "./shape.js";

export interface ThemeResolutionOptions {
  roots?: string[];
  baseDirectory?: string;
}

export interface NormalizedThemeResolutionOptions {
  roots: string[];
  baseDirectory: string;
}

export interface ThemePackageDirectorySearchOptions {
  stopAt?: string;
}

export interface ThemePackagePathValidationResult {
  path: string;
  normalizedPath?: string;
  error?: ThemePackagePathError;
}

export interface ThemePackagePathError {
  code: "empty" | "unsafe" | "escape";
  message: string;
}

export class ThemeResolutionError extends Error {
  readonly code: string;
  readonly field: string | undefined;
  readonly path: string | undefined;

  constructor(code: string, message: string, metadata: { field?: string; path?: string } = {}) {
    super(message);
    this.name = "ThemeResolutionError";
    this.code = code;
    this.field = metadata.field;
    this.path = metadata.path;
  }
}

export function normalizeThemePackagePath(path: string): ThemePackagePathValidationResult {
  if (path.length === 0) {
    return {
      path,
      error: {
        code: "empty",
        message: "path cannot be empty"
      }
    };
  }

  if (isAbsolute(path) || path.includes("\\") || path.includes("\0")) {
    return {
      path,
      error: {
        code: "unsafe",
        message: "path must be relative POSIX"
      }
    };
  }

  const normalizedPath = normalizeRelativePosixPath(path);
  if (path.split("/").includes("..")) {
    return {
      path,
      error: {
        code: "escape",
        message: "path cannot escape the package directory"
      }
    };
  }

  return {
    path,
    normalizedPath
  };
}

export function normalizeThemeResolutionOptions(
  options: ThemeResolutionOptions = {}
): NormalizedThemeResolutionOptions {
  const baseDirectory = resolve(options.baseDirectory ?? ".");

  return {
    roots: options.roots?.map((root) => resolveThemeRoot(baseDirectory, root)) ?? [resolve(baseDirectory, "themes")],
    baseDirectory
  };
}

function resolveThemeRoot(baseDirectory: string, root: string): string {
  return isAbsolute(root) ? resolve(root) : resolve(baseDirectory, root);
}

export async function resolveThemeRef(
  ref: string,
  options: NormalizedThemeResolutionOptions
): Promise<string> {
  if (isAbsolute(ref)) {
    return resolveThemeArtifactDirectory(ref);
  }

  if (isPathRef(ref)) {
    return resolveThemeArtifactDirectory(resolve(options.baseDirectory, ref));
  }

  const namedThemeDirectory = await resolveNamedTheme(ref, options.roots);
  if (namedThemeDirectory !== undefined) {
    return namedThemeDirectory;
  }

  return resolvePackageThemeDirectory(ref, options.baseDirectory);
}

export async function tryResolveThemeArtifactDirectory(directory: string): Promise<string | undefined> {
  if (await hasFile(join(directory, "theme.json"))) {
    return directory;
  }

  const packageJson = await tryReadPackageJson(directory);
  if (packageJson === undefined) {
    return undefined;
  }

  const dist = readPackageThemeDist(packageJson, join(directory, "package.json"));
  if (dist === undefined) {
    return undefined;
  }

  return resolve(directory, dist);
}

export async function findThemePackageDirectoryForArtifact(
  artifactDirectory: string,
  options: ThemePackageDirectorySearchOptions = {}
): Promise<string | undefined> {
  const artifactRoot = resolve(artifactDirectory);
  const stopAt = options.stopAt === undefined ? undefined : resolve(options.stopAt);
  let candidate = artifactRoot;

  for (;;) {
    if (stopAt !== undefined && !isPathInside(candidate, stopAt)) {
      return undefined;
    }

    const packageJson = await tryReadPackageJson(candidate);
    if (packageJson !== undefined) {
      const packageJsonPath = join(candidate, "package.json");
      const dist = readPackageThemeDist(packageJson, packageJsonPath);
      if (dist !== undefined && resolve(candidate, dist) === artifactRoot) {
        return candidate;
      }
    }

    const parent = dirname(candidate);
    if (parent === candidate) {
      return undefined;
    }
    candidate = parent;
  }
}

function isPathRef(ref: string): boolean {
  return ref.startsWith(".") || ref.includes("\\") || (ref.includes("/") && !ref.startsWith("@"));
}

async function resolveThemeArtifactDirectory(directory: string): Promise<string> {
  const artifactDirectory = await tryResolveThemeArtifactDirectory(directory);
  if (artifactDirectory === undefined) {
    return directory;
  }

  return artifactDirectory;
}

async function resolveNamedTheme(ref: string, roots: string[]): Promise<string | undefined> {
  for (const root of roots) {
    const candidate = join(root, ref);
    const artifactDirectory = await tryResolveThemeArtifactDirectory(candidate);
    if (artifactDirectory !== undefined) {
      return artifactDirectory;
    }
  }

  return undefined;
}

async function resolvePackageThemeDirectory(ref: string, baseDirectory: string): Promise<string> {
  const packageDirectory = await resolvePackageDirectory(ref, baseDirectory);
  const artifactDirectory = await tryResolveThemeArtifactDirectory(packageDirectory);
  if (artifactDirectory === undefined) {
    throw new ThemeResolutionError(
      "invalid-theme-package",
      `Theme package "${ref}" does not define package.json#mdsTheme.dist.`,
      {
        field: "package.json#mdsTheme.dist",
        path: join(packageDirectory, "package.json")
      }
    );
  }

  return artifactDirectory;
}

async function resolvePackageDirectory(ref: string, baseDirectory: string): Promise<string> {
  const require = createRequire(join(baseDirectory, "__mds_theme_resolution__.js"));

  try {
    return dirname(require.resolve(`${ref}/package.json`));
  } catch {
    // Package exports can hide package.json, so fall back to resolving the entry and walking upward.
  }

  try {
    return findPackageRootForEntry(await Promise.resolve(require.resolve(ref)), ref);
  } catch {
    throw new ThemeResolutionError("unknown-theme", `Unknown theme or theme package: ${ref}.`, {
      field: "theme ref"
    });
  }
}

async function findPackageRootForEntry(entryPath: string, packageName: string): Promise<string> {
  let directory = dirname(entryPath);

  for (;;) {
    const packageJson = await tryReadPackageJson(directory);
    if (packageJson !== undefined && (packageJson.name === packageName || typeof packageJson.name !== "string")) {
      return directory;
    }

    const parent = dirname(directory);
    if (parent === directory) {
      throw new Error(`Cannot find package root for ${packageName}.`);
    }

    directory = parent;
  }
}

function isPathInside(path: string, directory: string): boolean {
  const relativePath = relative(directory, path);
  return relativePath.length === 0 || (!relativePath.startsWith("..") && !isAbsolute(relativePath));
}

function readPackageThemeDist(packageJson: Record<string, unknown>, packageJsonPath: string): string | undefined {
  const value = packageJson.mdsTheme;
  if (value === undefined) {
    return undefined;
  }

  if (!isRecord(value)) {
    throw new ThemeResolutionError("invalid-theme-package", "Theme package mdsTheme must be an object.", {
      field: "package.json#mdsTheme",
      path: packageJsonPath
    });
  }

  const dist = value.dist;
  if (dist === undefined) {
    return "dist/theme";
  }

  if (typeof dist !== "string" || dist.length === 0) {
    throw new ThemeResolutionError("invalid-theme-package", "Theme package mdsTheme.dist must be a string.", {
      field: "package.json#mdsTheme.dist",
      path: packageJsonPath
    });
  }

  return normalizePackageThemeDist(dist, packageJsonPath);
}

async function tryReadPackageJson(directory: string): Promise<Record<string, unknown> | undefined> {
  const packageJsonPath = join(directory, "package.json");
  try {
    const packageJson = JSON.parse(await readFile(packageJsonPath, "utf8")) as unknown;
    if (!isRecord(packageJson)) {
      throw new ThemeResolutionError("invalid-theme-package", "Theme package.json must be a JSON object.", {
        field: "package.json",
        path: packageJsonPath
      });
    }

    return packageJson;
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return undefined;
    }

    if (error instanceof ThemeResolutionError) {
      throw error;
    }

    if (error instanceof SyntaxError) {
      throw new ThemeResolutionError(
        "invalid-theme-package",
        `Theme package has invalid package.json at ${packageJsonPath}: ${error.message}`,
        {
          field: "package.json",
          path: packageJsonPath
        }
      );
    }

    throw error;
  }
}

async function hasFile(path: string): Promise<boolean> {
  try {
    await readFile(path, "utf8");
    return true;
  } catch {
    return false;
  }
}

function normalizePackageThemeDist(path: string, packageJsonPath: string): string {
  const result = normalizeThemePackagePath(path);
  if (result.error !== undefined) {
    throw new ThemeResolutionError(
      "invalid-theme-package",
      `Theme package mdsTheme.dist must be a relative POSIX path inside the package directory: ${path}.`,
      {
        field: "package.json#mdsTheme.dist",
        path: packageJsonPath
      }
    );
  }

  return result.normalizedPath ?? path;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
