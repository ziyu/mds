import { createThemeFromSources } from "@mds/theme-loader/browser";
import type { ThemeRegistry, ThemeSource, ThemeSummary } from "@mds/theme-loader/browser";

export const themeProvider: ThemeRegistry = {
  async listThemes() {
    return readJson<ThemeSummary[]>("/__mds/themes");
  },

  async loadTheme(ref) {
    const source = await readJson<ThemeSource>(`/__mds/themes/${encodeURIComponent(ref)}`);
    return createThemeFromSources(source);
  }
};

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as T;
}
