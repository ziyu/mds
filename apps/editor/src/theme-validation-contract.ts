import { isThemeDiagnostic, type ThemeDiagnostic } from "@mds/theme-loader/browser";

export interface ThemeValidationProviderErrorBody {
  name?: string;
  message?: string;
  diagnostics: ThemeDiagnostic[];
}

export function serializeThemeValidationErrorBody(
  diagnostics: ThemeDiagnostic[],
  message = diagnostics[0]?.message ?? "Theme validation failed."
): ThemeValidationProviderErrorBody {
  return {
    name: "ThemeValidationError",
    message,
    diagnostics
  };
}

export function isThemeValidationProviderErrorBody(value: unknown): value is ThemeValidationProviderErrorBody {
  return (
    isRecord(value) &&
    hasOptionalString(value, "name") &&
    hasOptionalString(value, "message") &&
    Array.isArray(value.diagnostics) &&
    value.diagnostics.every(isThemeDiagnostic)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOptionalString(value: Record<string, unknown>, key: string): boolean {
  return !(key in value) || typeof value[key] === "string";
}
