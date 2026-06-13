import {
  createThemeFromSources,
  createThemeResultFromSources,
  isThemeSummaryList,
  isThemeSourceInput,
  ThemeValidationError
} from "@mds/theme-loader/browser";
import type { ThemeCreationResult, ThemeRegistry, ThemeSource, ThemeSummary } from "@mds/theme-loader/browser";
import {
  isThemeBuildProviderErrorBody,
  isThemeInspectionProviderResult,
  isThemeBuildProviderResult,
  type ThemeBuildProviderDiagnostic,
  type ThemeBuildProviderResult,
  type ThemeInspectionProviderResult
} from "./theme-build-contract.js";
import { isThemeValidationProviderErrorBody, type ThemeValidationProviderErrorBody } from "./theme-validation-contract.js";

export class ThemeBuildProviderError extends Error {
  readonly diagnostics: ThemeBuildProviderDiagnostic[];

  constructor(diagnostics: ThemeBuildProviderDiagnostic[], message = "Theme build failed.") {
    super(message);
    this.name = "ThemeBuildProviderError";
    this.diagnostics = diagnostics;
  }
}

export const themeProvider: ThemeRegistry = {
  async listThemes() {
    return readThemeSummaryList("/__mds/themes");
  },

  async loadTheme(ref) {
    const source = await readThemeSource(`/__mds/themes/${encodeURIComponent(ref)}`);
    return createThemeFromSources(source);
  },

  async loadThemeWithDiagnostics(ref) {
    return loadThemeWithDiagnostics(ref);
  }
};

export async function loadThemeWithDiagnostics(ref: string): Promise<ThemeCreationResult> {
  const source = await readThemeSource(`/__mds/themes/${encodeURIComponent(ref)}`);
  return createThemeResultFromSources(source);
}

export async function buildThemePackageWithDiagnostics(ref: string): Promise<ThemeBuildProviderResult> {
  const response = await fetch(`/__mds/theme-build/${encodeURIComponent(ref)}`, {
    method: "POST"
  });
  const body = await response.text();

  if (!response.ok) {
    throwProviderHttpError(response, body, "build");
  }

  const resultBody = parseJsonBody(body);
  if (!isThemeBuildProviderResult(resultBody)) {
    throw new Error("Invalid theme build response.");
  }

  return resultBody;
}

export async function inspectThemeWithDiagnostics(ref: string): Promise<ThemeInspectionProviderResult> {
  const resultBody = await readJson<unknown>(`/__mds/theme-inspect/${encodeURIComponent(ref)}`, "build");
  if (!isThemeInspectionProviderResult(resultBody)) {
    throw new Error("Invalid theme inspection response.");
  }

  return resultBody;
}

async function readJson<T>(url: string, errorMode: "theme" | "build" = "theme"): Promise<T> {
  const response = await fetch(url);
  const body = await response.text();

  if (!response.ok) {
    throwProviderHttpError(response, body, errorMode);
  }

  return parseJsonBody(body) as T;
}

async function readThemeSource(url: string): Promise<ThemeSource> {
  const source = await readJson<unknown>(url);
  if (!isThemeSourceInput(source)) {
    throw new Error("Invalid theme source response.");
  }

  return source;
}

async function readThemeSummaryList(url: string): Promise<ThemeSummary[]> {
  const summaries = await readJson<unknown>(url);
  if (!isThemeSummaryList(summaries)) {
    throw new Error("Invalid theme list response.");
  }

  return summaries;
}

function readErrorMessage(value: { message?: unknown }): string {
  return typeof value.message === "string" && value.message.length > 0 ? value.message : "Theme build failed.";
}

function throwProviderHttpError(response: Response, body: string, mode: "theme" | "build"): never {
  const errorBody = isJsonResponse(response) ? parseJsonBody(body) : undefined;

  if (mode === "theme" && isThemeValidationProviderErrorBody(errorBody)) {
    throw new ThemeValidationError(errorBody.diagnostics);
  }

  if (mode === "build") {
    if (isNamedThemeValidationErrorBody(errorBody)) {
      throw new ThemeValidationError(errorBody.diagnostics);
    }

    if (isThemeBuildProviderErrorBody(errorBody)) {
      throw new ThemeBuildProviderError(errorBody.diagnostics, readErrorMessage(errorBody));
    }
  }

  throw new Error(body);
}

function isNamedThemeValidationErrorBody(
  value: unknown
): value is ThemeValidationProviderErrorBody & { name: "ThemeValidationError" } {
  return isThemeValidationProviderErrorBody(value) && value.name === "ThemeValidationError";
}

function isJsonResponse(response: Response): boolean {
  return (response.headers.get("Content-Type") ?? "").includes("application/json");
}

function parseJsonBody(body: string): unknown {
  try {
    return JSON.parse(body) as unknown;
  } catch {
    return undefined;
  }
}
