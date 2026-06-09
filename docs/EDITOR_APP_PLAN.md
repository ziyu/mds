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
      theme/default-browser-theme.ts
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
- `@mds/theme-default` for shared template/theme helpers.

CodeMirror is the right first editor dependency because it is fast, browser-native, extensible, and works well for Markdown-like languages. We can start with Markdown highlighting and later add an MDS language extension.

## Theme Loading In Browser

The current file theme loader reads from disk, which is right for CLI but not for browser preview. Do not put browser file-loading logic into `@mds/renderer-html`.

Add a source-based theme factory to `@mds/theme-default`:

```ts
createThemeFromSources({
  rootName: "default",
  manifest,
  files
})
```

CLI path:

```txt
theme directory -> loadThemeDirectory -> createThemeFromSources -> HtmlTheme
```

Editor path:

```txt
Vite ?raw imports -> createThemeFromSources -> HtmlTheme
```

This keeps renderer clean and lets the browser app reuse the same theme template logic.

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

## Browser Theme Assets

For MVP, import the default theme files with Vite raw imports:

```ts
import manifest from "../../../../themes/default/theme.json";
import css from "../../../../themes/default/style.css?raw";
import js from "../../../../themes/default/script.js?raw";
import shell from "../../../../themes/default/shell.html?raw";
import hero from "../../../../themes/default/blocks/hero.html?raw";
```

Then build a `files` map:

```ts
const files = {
  "style.css": css,
  "script.js": js,
  "shell.html": shell,
  "blocks/hero.html": hero
};
```

This is explicit, simple, and keeps normal content creators on the file-directory model.

## Package Responsibilities

### `apps/editor`

- UI shell.
- CodeMirror setup.
- Example source state.
- Preview iframe.
- Diagnostics display.
- Browser raw imports for theme files.

### `@mds/theme-default`

- Template rendering.
- `createThemeFromSources`.
- `loadThemeDirectory` for CLI/Node.

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
- Add source-based theme factory in `@mds/theme-default`.
- Import default theme files with `?raw`.

Acceptance:

- `pnpm dev:editor` starts the app.
- Editing source updates preview.
- Landing example renders with default theme CSS/JS.

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
