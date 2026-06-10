# MDS Editor App Plan

The editor app exists to make MDS theme and syntax work visible. Its first job is not to become a full CMS; it should let us type MDS, render it through the real parser/renderer/theme pipeline, and preview the resulting standalone HTML.

## Goals

1. Edit `.mds` source with a real code editor.
2. Preview rendered HTML using the same parser, renderer, and default theme used by CLI output.
3. Show diagnostics from the parser immediately.
4. Let theme changes be visible without asking users to run CLI commands manually.
5. Keep the app inside the monorepo without coupling renderer internals to browser UI code.

## Monorepo Shape

Add apps to the workspace:

```yaml
packages:
  - "packages/*"
  - "apps/*"
```

Create:

```txt
apps/
  editor/
    package.json
    index.html
    src/
      main.tsx
      app.tsx
      editor-pane.tsx
      preview-pane.tsx
      diagnostics-pane.tsx
      theme-provider.ts
      examples.ts
      styles.css
```

Root scripts:

```json
{
  "dev:editor": "pnpm --filter @mds/editor dev",
  "build:editor": "pnpm --filter @mds/editor build"
}
```

## Stack

Use mature, fast libraries:

- Vite for app dev/build.
- React for the UI shell.
- CodeMirror 6 for the MDS editor.
- `@mds/parser` for AST and diagnostics.
- `@mds/renderer-html` for preview HTML.
- `@mds/theme-loader` for shared template/theme loading helpers.

CodeMirror is the right first editor dependency because it is fast, browser-native, extensible, and works well for Markdown-like languages. We can start with Markdown highlighting and later add an MDS language extension.

## Theme Loading

Theme loading must be a lower-level abstraction. The editor app should never import scattered theme files such as `style.css`, `shell.html`, or `blocks/hero.html` directly.

The editor should only ask for a theme:

```ts
const theme = await themeProvider.loadTheme("default");
```

Recommended contract:

```ts
interface ThemeProvider {
  listThemes(): Promise<ThemeSummary[]>;
  loadTheme(ref: string): Promise<HtmlTheme>;
}

interface ThemeSummary {
  name: string;
  label: string;
}
```

The implementation can use different loaders internally:

```txt
CLI:
theme directory -> loadThemeDirectory -> HtmlTheme

Editor MVP:
bundled default theme -> loadTheme("default") -> HtmlTheme

Future browser custom theme:
File System Access API or uploaded directory -> loadThemeFromFileMap -> HtmlTheme

Future hosted editor:
server theme endpoint -> loadTheme("theme-name") -> HtmlTheme
```

This keeps the app UI clean and keeps theme source handling inside theme packages.

### Source-Based Factory

`@mds/theme-loader` exposes source-based factories internally:

```ts
createThemeFromSources({
  manifest,
  files
})
```

But the editor should not assemble `files` itself. That factory is for loaders and package build steps, not app UI code.

### Bundled Default Theme

For the editor dev app, load theme sources through a server-side theme API:

```ts
GET /__mds/themes
GET /__mds/themes/:name
```

The browser receives a parsed `ThemeSource` and calls `createThemeFromSources`. This keeps browser code from reading scattered theme files directly while avoiding generated theme modules.

The renderer stays independent:

```txt
editor -> theme provider -> HtmlTheme
editor -> renderHtml(document, { theme })
renderer-html does not know where the theme came from
```

## MVP UI

Use a dense two-pane app, not a marketing page:

```txt
┌─────────────────────────────────────────────────────────┐
│ Top bar: example selector | theme selector | copy/export │
├──────────────────────────────┬──────────────────────────┤
│ Editor                       │ Preview iframe           │
│ CodeMirror                   │ rendered standalone HTML │
├──────────────────────────────┴──────────────────────────┤
│ Diagnostics                                             │
└─────────────────────────────────────────────────────────┘
```

Core controls:

- Example selector: Basic, Landing, Forms, Components.
- Preview mode: Desktop, Tablet, Mobile.
- Toggle: show diagnostics panel.
- Button: copy generated HTML.
- Button: download generated HTML.

## Preview Strategy

Render into an iframe with `srcdoc`:

```txt
source text
  -> parseMds(source)
  -> renderHtml(document, { theme })
  -> iframe.srcdoc = html
```

Why iframe:

- CSS from the generated theme cannot leak into the editor UI.
- Theme JavaScript runs in the preview document, not in the app shell.
- The preview is close to the final standalone HTML behavior.

Use a short debounce, around 150ms, so typing feels responsive.

## Diagnostics

Diagnostics should be visible but not noisy:

- Show parser errors and warnings in a bottom panel.
- Include severity, code, message, line, and column.
- Highlight line ranges in CodeMirror later.

MVP can start with a diagnostics list. Editor decorations can come after the preview loop is solid.

## Theme Provider In The Editor

The editor app owns only a tiny adapter:

```ts
import type { HtmlTheme } from "@mds/renderer-html";
import { createThemeFromSources } from "@mds/theme-loader";

export const themeProvider = {
  async listThemes() {
    return [{ name: "default", label: "Default" }];
  },
  async loadTheme(ref: string): Promise<HtmlTheme> {
    if (ref === "default") {
      return createThemeFromSources(await fetchThemeSource(ref));
    }
    throw new Error(`Unknown theme: ${ref}`);
  }
};
```

This adapter can later switch to a server-backed registry or a browser directory loader without changing the editor preview flow.

## Package Responsibilities

### `apps/editor`

- UI shell.
- CodeMirror setup.
- Example source state.
- Preview iframe.
- Diagnostics display.
- Theme provider calls.
- No direct imports of individual theme asset files.

### `@mds/theme-loader`

- Template rendering.
- File-based `ThemeRegistry` for Node tools.
- Internal `createThemeFromSources`.
- `loadThemeDirectory` for CLI/Node.
- Optional `loadThemeFromFileMap` for future browser custom themes.

### `@mds/renderer-html`

- AST to HTML orchestration.
- Base semantic HTML renderers.
- Shell/head/script assembly.
- No dependency on app UI or default theme package.

## Implementation Phases

### Phase 1: Preview Pipeline

- Update workspace to include `apps/*`.
- Add `apps/editor` with Vite + React + TypeScript.
- Add CodeMirror editor pane.
- Add preview iframe using `parseMds` and `renderHtml`.
- Add a dev-server theme API that reads `themes/` through `@mds/theme-loader`.
- Add an editor `themeProvider` that calls `loadTheme("default")`.

Acceptance:

- `pnpm dev:editor` starts the app.
- Editing source updates preview.
- Landing example renders with default theme CSS/JS.
- `apps/editor` does not import individual theme asset files.

### Phase 2: Diagnostics And Examples

- Add diagnostics panel.
- Add example selector.
- Add preview size controls.
- Add generated HTML copy/download.

Acceptance:

- Parser errors show line/column.
- User can switch examples without restarting app.
- User can copy/download standalone HTML.

### Phase 3: Editor Polish

- Add MDS-aware highlighting for block markers, slots, actions, media, and forms.
- Add line decorations for diagnostics.
- Add keyboard shortcuts.
- Add localStorage persistence.

Acceptance:

- Reload keeps the last edited source.
- Diagnostics are visible in both list and editor gutter.

## First Build Target

Start with Phase 1 only. It is enough to make theme work visible and gives us a real place to inspect design changes.

The first implementation should avoid server APIs, file pickers, project management, user accounts, and plugin marketplaces. Those can wait until the preview loop is excellent.
