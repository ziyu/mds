# MDS Theme System Design

This document defines the long-term theme model for MDS.

The most important rule:

**MDS runtime consumes theme artifacts. Theme packages, JSX, React, build tools, and npm dependencies are development-time conveniences.**

MDS should let simple authors drop a folder into `themes/`, while letting developers use modern package workflows to build sophisticated themes quickly.

For the shared blocks layer that composes common block packs with theme overrides, see [BLOCK_LAYER.md](./BLOCK_LAYER.md).
For the shared block/component vocabulary and Canvas component roadmap, see [COMPONENTS.md](./COMPONENTS.md).

## Goals

- Keep ordinary theme customization file-based and approachable.
- Let professional frontend developers use npm packages, local components, TypeScript, JSX, CSS tooling, and build scripts.
- Keep MDS rendering deterministic: MDS documents compile to standalone HTML.
- Avoid requiring a theme runtime beyond the generated HTML, CSS, and optional theme JavaScript.
- Preserve a stable theme artifact contract so editor, CLI, browser previews, and future hosting integrations all load themes the same way.
- Make the AST and renderer extensible without forcing theme authors to understand parser internals.

## Non-Goals

- MDS will not execute arbitrary theme package source during normal rendering.
- MDS will not require React, Preact, Vue, or any framework at runtime.
- MDS will not require users to publish themes as npm packages.
- MDS will not let MDS documents embed arbitrary JavaScript handlers.
- MDS will not make JSX the only way to build themes.

## Terms

**Theme artifact**

A plain directory that MDS can load directly:

```txt
theme.json
shell.html
style.css
script.js
blocks/
  page.html
  hero.html
  card.html
```

This is the only runtime theme format.

**Theme source**

The in-memory version of a theme artifact:

```ts
interface ThemeSource {
  manifest: ThemeManifest;
  files: Record<string, string>;
  rootName?: string;
}
```

Browser tools and package builders use `ThemeSource` when they cannot or should not read arbitrary directories directly.
`ThemeSource.manifest` owns `theme.json`; `ThemeSource.files` contains artifact files such as CSS, JS, shell, previews, and block templates, but not `theme.json` itself.
`ThemeSource.files` keys must be relative POSIX paths inside the artifact directory. Absolute paths, backslashes, null bytes, and `..` escapes are invalid.

**Theme package**

A developer project that produces a theme artifact:

```txt
my-theme/
  package.json
  src/theme.tsx
  src/style.css
  dist/theme/
    theme.json
    blocks/*.html
```

The package is a development container. The artifact is the runtime input.

**Theme SDK**

Authoring helpers such as JSX utilities, future React/Preact adapters, and typed props. SDKs help generate artifacts; they are not loaded by MDS at runtime.

## Design Principles

1. **Artifact first**

   Every loading path should converge on the same runtime artifact format. A directory theme, single-file theme, JSX-authored theme, and package theme should all become `theme.json` plus asset/template files.

2. **Builder is optional**

   Content authors should be able to copy a theme folder and edit CSS or HTML. Developers can opt into package tooling, but that tooling must not become required for ordinary theme usage.

3. **Renderer stays narrow**

   `@mds-crate/renderer-html` should know how to combine AST nodes with an `HtmlTheme`. It should not know how to scan directories, import TSX, resolve npm packages, watch files, or run bundlers.

4. **Loader owns theme artifacts**

   `@mds-crate/theme-loader` owns artifact parsing, asset loading, block template discovery, manifest interpretation, and registry behavior.

   Node-only package and path resolution lives behind `@mds-crate/theme-loader` resolver helpers. Browser integrations receive serialized `ThemeSource` objects instead of resolving local paths themselves.

5. **Builder owns theme source**

   `@mds-crate/theme-builder` owns developer-time concerns: importing package source, converting JSX/components to templates, copying assets, and later bundling CSS/JS.

6. **Editor uses the same abstraction**

   The editor should ask a registry for themes and pass an `HtmlTheme` into rendering. It should not load loose theme files one by one or know about package internals.

7. **Native behavior before custom JavaScript**

   Links, anchors, forms, details, dialogs, and buttons should use native HTML semantics first. Theme JavaScript is progressive enhancement.

8. **Block is the extension boundary**

   MDS should not grow separate extension systems for components, animation, layout variants, and visual effects. Custom components are blocks. Motion primitives are blocks. Advanced configuration is carried by optional block attributes and interpreted by the selected theme.

9. **Shared blocks compose before theme overrides**

   Common block packs should be merged into a theme source before rendering or writing a built artifact. Themes keep ownership of visual styling and may override any shared block template, while runtime tools still consume a plain theme artifact.

## File Responsibilities

| File | Required | Runtime Role |
| --- | --- | --- |
| `theme.json` | yes | Declares assets, block sources, and theme capabilities. |
| `blocks/*.html` | no | Provides semantic block templates discovered by filename. |
| `blocks.html` | no | Provides multiple templates through `<template data-block>`. |
| `style.css` | no | Embedded into standalone HTML as theme CSS. |
| `script.js` | no | Embedded into standalone HTML as theme JavaScript. |
| `head.html` | no | Adds extra static head markup. |
| `shell.html` | no | Wraps rendered body into a final HTML document. |
| `preview.svg` | no | Optional theme preview asset referenced by `theme.json#preview`. |
| `.mds-theme-build.json` | no | Development metadata generated by `mds-theme build`; ignored by runtime rendering. |

Only `theme.json` is mandatory. Missing templates fall back to renderer defaults or diagnostic output depending on renderer policy.
All artifact files must stay inside the artifact directory. Builders must reject escaped output paths before writing files, and `theme.json` is reserved for the serialized manifest.
`@mds-crate/theme-loader` owns the shared artifact contract constants and path normalization helpers. Builder, CLI, editor integrations, and future packaging tools should reuse those helpers instead of duplicating reserved-file checks.
Artifact paths are canonical relative POSIX paths. Redundant leading `./`, internal `.` segments, and repeated `/` separators are accepted in source input but normalized away before rendering or writing artifacts; for example `./style.css` and `styles//./base.css` become `style.css` and `styles/base.css`. Two source files that normalize to the same path are invalid.

Development metadata files, currently `.mds-theme-build.json`, may exist in an artifact directory for inspection and rebuild tooling. Runtime theme creation ignores development metadata. Packaging flows should strip development metadata from clean distributable artifacts.
Inspection keeps the complete artifact file list for compatibility, but also exposes runtime files separately from development metadata files so editor, CLI, galleries, and distribution tools do not need to duplicate filtering rules.
`.mds-theme-build.json` uses two path domains: `source`, `output`, and `inputFiles` are package-relative POSIX paths inside the source package, while `artifactFiles` and `templates[].file` are artifact-relative POSIX paths validated by the shared artifact contract. The only directory-valued package metadata path is `output`, which may be `"."` for in-place themes. Metadata arrays use the builder's deterministic order: package input paths are sorted, artifact files keep `theme.json` first and sort the remaining paths, templates are sorted by file, and each template's block list is sorted.

## Architecture

```txt
MDS source
  -> parser
  -> MDS AST
  -> renderer-html
  -> HtmlTheme from theme-loader
  -> standalone HTML
```

Theme loading stays behind a registry:

```ts
interface ThemeRegistry {
  listThemes(): Promise<ThemeSummary[]>;
  loadTheme(ref: string): Promise<HtmlTheme>;
  loadThemeWithDiagnostics(ref: string): Promise<ThemeCreationResult>;
}
```

Node tools can load directories. Browser tools can load serialized `ThemeSource` objects. The renderer only receives `HtmlTheme`.

Node resolver helpers:

```ts
import { resolveThemeRef, readThemeRef } from "@mds-crate/theme-loader";

const artifactDirectory = await resolveThemeRef("@acme/mds-theme-clean", {
  roots: ["themes"],
  baseDirectory: process.cwd()
});
const source = await readThemeRef("@acme/mds-theme-clean");
```

Relative `roots` are resolved from `baseDirectory`; when omitted, the default root is `themes` under `baseDirectory`.
Development integrations that need to rebuild a package from an already resolved artifact should use `findThemePackageDirectoryForArtifact()` from the same Node loader boundary instead of reading `package.json#mdsTheme.dist` themselves.

## Block Extension Model

The long-term AST contract treats every semantic component as a block:

```ts
interface MdsBlock {
  type: string;
  name?: string;
  id?: string;
  attrs: Record<string, string | number | boolean>;
  slots: SlotNode[];
  children: Node[];
}
```

The same shape covers built-in semantic blocks, theme-defined components, and motion wrappers:

```mds
::: hero landing motion="fade-up" tone="dark"
# Launch faster
:::

::: data-table releases page-size=20 selectable
## Releases
:::

::: motion preset="fade-up" trigger="view" stagger=80
::: card
## One
:::
:::
```

MDS core responsibilities:

- Parse block type, optional name, slots, children, and optional attrs.
- Resolve a stable block id from the explicit name, or from the first heading/title slot when no name is provided.
- Preserve unknown block types in the AST.
- Diagnose malformed or unsafe attributes.
- Render safe fallback HTML when the theme lacks a template.

Theme responsibilities:

- Decide which blocks exist.
- Decide which attrs are meaningful.
- Implement component structure, CSS, animation, and optional progressive-enhancement JavaScript.
- Keep final output standalone HTML/CSS/JS.

Attributes are deliberately not a general HTML escape hatch. They are a compact way to call theme-defined component capabilities. Ordinary content should still prefer semantic block names and slots.

Unsafe attribute examples such as `onclick`, `onmouseover`, and `href="javascript:..."` should never become executable behavior. Parser and renderer diagnostics should flag them, and theme helpers should expose safe root attributes separately from raw author input.

### Block IDs And Markdown-Like Anchors

The optional block name is a machine-friendly id, not a display title:

```mds
::: section product-intro
# Product Intro!
:::
```

```txt
type: section
name: product-intro
id: product-intro
display title: Product Intro!
```

If no explicit name exists, renderer tooling should derive the id from the first heading or `title` slot, using a Markdown-like slug algorithm:

```txt
Product Intro! -> product-intro
产品介绍 -> 产品介绍
产品介绍 -> 产品介绍-2
```

Slugging should be deterministic and shared by parser, renderer, editor, and future formatter tooling. The recommended behavior is to strip Markdown formatting, trim whitespace, lowercase ASCII, replace whitespace with `-`, preserve Unicode letters and numbers, remove unsafe punctuation, collapse repeated separators, and de-duplicate collisions with numeric suffixes.

This avoids quoted block names such as `::: section "Product Intro!"`, which would make opener parsing and attrs ambiguous. Human-readable text belongs in headings or slots; ids belong in the optional name position or are generated from content.

### Motion As Theme Blocks

MDS does not need a first-class animation runtime.

Motion is represented with normal blocks:

```mds
::: motion preset="fade-up" trigger="view"
Content
:::
```

Or with theme-defined attrs on another block:

```mds
::: card motion="scale-in" delay=120
Content
:::
```

The selected theme decides whether to implement this through CSS keyframes, transitions, `IntersectionObserver`, Web Animations API, Motion One, GSAP, or no animation at all.

Recommended interoperable attr names for themes:

```txt
motion   preset name
trigger  load | view | hover | state
delay    milliseconds
duration milliseconds
stagger  milliseconds between children
once     boolean
```

These names are conventions, not core semantics.

## Runtime Artifact Format

### Directory Layout

Recommended:

```txt
themes/my-theme/
  theme.json
  shell.html
  style.css
  script.js
  blocks/
    page.html
    hero.html
    nav.html
    card.html
    callout.html
```

Minimal:

```txt
themes/my-theme/
  theme.json
  blocks/
    hero.html
```

### `theme.json`

```json
{
  "name": "my-theme",
  "label": "My Theme",
  "description": "A concise theme description.",
  "author": "Acme",
  "homepage": "https://example.com/my-theme",
  "preview": "preview.svg",
  "tags": ["docs", "clean"],
  "supportedBlocks": ["page", "hero", "card"],
  "css": "style.css",
  "js": "script.js",
  "head": "head.html",
  "shell": "shell.html",
  "actions": ["toggle", "open", "close"],
  "blocks": "blocks"
}
```

Fields:

```ts
interface ThemeManifest {
  name?: string;
  label?: string;
  description?: string;
  author?: string;
  homepage?: string;
  preview?: string;
  tags?: string[];
  supportedBlocks?: string[];
  css?: string | string[];
  js?: string | string[];
  head?: string | string[];
  shell?: string;
  actions?: string[];
  blocks?: string | string[] | Record<string, string>;
}
```

Rules:

- All paths are relative to the theme directory.
- Paths are canonicalized by the loader before rendering. Leading `./` segments, internal `.` segments, and repeated `/` separators are normalized away; backslashes and absolute paths are invalid, and `..` escapes are rejected.
- `name` is optional, but if present it should be non-empty. Empty or whitespace-only names are reported as non-fatal warnings and loaders fall back to the theme directory name.
- `css`, `js`, and `head` are embedded into final HTML in declared order.
- `shell` controls the final document wrapper.
- `preview` is a relative asset path used by editors, galleries, package inspection, and distribution tools.
- `label`, `description`, `author`, `homepage`, `tags`, and `supportedBlocks` are metadata only; rendering still uses actual templates and assets.
- `actions` declares command actions handled by theme JavaScript.
- `supportedBlocks` and `actions` should not contain duplicate entries. Duplicates are reported as non-fatal validation warnings. Runtime themes, registry summaries, and artifact inspection keep the first occurrence and expose stable de-duplicated capability lists.
- `blocks` declares how block templates are discovered.
- If `blocks` is omitted and `blocks/` exists, the loader treats it as `blocks: "blocks"`.

### Block Sources

Directory:

```json
{ "blocks": "blocks" }
```

Files map to block names by filename:

```txt
blocks/hero.html -> hero
blocks/card.html -> card
```

Single file:

```json
{ "blocks": "blocks.html" }
```

Multiple sources:

```json
{ "blocks": ["blocks", "overrides.html"] }
```

Later sources override earlier templates.

Explicit mapping:

```json
{
  "blocks": {
    "hero": "blocks/hero.html",
    "warning": "blocks/callout.html"
  }
}
```

This remains for compatibility and special aliases, but ordinary themes should prefer directory discovery.

### Template Format

Simple file template:

```html
<section{{ attrs }} class="hero">
  {{ children }}
</section>
```

Template file with multiple block declarations:

```html
<template data-block="note info warning danger success">
  <aside{{ attrs }} class="callout {{ type }}" role="note">
    {{ children }}
  </aside>
</template>
```

Available block variables:

```txt
{{ type }}      escaped block type
{{ name }}      escaped explicit block name, when provided
{{ id }}        escaped resolved block id value
{{ attrs }}     generated safe root attributes
{{ children }}  rendered child HTML
{{ slots }}     rendered slot HTML
{{ summary }}   escaped summary text for details-like blocks
{{ slot:name }} rendered named slot HTML
{{ attr:name }} escaped value for one block attribute
```

Template rules:

- Use `{{ attrs }}` on the root element for block ids and safe theme-facing attributes.
- Use `{{ attr:name }}` when a template needs a specific theme-defined option.
- Do not blindly serialize raw author attributes into executable browser attributes.
- Do not use an `mds-` prefix in generated classes by default.
- Prefer semantic native HTML where possible.
- Theme templates must not parse raw MDS source.

### Shell Template

```html
<!doctype html>
<html lang="{{ lang }}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{ title }}</title>
  {{ head }}
</head>
<body>
  {{ body }}
  {{ scripts }}
</body>
</html>
```

Available shell variables:

```txt
{{ title }}
{{ lang }}
{{ description }}
{{ head }}
{{ body }}
{{ scripts }}
```

## Interaction Model

MDS renders native HTML for native behavior:

- Links use `<a>`.
- Forms use `<form>`.
- Native submit/reset actions render as submit/reset buttons.

Theme JavaScript may enhance behavior using metadata:

```html
<button data-action="toggle" data-target="faq">Toggle</button>
```

Rules:

- MDS does not execute arbitrary user-defined JavaScript from documents.
- Unknown non-native actions render but warn.
- Themes declare handled actions in `theme.json#actions`.
- Applications may also provide known action names to suppress warnings.

## Development Modes

MDS supports four theme authoring modes. They all produce or directly represent the same artifact contract.

### 1. Directory Theme

Best for ordinary users and simple customization.

```txt
themes/my-theme/
  theme.json
  style.css
  blocks/
    hero.html
```

No build step required.

Workflow:

1. Copy or create `themes/my-theme`.
2. Edit `style.css`, `script.js`, or block HTML files.
3. Select it with editor preview theme, frontmatter override, or CLI `--theme`.
4. Build standalone HTML.

### 2. Single-File HTML Theme

Best for compact hand-authored themes.

```txt
themes/my-theme/
  theme.json
  blocks.html
```

```json
{ "blocks": "blocks.html" }
```

```html
<template data-block="hero">
  <section{{ attrs }} class="hero">{{ children }}</section>
</template>

<template data-block="card cards">
  <section{{ attrs }} class="{{ type }}">{{ children }}</section>
</template>
```

Workflow:

1. Keep most block templates in one `blocks.html`.
2. Use `data-block` aliases for related block types.
3. Add separate files only when a block becomes large enough to deserve isolation.

### 3. JSX-Authored Package Theme

Best for checked-in themes in this repository and small developer-authored themes.

Source:

```txt
themes/atelier/
  package.json
  src/
    theme.tsx
    style.css
    script.js
    shell.html
```

Generated artifact:

```txt
themes/atelier/
  dist/theme/
    theme.json
    style.css
    script.js
    shell.html
    blocks/*.html
```

Command:

```sh
pnpm build:theme:atelier
```

Editor and CLI resolve the package to `package.json#mdsTheme.dist` and load only the generated artifact; they do not execute TSX.

Workflow:

1. Author templates in `src/theme.tsx`.
2. Keep CSS, JS, and shell under `src/` and declare them in package metadata.
3. Run the theme builder.
4. Test or package the generated `dist/theme` artifact.

### 4. Package Theme

Best for professional theme development using frontend ecosystem tools.

```txt
my-theme/
  package.json
  src/
    theme.tsx
    components/
      Button.tsx
      Surface.tsx
    style.css
    script.ts
  dist/
    theme/
      theme.json
      style.css
      script.js
      blocks/*.html
```

`package.json`:

```json
{
  "name": "@acme/mds-theme-clean",
  "type": "module",
  "mdsTheme": {
    "source": "./src/theme.tsx",
    "dist": "./dist/theme",
    "assets": {
      "css": "./src/style.css",
      "js": "./src/script.ts",
      "shell": "./src/shell.html",
      "preview": "./src/preview.svg"
    }
  },
  "scripts": {
    "build": "mds-theme build"
  }
}
```

The builder validates this config before loading theme source. `mdsTheme.source`, `mdsTheme.dist`, `mdsTheme.assets.shell`, and `mdsTheme.assets.preview` must be strings. `mdsTheme.assets.css`, `mdsTheme.assets.js`, and `mdsTheme.assets.head` must be strings or string arrays. All package paths must be relative POSIX paths inside the package directory.

Build:

```sh
pnpm build:theme path/to/theme-package
```

Repository example:

```sh
pnpm build:theme:default
pnpm build:theme:rich
pnpm build:theme:folio
pnpm build:theme:atelier
pnpm build:theme:clarity
mds-theme inspect ./themes/clarity
```

`themes/default`, `themes/rich`, `themes/folio`, and `themes/atelier` all separate authoring source under `src/` from the complete generated artifact under `dist/theme`. They compose explicit primitive packs and own only the templates that need theme-specific structure or behavior. Rich is the official broad-content theme: it composes all 63 shared primitives and owns the 38 higher-level data, documentation, guidance, gallery, and conversation names.

`themes/clarity` keeps source files under `src/`, imports a local component module, bundles CSS imports, bundles `src/script.ts` to artifact JavaScript, and commits the built `dist/theme` artifact. Runtime loading resolves the package directory to `package.json#mdsTheme.dist`.

`themes/canvas` exercises the React SDK and Tailwind v4 pipeline. It uses local shadcn-style components, `@mds-crate/theme-sdk-react`, `mdsTheme.pipeline.css = "tailwind"`, and still emits a plain artifact under `dist/theme`.

Current package themes can use the MDS JSX runtime, the HTML SDK, or the React SDK. Future phases can add Preact, Vue, Sass, and richer bundler adapters without changing the artifact format.

Workflow:

1. Develop with normal package ergonomics.
2. Import local components or dependency components in source files.
3. Run `mds-theme build`.
4. Test the built artifact with editor and CLI.
5. Publish or copy the artifact, not source-only files, for non-developer users.

## JSX Authoring Contract

The current JSX helper lives under `@mds-crate/theme-loader/jsx`.

```tsx
/** @jsxImportSource @mds-crate/theme-loader */
import { Content, defineJsxTheme, Root, Slot } from "@mds-crate/theme-loader/jsx";

export default defineJsxTheme({
  name: "clean",
  actions: ["toggle"],
  blocks: {
    hero: (block) => (
      <Root block={block} className="hero">
        <div>
          <Slot block={block} name="title" />
        </div>
        <Content block={block} />
      </Root>
    ),
    "note warning": (block) => (
      <Root block={block} as="aside" className={`callout ${block.type}`}>
        <Content block={block} />
      </Root>
    )
  }
});
```

Props:

```ts
interface ThemeTemplateProps {
  type: string;
  name: string;
  id: string;
  attrs: RawHtml;
  blockAttrs: Record<string, string | number | boolean>;
  children: RawHtml;
  slots: RawHtml;
  summary: string;
  attr(name: string): string;
  slot(name: string): RawHtml;
}
```

The preferred helper API is:

- `Root`: render the block root element and preserve generated attributes such as `id`.
- `Content`: render the default block body.
- `Slots`: render all slots.
- `Slot`: render one named slot.
- `attr(name)`: read one escaped block attribute for theme-defined component options.

Low-level placeholders such as `rawAttrs`, `children`, `slots`, and `slot(name)` are still available for advanced templates. They preserve template placeholders and are intentionally not escaped by the JSX renderer.

## HTML SDK Authoring Contract

The lightweight HTML adapter lives under `@mds-crate/theme-sdk-html`.

```ts
import { defineHtmlTheme, html } from "@mds-crate/theme-sdk-html";

export default defineHtmlTheme({
  name: "html-clean",
  blocks: {
    hero: (block) => html`<section${block.attrs} class="hero">${block.children}</section>`
  }
});
```

The adapter is a source-authoring layer only. It converts tagged HTML template blocks into the same `ThemeSourceInput` consumed by `@mds-crate/theme-loader`.

Rules:

- `html` escapes primitive interpolations by default.
- Existing MDS placeholders such as `block.attrs` and `block.children` are raw values and remain placeholders in the generated template.
- `unsafeHtml(value)` exists for explicit author-controlled raw fragments.
- `defineHtmlTheme`, `createThemeSourceFromHtmlTheme`, and `createThemeFromHtmlTheme` mirror the JSX authoring flow.

## Package Builder Design

`@mds-crate/theme-builder` is the development-time builder.

MVP responsibilities:

- Read `package.json#mdsTheme`.
- Import TS/TSX `source` through `tsx` and native JS source through Node ESM.
- Convert JSX block components to HTML templates.
- Copy declared CSS, JS, head, and shell assets.
- Bundle CSS imports to plain artifact CSS with esbuild.
- Bundle TypeScript JS assets to plain artifact JavaScript with esbuild.
- Copy declared preview assets.
- Compile Tailwind v4 CSS through PostCSS when `mdsTheme.pipeline.css` is `tailwind`.
- Validate the generated artifact before writing.
- Write `.mds-theme-build.json` with source, output, artifact files, and template/block metadata.
- Write a standard theme artifact to `dist`.
- Inspect built artifacts without executing source files.
- Strip development metadata such as `.mds-theme-build.json` when packing a clean distributable artifact.

Non-MVP responsibilities:

- Run Sass, Lightning CSS, or CSS Modules.
- Compile Preact/Vue components.
- Package or publish themes.

## React SDK Authoring Contract

The React adapter lives under `@mds-crate/theme-sdk-react`.

```tsx
import React from "react";
import { Content, Root, Slot, defineReactTheme } from "@mds-crate/theme-sdk-react";
import { Button } from "./components/Button";

export default defineReactTheme({
  name: "react-clean",
  blocks: {
    hero: (block) => (
      <Root block={block} className="rounded-xl border bg-card text-card-foreground">
        <Button className="bg-primary px-4 py-2 text-primary-foreground">
          <Slot block={block} name="title" />
          <Content block={block} />
        </Button>
      </Root>
    )
  }
});
```

The adapter renders React elements to template HTML during the theme build and returns `ThemeSourceInput`. This keeps `@mds-crate/theme-builder` generic: it can load any source SDK that exports `ThemeSourceInput`, while still supporting the earlier JSX definition shape.

Rules:

- React is a development-time authoring dependency, not an MDS runtime dependency.
- `Root` preserves generated block attributes such as `id`.
- `Content`, `Slots`, and `Slot` preserve MDS template placeholders.
- shadcn/ui-style components are supported as ordinary local React components.
- Current TSX package sources should import `React` explicitly when using JSX through the builder.

## Tailwind Pipeline Contract

Tailwind is configured through `package.json#mdsTheme.pipeline.css`.

```json
{
  "mdsTheme": {
    "source": "./src/theme.tsx",
    "pipeline": {
      "css": "tailwind"
    },
    "assets": {
      "css": "./src/style.css"
    }
  }
}
```

The CSS entry can use Tailwind v4's PostCSS flow:

```css
@import "tailwindcss";
@source "./theme.tsx";
@source "./components/**/*.tsx";
```

The builder runs PostCSS with `@tailwindcss/postcss`, writes plain artifact CSS, and records the CSS entry in build inputs. The final renderer and editor only consume the built CSS file.

## Package Resolution

MVP loading:

```sh
mds build page.mds --theme ./themes/my-theme
```

Future package loading:

```sh
mds build page.mds --theme @acme/mds-theme-clean
```

Resolution plan:

1. If `--theme` is a path, load it as a theme artifact directory.
2. If `--theme` is a package name, resolve package.json.
3. Read `package.json#mdsTheme.dist`.
4. Load that directory as the artifact.
5. Do not execute `source` during normal rendering.

## Editor Integration

Current editor behavior:

- Lists theme artifacts from `themes/`.
- Loads serialized `ThemeSource` through the dev server.
- Preserves `ThemeValidationError` diagnostics across the dev-server HTTP boundary.
- Separates diagnostics by source (`builder`, `theme`, `parser`, `renderer`) before displaying them.
- Renders preview in an iframe.

Package theme dev mode:

- Watch package source files. Manual `Build Theme` registers the package input files with the Vite watcher.
- Run `mds-theme build` on change. The dev server exposes a package build endpoint that returns serialized builder diagnostics and sends HMR build events after watched inputs change. Browser code validates HMR build events with the same editor build contract before using them.
- Inspect built artifacts through the dev server. The editor exposes a theme inspection endpoint backed by `inspectThemeArtifact()` and validates the response with the same serialized inspection contract as `mds theme inspect --json`.
- Reload the artifact through the same `ThemeRegistry`. Manual build and watched rebuilds reload the current theme after a successful build.
- Show build result context. Manual build displays the most recent output file count, source file, output directory, and input count.
- Surface builder errors in the editor diagnostics panel. The browser provider can restore builder diagnostics without importing `@mds-crate/theme-builder`, and the editor maps them to the `builder` diagnostic source.
- Never import raw package source into the editor UI.

## Validation And Diagnostics

Needed validation:

- `theme.json` schema.
- Unknown manifest fields warning.
- Invalid `ThemeSource.files` paths or non-text file contents error.
- Missing asset path error.
- Reserved `theme.json` references in CSS, JS, head, shell, preview, and block sources error.
- Duplicate normalized asset references warning.
- Missing block source warning.
- Duplicate block template warning with source precedence, using the same filename fallback rule as runtime template loading.
- Invalid `data-block` names warning.
- Missing declared action handler warning remains renderer-level.
- Package builder error with file path and stage.

Diagnostics should be structured, not plain thrown strings, so editor and CLI can present them consistently.

Current API:

```ts
import {
  ThemeValidationError,
  assertValidThemeSource,
  validateThemeManifest,
  validateThemeSource
} from "@mds-crate/theme-loader";
```

`validateThemeSource` returns structured diagnostics:

```ts
interface ThemeDiagnostic {
  severity: "error" | "warning";
  code: string;
  message: string;
  field?: string;
  path?: string;
  block?: string;
}
```

`createThemeFromSources` calls `assertValidThemeSource` before creating `HtmlTheme`. Errors throw `ThemeValidationError`; warnings do not block rendering.

Registries also expose `loadThemeWithDiagnostics(ref)`, which returns both the loaded theme and non-fatal diagnostics. Editor and CLI integrations should use this path so users can see theme warnings without losing preview/build output. The editor dev server serializes theme validation failures as JSON diagnostics, and the browser provider restores them as `ThemeValidationError`.
If a theme ref resolves to a package whose artifact has not been built yet, file registries throw `ThemeValidationError` with a structured `missing-theme-manifest` diagnostic instead of leaking a raw filesystem error. Malformed `theme.json` files, including JSON values that parse but are not valid manifest objects, are reported as structured `invalid-theme-manifest` diagnostics. Direct directory APIs such as `loadThemeDirectory()` and `readThemeDirectory()` use the same error type for manifest load failures. This keeps CLI, editor, and lower-level tooling on the same diagnostics path as bad artifact files.
Unknown theme refs are reported as structured `unknown-theme` diagnostics by both memory and file registries. Malformed package `package.json` files and invalid `package.json#mdsTheme.dist` values are reported as structured `invalid-theme-package` diagnostics during file theme resolution. This applies to `readThemeRef()`, regular registry `loadTheme()`, and `loadThemeWithDiagnostics()`.
Editor-side and dev-server theme preflight checks should use the same `unknown-theme` diagnostic code instead of degrading to generic load or HTTP text errors.

`@mds-crate/theme-loader` also exposes `formatThemeDiagnostic()`. CLI surfaces should use this shared formatter so `field`, `path`, and `block` details are printed consistently.
`ThemeValidationError.message` uses the same formatter, so logs and HTTP error payloads keep the same location details as CLI output.
Runtime rendering and validation share the same block-template parser for `<template data-block>` aliases and filename fallback behavior.

Package builder failures use `ThemeBuildError` from `@mds-crate/theme-builder`. This error stays in the development-time builder layer and includes:

- `stage`: `read-package`, `read-config`, `load-source`, `merge-assets`, `resolve-artifact`, `read-artifact`, `validate-artifact`, or `write-artifact`.
- `field`: the package config or generated artifact field involved when known.
- `filePath`: the source, asset, package, or output path involved when known.
- `block`: the affected block name when a JSX block component, template mapping, or validation diagnostic can identify it.

For example, an invalid `mdsTheme.source` type should report `stage: "read-config"`, `field: "mdsTheme.source"`, and the package.json path. A missing CSS asset should report `stage: "merge-assets"`, `field: "mdsTheme.assets.css"`, and the concrete missing file path. A JSX block component that throws while rendering should report `stage: "load-source"`, `field: "mdsTheme.source"`, the source file path, and the block name. A generated artifact validation failure should report `stage: "validate-artifact"` and the theme source file that produced the invalid artifact. Inspect and pack failures use the same error type with `resolve-artifact` or `read-artifact`; pack also uses `validate-artifact` and `write-artifact` for blocking copy failures.
`themeBuildErrorToDiagnostics()` converts builder failures into serializable diagnostics with `stage`, `field`, `path`, `block`, and optional validation details. CLI output and editor package-theme dev mode should use this formatter instead of parsing `Error.message`.
The browser editor should consume serialized builder diagnostics and HMR build events by shape. It should not import or execute `@mds-crate/theme-builder` in the browser runtime.

## Security And Trust

Runtime:

- Only loads artifact files.
- Does not execute package source.
- Embeds theme JS into generated standalone HTML.

Development:

- Package builders execute source code and dependency code.
- That is equivalent to running a normal npm build script.
- Theme packages should be treated as trusted developer inputs.

Browser editor:

- Should not read arbitrary local paths without user action.
- Should use uploaded/serialized `ThemeSource` or dev-server endpoints.
- Theme JS runs inside preview iframe, not the editor shell.

## Versioning

Theme manifests may declare the artifact contract version:

```json
{
  "version": 1,
  "name": "my-theme"
}
```

Compatibility policy:

- Version 1 supports directory themes and block source discovery.
- Explicit block mapping remains supported.
- Omitting `version` remains supported for early artifacts.
- Future versions can add optional capabilities but should keep v1 artifacts loadable.

## Implementation Roadmap

### Phase 0: Stabilize Current MVP

Status: completed.

- Keep `themes/default` and `themes/folio` as simple file-authored package themes.
- Keep `themes/atelier` as the JSX-authored package example.
- Keep source and generated artifacts separate so shared-pack output is never mistaken for theme-owned implementation.
- Keep editor and CLI loading artifact directories.

Acceptance:

- `pnpm check`
- `pnpm test`
- `pnpm build`
- `pnpm build:theme:atelier`

### Phase 1: Theme Artifact Validation

Status: completed. Artifact validation APIs are implemented in `@mds-crate/theme-loader`.

Add schema validation for `theme.json` and block sources.

Tasks:

- Add `validateThemeManifest`. Done.
- Add structured theme diagnostics. Done.
- Warn on unknown manifest fields. Done.
- Validate artifact file paths and non-text file contents. Done.
- Validate block source references. Done.
- Validate duplicate normalized asset references. Done.
- Validate duplicate block registrations. Done.
- Validate action names. Done.
- Expose diagnostics from file registry and source factory. Done.
- Report unbuilt package artifacts as structured `missing-theme-manifest` diagnostics. Done.
- Report malformed `theme.json` as structured `invalid-theme-manifest` diagnostics. Done.

Acceptance:

- Bad themes produce readable CLI/editor diagnostics.
- Valid existing themes pass validation.

### Phase 2: Builder Hardening

Status: completed. The builder has staged errors with field/file context, generated-output cleanup, nested asset copying, package-style examples, build metadata inspection, JSON CLI contracts, and editor dev-server diagnostics.

Turn `@mds-crate/theme-builder` from MVP into a reliable development tool.

Tasks:

- Support `mds-theme build`. Done.
- Support `mds-theme watch`. Done. CLI watch stays alive until SIGINT/SIGTERM, while the controller still exposes `ready` for the initial build.
- Support output cleanup rules. Done for generated dist output and retained for legacy in-place packages.
- Support asset copying with nested paths. Done.
- Support TS/TSX source loading from the built `mds-theme` CLI. Done.
- Support local component imports in TSX theme source. Done, including `themes/clarity`.
- Validate generated artifacts before writing. Done.
- Print non-fatal validation warnings from `mds-theme build`. Done.
- Support sourcemap/debug metadata for generated templates. Basic deterministic build metadata done, including package input files and generated template mappings.
- Report malformed, schema-invalid, or stale build metadata during artifact inspection without blocking runtime loading. Done.
- Add snapshot tests for generated artifacts. Basic artifact file-list and metadata snapshot test done.

Acceptance:

- A package theme can rebuild repeatedly without stale blocks. Covered by builder cleanup and watch tests.
- `mds-theme watch` keeps running after the initial build and exits cleanly on shutdown signals. Covered by builder CLI watch tests.
- Builder errors name the failing file and phase. Done for package config, source load, asset merge, validation, and artifact write stages.

### Phase 3: Package Theme Resolution

Status: completed. Node file registries can resolve package-style theme directories and scoped package names to built artifacts.

Let CLI/editor consume built package themes by package name.

Tasks:

- Add package resolution to `createFileThemeRegistry`. Done.
- Read `package.json#mdsTheme.dist`. Done.
- Load resolved artifact directory. Done.
- Add tests for local package refs. Done.

Acceptance:

- `--theme @scope/theme-name` loads built artifact. Covered by CLI integration test.
- Source files are not executed during render. Covered by package resolution loading only `mdsTheme.dist` and by `themes/clarity`.

### Phase 4: Ecosystem Adapters

Status: completed for the current React/HTML adapter milestone. `@mds-crate/theme-sdk-html` covers tagged-template authoring, and `@mds-crate/theme-sdk-react` covers React/shadcn-style component authoring without adding a framework runtime to the final artifact.

Add adapters for common frontend ecosystems.

Candidates:

- `@mds-crate/theme-sdk/react`
- `@mds-crate/theme-sdk-react`. Done.
- `@mds-crate/theme-sdk/preact`
- `@mds-crate/theme-sdk-html`. Done.

React/Preact adapter behavior:

- Let authors import component packages.
- Render block components to template strings.
- Preserve raw MDS placeholders.
- Avoid shipping React to the final artifact unless theme JS explicitly chooses it.

Acceptance:

- A package theme can import component functions. Covered by the HTML SDK, React SDK, and package-theme local component tests.
- Generated artifact remains plain HTML/CSS/JS. Covered by SDK conversion to `ThemeSourceInput` and builder artifact tests.
- Preact remains explicitly separate follow-up work so the runtime contract does not absorb framework dependencies.

### Phase 5: CSS And JS Pipelines

Status: completed for the current builder milestone. CSS imports and TypeScript script assets are bundled with esbuild. Tailwind v4 CSS can run through PostCSS when enabled per package. Lightning CSS, Sass, and CSS Modules remain future optional transforms.

Integrate mature build tools instead of hand-rolling.

Implemented:

- esbuild for fast CSS and TS/JS bundling. Done for CSS `@import`, TypeScript `mdsTheme.assets.js` entries, and multi-entry CSS/JS asset lists.
- PostCSS with `@tailwindcss/postcss` for Tailwind v4 package themes. Done behind `mdsTheme.pipeline.css = "tailwind"`.

Future candidates:

- Vite for richer package dev-server integration.
- Lightning CSS for CSS transforms.
- Sass and CSS Modules.

Acceptance:

- Theme package can import CSS files. Done for local CSS `@import`; CSS modules remain future work.
- Theme package can bundle TypeScript script files. Done.
- Theme package can generate Tailwind utility CSS from source class names. Done for Tailwind v4 PostCSS pipeline.
- Artifact still has embedded or referenced plain CSS/JS.

### Phase 6: Theme Distribution

Status: completed for the current artifact distribution milestone. Artifact inspection, JSON contracts, plain artifact packing, metadata, package naming conventions, and main CLI delegation are implemented.

Support installable and shareable themes.

Tasks:

- Define package naming conventions. Done.
- Add `mds theme pack`. Done; `mds-theme pack` remains the dedicated builder binary. The output directory is required, recreated, and cannot overlap the source artifact.
- Add artifact inspection command. Done for `mds theme inspect` and `mds-theme inspect`.
- Add theme metadata such as preview image, author, description, supported blocks. Basic manifest metadata is implemented.

Package naming conventions:

- Public npm package themes should use `mds-theme-*`, for example `mds-theme-clean`.
- Scoped npm package themes should use `@scope/mds-theme-*`, for example `@acme/mds-theme-clean`.
- Repository-local themes can use any directory name under `themes/`.
- Package names are distribution metadata. Runtime loading still resolves `package.json#mdsTheme.dist` and consumes only the built artifact.

Acceptance:

- Theme can be published as npm package and consumed by package name after build. Covered by package-theme resolution and CLI integration tests.
- Theme can also be copied as plain artifact directory. Done for `mds-theme pack`.

## Immediate Next Steps

1. Implement block attributes in AST and parser.
2. Add renderer diagnostics for malformed, curly, or unsafe attributes.
3. Expose `attr(name)` and safe root attrs in file templates, HTML SDK, JSX runtime, and React SDK.
4. Implement a `motion` block in `themes/canvas`.
5. Let Canvas components consume simple motion attrs such as `motion`, `delay`, and `stagger`.
6. Add examples for custom components, motion wrappers, and advanced attrs.
7. Keep `docs/THEMES.md` as the short user guide, [BLOCKS_AND_MOTION.md](./BLOCKS_AND_MOTION.md) as the extension model, and this document as the architecture reference.
