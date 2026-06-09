export interface ThemeDefaultOptions {
  includeCss?: boolean;
}

export const defaultThemeName = "default";

export const defaultThemeCss = `
:root {
  color-scheme: light dark;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.page {
  max-width: 72rem;
  margin: 0 auto;
  padding: 2rem;
}
`;
