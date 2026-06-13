import type { ThemeManifest } from "./source-theme.js";

export function uniqueThemeStrings(values: string[] | undefined): string[] | undefined {
  if (values === undefined) {
    return undefined;
  }

  return [...new Set(values)];
}

export function resolveThemeName(
  manifest: Pick<ThemeManifest, "name">,
  ...fallbackNames: Array<string | undefined>
): string {
  return nonEmptyString(manifest.name) ?? firstNonEmptyString(fallbackNames) ?? "theme";
}

export function resolveThemeLabel(manifest: Pick<ThemeManifest, "label">, fallbackName: string): string {
  return nonEmptyString(manifest.label) ?? fallbackName;
}

function firstNonEmptyString(values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    const normalized = nonEmptyString(value);
    if (normalized !== undefined) {
      return normalized;
    }
  }

  return undefined;
}

function nonEmptyString(value: string | undefined): string | undefined {
  return value === undefined || value.trim().length === 0 ? undefined : value;
}
