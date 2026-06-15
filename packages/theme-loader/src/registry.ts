import type { HtmlTheme } from "@mds/html-types";
import { normalizeThemeManifestReferences } from "./artifact.js";
import {
  createThemeFromSources,
  createThemeResultFromSources,
  resolveThemeLabel,
  resolveThemeName,
  uniqueThemeStrings,
  type ThemeCreationResult,
  type ThemeSource
} from "./source-theme.js";
import { hasOptionalString, hasOptionalStringArray, isRecord } from "./shape.js";
import { ThemeValidationError, type ThemeDiagnostic } from "./validation.js";

export interface ThemeSummary {
  name: string;
  label: string;
  source?: string;
  description?: string;
  author?: string;
  homepage?: string;
  preview?: string;
  tags?: string[];
  supportedBlocks?: string[];
  buildable?: boolean;
}

export interface ThemeRegistry {
  listThemes(): Promise<ThemeSummary[]>;
  loadTheme(ref: string): Promise<HtmlTheme>;
  loadThemeWithDiagnostics(ref: string): Promise<ThemeCreationResult>;
}

export interface ThemeSummaryOptions {
  source?: string;
  fallbackName?: string;
  buildable?: boolean;
}

export function createThemeSummary(manifest: ThemeSource["manifest"], options: ThemeSummaryOptions = {}): ThemeSummary {
  const name = resolveThemeName(manifest, options.fallbackName);
  return {
    name,
    label: resolveThemeLabel(manifest, name),
    ...(options.source === undefined ? {} : { source: options.source }),
    ...(options.buildable === true ? { buildable: true } : {}),
    ...themeSummaryMetadata(manifest)
  };
}

export function isThemeSummary(value: unknown): value is ThemeSummary {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    typeof value.label === "string" &&
    hasOptionalString(value, "source") &&
    hasOptionalString(value, "description") &&
    hasOptionalString(value, "author") &&
    hasOptionalString(value, "homepage") &&
    hasOptionalString(value, "preview") &&
    hasOptionalStringArray(value, "tags") &&
    hasOptionalStringArray(value, "supportedBlocks") &&
    (value.buildable === undefined || typeof value.buildable === "boolean")
  );
}

export function isThemeSummaryList(value: unknown): value is ThemeSummary[] {
  return Array.isArray(value) && value.every(isThemeSummary);
}

export function createMemoryThemeRegistry(sources: ThemeSource[]): ThemeRegistry {
  const entries = sources.map((source) => {
    const name = resolveThemeName(source.manifest, source.rootName);
    const summary = createThemeSummary(source.manifest, {
      ...(source.rootName === undefined ? {} : { source: source.rootName }),
      ...(source.rootName === undefined ? {} : { fallbackName: source.rootName })
    });

    return {
      name,
      summary,
      source
    };
  });

  return {
    async listThemes() {
      return entries.map((entry) => entry.summary);
    },

    async loadTheme(ref) {
      const entry = entries.find((candidate) => candidate.name === ref || candidate.source.rootName === ref);
      if (entry === undefined) {
        throw createUnknownThemeError(ref);
      }

      return createThemeFromSources(entry.source);
    },

    async loadThemeWithDiagnostics(ref) {
      const entry = entries.find((candidate) => candidate.name === ref || candidate.source.rootName === ref);
      if (entry === undefined) {
        throw createUnknownThemeError(ref);
      }

      return createThemeResultFromSources(entry.source);
    }
  };
}

export function createUnknownThemeError(ref: string): ThemeValidationError {
  return new ThemeValidationError([unknownThemeDiagnostic(ref)], ref);
}

export function unknownThemeDiagnostic(ref: string): ThemeDiagnostic {
  return {
    severity: "error",
    code: "unknown-theme",
    message: `Unknown theme: ${ref}.`,
    field: "theme ref"
  };
}

function themeSummaryMetadata(manifest: ThemeSource["manifest"]): Omit<ThemeSummary, "name" | "label" | "source"> {
  const normalizedManifest = normalizeThemeManifestReferences(manifest);
  const supportedBlocks = uniqueThemeStrings(normalizedManifest.supportedBlocks);

  return {
    ...(normalizedManifest.description === undefined ? {} : { description: normalizedManifest.description }),
    ...(normalizedManifest.author === undefined ? {} : { author: normalizedManifest.author }),
    ...(normalizedManifest.homepage === undefined ? {} : { homepage: normalizedManifest.homepage }),
    ...(isNonEmptyString(normalizedManifest.preview) ? { preview: normalizedManifest.preview } : {}),
    ...(normalizedManifest.tags === undefined ? {} : { tags: normalizedManifest.tags }),
    ...(supportedBlocks === undefined ? {} : { supportedBlocks })
  };
}

function isNonEmptyString(value: string | undefined): value is string {
  return value !== undefined && value.length > 0;
}
