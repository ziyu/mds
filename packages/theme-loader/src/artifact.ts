import type { ThemeAssetReference, ThemeBlockReference, ThemeManifest, ThemeSourceInput } from "./source-theme.js";
import { normalizeRelativePosixPath } from "./path.js";

export const THEME_MANIFEST_FILE = "theme.json";
export const THEME_BUILD_METADATA_FILE = ".mds-theme-build.json";

export interface ThemeArtifactPathValidationResult {
  path: string;
  normalizedPath?: string;
  error?: ThemeArtifactPathError;
}

export interface ThemeArtifactPathError {
  code: "empty" | "absolute" | "non-posix" | "null-byte" | "escape";
  message: string;
}

export interface ThemeArtifactOutputPathValidationResult {
  path: string;
  normalizedPath?: string;
  error?: ThemeArtifactOutputPathError;
}

export interface ThemeArtifactOutputPathError {
  code: "empty" | "unsafe" | "escape";
  message: string;
}

export function normalizeThemeArtifactPath(path: string): ThemeArtifactPathValidationResult {
  if (path.length === 0) {
    return {
      path,
      error: {
        code: "empty",
        message: "path cannot be empty"
      }
    };
  }

  if (path.includes("\0")) {
    return {
      path,
      error: {
        code: "null-byte",
        message: "path cannot contain null bytes"
      }
    };
  }

  if (path.startsWith("/") || /^[A-Za-z]:[\\/]/.test(path)) {
    return {
      path,
      error: {
        code: "absolute",
        message: "path must be relative"
      }
    };
  }

  if (path.includes("\\")) {
    return {
      path,
      error: {
        code: "non-posix",
        message: "path must use POSIX separators"
      }
    };
  }

  const normalizedPath = normalizeRelativePosixPath(path);
  if (normalizedPath === "." || path.split("/").includes("..")) {
    return {
      path,
      error: {
        code: "escape",
        message: "path cannot escape the theme directory"
      }
    };
  }

  return {
    path,
    normalizedPath
  };
}

export function normalizeThemeArtifactOutputPath(path: string): ThemeArtifactOutputPathValidationResult {
  const result = normalizeThemeArtifactPath(path);

  if (result.error === undefined) {
    return {
      path,
      ...(result.normalizedPath === undefined ? {} : { normalizedPath: result.normalizedPath })
    };
  }

  return {
    path,
    error: themeArtifactPathErrorToOutputError(result.error)
  };
}

function themeArtifactPathErrorToOutputError(error: ThemeArtifactPathError): ThemeArtifactOutputPathError {
  if (error.code === "empty") {
    return {
      code: "empty",
      message: "path cannot be empty"
    };
  }

  if (error.code === "escape") {
    return {
      code: "escape",
      message: "path cannot escape the output directory"
    };
  }

  return {
    code: "unsafe",
    message: "path must be a relative POSIX path"
  };
}

export function isThemeManifestPath(path: string): boolean {
  return normalizeThemeArtifactPath(path).normalizedPath === THEME_MANIFEST_FILE;
}

export function isThemeBuildMetadataPath(path: string): boolean {
  return normalizeThemeArtifactPath(path).normalizedPath === THEME_BUILD_METADATA_FILE;
}

export function isThemeDevelopmentMetadataPath(path: string): boolean {
  return isThemeBuildMetadataPath(path);
}

export function getThemeRuntimeFiles(files: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(files).filter(([path]) => !isThemeDevelopmentMetadataPath(path)));
}

export function getThemeRuntimeSourceInput(input: ThemeSourceInput): ThemeSourceInput {
  return {
    ...input,
    files: getThemeRuntimeFiles(input.files)
  };
}

export function getThemeDevelopmentFiles(files: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(files).filter(([path]) => isThemeDevelopmentMetadataPath(path)));
}

export interface ThemeArtifactFileLists {
  files: string[];
  runtimeFiles: string[];
  developmentFiles: string[];
}

export function getThemeArtifactFileLists(files: Record<string, string>): ThemeArtifactFileLists {
  const runtimeFiles = sortThemeArtifactFilePaths([THEME_MANIFEST_FILE, ...Object.keys(getThemeRuntimeFiles(files))]);
  const developmentFiles = sortThemeArtifactFilePaths(Object.keys(getThemeDevelopmentFiles(files)));

  return {
    files: sortThemeArtifactFilePaths([...runtimeFiles, ...developmentFiles]),
    runtimeFiles,
    developmentFiles
  };
}

export function sortThemeArtifactFilePaths(paths: string[]): string[] {
  return [...paths].sort(compareThemeArtifactFilePaths);
}

function compareThemeArtifactFilePaths(left: string, right: string): number {
  if (left === THEME_MANIFEST_FILE) {
    return right === THEME_MANIFEST_FILE ? 0 : -1;
  }
  if (right === THEME_MANIFEST_FILE) {
    return 1;
  }

  const leftIsDevelopmentMetadata = isThemeDevelopmentMetadataPath(left);
  const rightIsDevelopmentMetadata = isThemeDevelopmentMetadataPath(right);
  if (leftIsDevelopmentMetadata !== rightIsDevelopmentMetadata) {
    return leftIsDevelopmentMetadata ? 1 : -1;
  }

  return left < right ? -1 : left > right ? 1 : 0;
}

export function normalizeThemeSourceInput(input: ThemeSourceInput): ThemeSourceInput {
  return {
    ...input,
    manifest: normalizeThemeManifestReferences(input.manifest),
    files: normalizeThemeFiles(input.files)
  };
}

export function normalizeThemeManifestReferences(manifest: ThemeManifest): ThemeManifest {
  return {
    ...manifest,
    ...(manifest.css === undefined ? {} : { css: normalizeThemeAssetReference(manifest.css) }),
    ...(manifest.js === undefined ? {} : { js: normalizeThemeAssetReference(manifest.js) }),
    ...(manifest.head === undefined ? {} : { head: normalizeThemeAssetReference(manifest.head) }),
    ...(manifest.shell === undefined ? {} : { shell: normalizeThemePathReference(manifest.shell) }),
    ...(manifest.preview === undefined ? {} : { preview: normalizeThemePathReference(manifest.preview) }),
    ...(manifest.blocks === undefined ? {} : { blocks: normalizeThemeBlockReference(manifest.blocks) })
  };
}

export function normalizeThemeFiles(files: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(files).map(([path, contents]) => [normalizeThemePathReference(path), contents])
  );
}

export function normalizeThemePathReference(path: string): string {
  return normalizeThemeArtifactPath(path).normalizedPath ?? path;
}

function normalizeThemeAssetReference(reference: ThemeAssetReference): ThemeAssetReference {
  return Array.isArray(reference) ? reference.map(normalizeThemePathReference) : normalizeThemePathReference(reference);
}

function normalizeThemeBlockReference(reference: ThemeBlockReference): ThemeBlockReference {
  if (typeof reference === "string") {
    return normalizeThemePathReference(reference);
  }

  if (Array.isArray(reference)) {
    return reference.map(normalizeThemePathReference);
  }

  return Object.fromEntries(
    Object.entries(reference).map(([blockType, path]) => [blockType, normalizeThemePathReference(path)])
  );
}
