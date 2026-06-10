import type { HtmlTheme } from "@mds/html-types";
import { createThemeFromSources, type ThemeSource } from "./source-theme.js";

export interface ThemeSummary {
  name: string;
  label: string;
  source?: string;
}

export interface ThemeRegistry {
  listThemes(): Promise<ThemeSummary[]>;
  loadTheme(ref: string): Promise<HtmlTheme>;
}

export function createMemoryThemeRegistry(sources: ThemeSource[]): ThemeRegistry {
  const entries = sources.map((source) => {
    const name = source.manifest.name ?? source.rootName ?? "theme";
    const summary: ThemeSummary = {
      name,
      label: name,
      ...(source.rootName === undefined ? {} : { source: source.rootName })
    };

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
        throw new Error(`Unknown theme: ${ref}`);
      }

      return createThemeFromSources(entry.source);
    }
  };
}
