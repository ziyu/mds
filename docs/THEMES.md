# MDS Themes

MDS themes are plain directories that render MDS documents into standalone HTML. A theme can be hand-written as files, or generated from a developer package, but MDS always loads the built artifact:

```txt
theme.json
style.css
script.js
shell.html
blocks/
  page.html
  hero.html
  card.html
```

For the full architecture, artifact contract, diagnostics model, and roadmap, see [THEME_DESIGN.md](./THEME_DESIGN.md).
For the block extension model, optional block attributes, and motion-as-block design, see [BLOCKS_AND_MOTION.md](./BLOCKS_AND_MOTION.md).
For the shared blocks layer that lets multiple themes reuse common block templates and override them, see [BLOCK_LAYER.md](./BLOCK_LAYER.md).
For the shared component vocabulary and Canvas component roadmap, see [COMPONENTS.md](./COMPONENTS.md).

## Use A Theme

Place theme folders under `themes/`:

```txt
themes/
  default/
  my-theme/
```

Use a named theme in frontmatter:

```mds
---
title: Demo
theme: my-theme
---
```

Or pass a theme from the CLI:

```sh
mds build ./content/index.mds --theme ./themes/my-theme
```

Named themes are resolved from theme roots such as `themes/`. Path refs such as `./themes/my-theme` load that directory, or the built artifact declared by `package.json#mdsTheme.dist` when the path points to a package-style theme.

## Create A Package Theme

Create the default HTML SDK template:

```sh
mds theme init ./my-theme
cd ./my-theme
pnpm install
pnpm build
pnpm inspect
```

Create a React-authored template and choose the npm package name:

```sh
mds theme init ./my-react-theme \
  --template react \
  --name @acme/mds-theme-react
```

Use the lightweight custom JSX runtime without React:

```sh
mds theme init ./my-jsx-theme --template jsx
```

The target directory must be empty. The scaffold writes a package source, starter CSS, preview, example document, TypeScript configuration, smoke command, and build scripts. HTML authoring is the default because it has the smallest toolchain; JSX and React remain explicit build-time options.

Generated packages are artifact-first:

- `pnpm build` writes the complete runtime artifact to `dist/theme`;
- `pnpm inspect` validates that artifact without executing source;
- `pnpm pack:artifact` copies a clean artifact without development metadata;
- npm `files` only includes `dist/theme`, so TypeScript/React source is not installed by theme consumers;
- `prepack` rebuilds the artifact before `npm pack` or `npm publish`.

Review the generated name, version, license, repository metadata, and npm access policy before publishing.

## Simple Theme

A minimal theme only needs `theme.json` and block templates:

```txt
themes/my-theme/
  theme.json
  blocks/
    hero.html
    card.html
```

```json
{
  "name": "my-theme",
  "blocks": "blocks"
}
```

If `blocks` is omitted and a `blocks/` directory exists, the loader treats it as `blocks: "blocks"`.

## `theme.json`

Common fields:

```json
{
  "version": 1,
  "name": "my-theme",
  "label": "My Theme",
  "description": "Readable standalone pages.",
  "preview": "preview.svg",
  "tags": ["docs"],
  "supportedBlocks": ["page", "hero", "card"],
  "css": "style.css",
  "js": "script.js",
  "shell": "shell.html",
  "actions": ["toggle", "lead.submit"],
  "blocks": "blocks"
}
```

Rules:

- Paths are relative POSIX paths inside the theme directory. Leading `./`, internal `.` segments, and repeated `/` separators are normalized away.
- `version` is optional. When present, use `1`.
- `theme.json` is reserved for the manifest and must not appear in `files`.
- `actions` declares commands handled by the composed artifact. Built-in primitive actions normally come from shared block packs; theme-owned and application-owned actions must remain explicit. The field does not define application logic.
- `actions` and `supportedBlocks` should be unique. Duplicates produce warnings and the first entry wins.
- Generated HTML should use normal class names such as `page`, `hero`, and `card`. Themes should not add an `mds-` prefix unless they intentionally want one.
- Theme-owned components are ordinary block templates. A custom component such as `kanban-column` or a motion primitive such as `motion` is registered the same way as `hero` or `card`.
- Shared block packs compose before theme-owned block templates. A theme can reuse common blocks while overriding selected templates with its own `blocks` source.

## Block Templates

A block template maps a semantic MDS block to HTML:

```html
<section{{ attrs }} class="{{ type }}">
  {{ children }}
</section>
```

Common variables:

```txt
{{ type }}      escaped block type
{{ name }}      escaped explicit block name, when provided
{{ id }}        escaped resolved block id value
{{ attrs }}     generated safe root attributes
{{ children }}  rendered child HTML
{{ slots }}     rendered slot HTML
{{ summary }}   escaped summary text for details-like blocks
{{ attr:name }} escaped value for one block attribute
{{ attr:name:fallback }} escaped value, or a literal fallback when absent
{{ optional:name:html-name }} complete escaped HTML attribute when present
{{ bool:name }} native boolean HTML attribute when truthy
```

`optional` and `bool` are intended for pack-owned native controls. They only emit safe attribute names, values are escaped, and event attributes such as `oninput` are rejected. `{{ attrs }}` remains the root metadata bridge and emits `data-attr-*`; use the explicit native placeholders only when the browser must interpret the value itself.

Prefer `{{ attrs }}` on the root element because it preserves generated attributes such as resolved ids and safe theme-facing block attributes.

Block ids follow Markdown-like anchors. If an author writes `::: section product-intro`, the explicit name becomes the id. If no name is provided, the renderer can derive an id from the first heading or `title` slot and de-duplicate it:

```mds
::: section
# Product Intro!
:::
```

```txt
Product Intro! -> product-intro
```

Theme templates should use `{{ id }}` or `{{ attrs }}` for anchors. Human-readable titles should come from rendered content or slots, not from `{{ name }}`.

A file without `<template data-block>` uses its filename as the block type:

```txt
blocks/hero.html -> hero
blocks/card.html -> card
```

A file can also define multiple aliases:

```html
<template data-block="note info warning">
  <aside{{ attrs }} class="callout {{ type }}" role="note">
    {{ children }}
  </aside>
</template>
```

`blocks` also accepts a single template file, multiple sources, or an explicit map:

```json
{ "blocks": "blocks.html" }
```

```json
{ "blocks": ["blocks", "overrides.html"] }
```

```json
{
  "blocks": {
    "hero": "blocks/hero.html",
    "warning": "blocks/callout.html"
  }
}
```

Later sources override earlier templates.

## Block Attributes

Block attributes are an advanced authoring feature. They let a theme expose controlled component variants without turning MDS into HTML or JSX.

```mds
::: hero landing motion="fade-up" tone="dark"
# Launch faster
:::
```

Themes can consume those attributes:

```html
<section{{ attrs }} class="hero hero-{{ attr:tone }}" data-motion="{{ attr:motion }}">
  {{ children }}
</section>
```

Guidelines:

- Prefer semantic block names and slots for ordinary content.
- Use attributes for compact theme-defined options such as `variant`, `tone`, `motion`, `delay`, or `columns`.
- Implement only the block's declared semantics. Do not manufacture visible labels, value summaries, metadata, actions, cards, or layout wrappers from available attributes.
- Compose richer presentation through Markdown, outer blocks, or declared slots instead of hiding it inside an atomic primitive.
- Do not use curly attribute syntax.
- Do not use event-handler attributes such as `onclick`.
- Do not use attributes to embed JavaScript or large content payloads.

## Motion Blocks

Motion syntax remains declarative. The shared motion pack should own portable trigger lifecycle, reduced-motion handling, timing attributes, and state hooks; themes own the visible preset, easing, transforms, keyframes, and any theme-specific staging.

```mds
::: motion preset="fade-up" trigger="view" stagger=80
::: card
## One
:::

::: card
## Two
:::
:::
```

A theme can render `motion` as a wrapper with CSS variables and data attributes:

```html
<div{{ attrs }} class="motion" data-motion="{{ attr:preset }}" data-trigger="{{ attr:trigger }}">
  {{ children }}
</div>
```

Theme CSS decides what the selected preset looks like. A theme may provide a specialized motion implementation, but it must preserve the shared trigger and reduced-motion contract. The generated page remains standalone HTML.

## Shell Template

`shell.html` controls the complete standalone HTML document:

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

Shell variables:

```txt
{{ title }}        escaped document title
{{ lang }}         escaped document language
{{ description }}  escaped document description
{{ head }}         generated head HTML, including CSS when enabled
{{ body }}         rendered MDS body HTML
{{ scripts }}      generated script tags
```

CSS and JavaScript are embedded into the generated HTML, so the final output can be opened or published as a standalone file.

## Package Themes

Package-style themes are for developers who want TypeScript, JSX, local components, npm dependencies, CSS imports, or script bundling. The package is a development container; MDS still consumes the built artifact.

Package themes may compose shared block packs before their own templates:

```json
{
  "mdsTheme": {
    "source": "./src/theme.json",
    "dist": "./dist/theme",
    "blockPacks": [
      "@mds-crate/blocks/foundation",
      "@mds-crate/blocks/media",
      "@mds-crate/blocks/motion"
    ],
    "blockOverrides": [
      "blocks/hero.html",
      "blocks/card.html"
    ]
  }
}
```

`blockPacks` accepts the named `@mds-crate/blocks/*` primitive packs or the `@mds-crate/blocks/foundation` alias. `foundation` contains core layout, display, navigation, controls, forms, interactive containers, and menus; `media` and `motion` are explicit additions. The shared layer contains 64 blocks across nine packs and deliberately excludes data systems, documentation layouts, guided sequences, galleries, and conversation UI. Those higher-level patterns belong to themes such as `@mds-crate/theme-rich` or to application-owned extensions.

Packs contain reusable structural implementations, not just type declarations. They may contribute de-duplicated CSS and progressive-enhancement JavaScript; those assets are emitted before the theme's own assets so the theme can override presentation while retaining portable behavior. A theme normally keeps templates only for theme-specific blocks or declared structural variations that preserve the shared semantics and runtime hooks. `blockOverrides` lists that theme-owned subset relative to the source manifest; the builder composes packs first and overrides second, then writes the complete runtime artifact to `dist/theme`. Build metadata records selected packs and final template provenance, and `mds theme inspect` reports both.

### Theme Responsibility Boundary

A theme changes expression, not primitive meaning. Shared packs own native structure, ARIA, built-in action state, keyboard and focus rules, overlay safety, menu geometry, and other behavior that must survive a theme switch. Themes own tokens, typography, color, spacing, responsive composition, decorative surfaces, and visual motion presets.

Theme JavaScript is appropriate for a theme-owned extension. It should not copy the state machine for a shared toggle, tabs, accordion, carousel, dialog, drawer, menu, or calendar. When a theme overrides shared markup, it must preserve the stable runtime hooks required by the pack and pass the theme conformance suite described in [BLOCK_LAYER.md](./BLOCK_LAYER.md#theme-conformance-contract).

```txt
my-theme/
  package.json
  src/
    theme.tsx
    style.css
    script.ts
  dist/
    theme/
      theme.json
      style.css
      script.js
      blocks/
        hero.html
```

Declare the package theme in `package.json`:

```json
{
  "type": "module",
  "mdsTheme": {
    "source": "./src/theme.tsx",
    "dist": "./dist/theme",
    "pipeline": {
      "css": "tailwind"
    },
    "assets": {
      "css": "./src/style.css",
      "js": "./src/script.ts",
      "shell": "./src/shell.html",
      "preview": "./src/preview.svg"
    }
  }
}
```

Build, watch, inspect, and pack:

```sh
mds theme build ./themes/light
mds theme watch ./themes/light
mds theme inspect ./themes/light
mds theme pack ./themes/light ./dist/light-theme
```

The dedicated builder binary exposes the same commands:

```sh
mds-theme build ./themes/light
mds-theme inspect ./themes/light
```

Package naming conventions for shareable themes:

- Public npm themes should use `mds-theme-*`, for example `mds-theme-clean`.
- Scoped npm themes should use `@scope/mds-theme-*`, for example `@acme/mds-theme-clean`.
- Local folders under `themes/` can use any readable directory name.

`inspect` reads the built artifact without executing package source. It prints metadata, runtime files, development files, block coverage, assets, actions, and validation diagnostics.
Use `--json` when another tool needs the same build, inspection, or packing contract:

```sh
mds theme build ./themes/light --json
mds-theme build ./themes/light --json
mds theme inspect ./themes/light --json
mds-theme inspect ./themes/light --json
mds theme pack ./themes/light ./dist/light-theme --json
mds-theme pack ./themes/light ./dist/light-theme --json
```

Successful JSON builds print the `PackageThemeBuildResult` object. If building fails, JSON builds print `{ "diagnostics": [...] }` and exits with code `1`.

Successful JSON inspection prints the `ThemeArtifactInspection` object. If the artifact cannot be resolved or read, JSON inspection prints `{ "diagnostics": [...] }` and exits with code `1`.

`pack` writes a clean artifact directory for sharing. It strips package source files and development metadata such as `.mds-theme-build.json`.
Successful JSON packing prints the `ThemeArtifactPackResult` object. If packing fails, JSON packing prints `{ "diagnostics": [...] }` and exits with code `1`.

### CSS Pipeline

Package themes use esbuild for CSS by default. Set `mdsTheme.pipeline.css` to `tailwind` when the CSS entry should run through Tailwind v4's PostCSS plugin.

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

```css
@import "tailwindcss";
@source "./theme.tsx";
@source "./components/**/*.tsx";
```

Tailwind runs only during theme build. The artifact still contains plain CSS referenced by `theme.json`.

## JSX Authoring

JSX is optional. It is a source-authoring layer that generates the same file-based theme artifact.

```tsx
/** @jsxImportSource @mds-crate/theme-loader */
import { Content, Root, Slot, defineJsxTheme } from "@mds-crate/theme-loader/jsx";

export default defineJsxTheme({
  name: "jsx-demo",
  css: ".hero { color: red; }",
  actions: ["toggle"],
  blocks: {
    hero: (block) => (
      <Root block={block} className="hero">
        <Slot block={block} name="title" />
        <Content block={block} />
      </Root>
    )
  }
});
```

Use `Root` for the block root element. Use `Content`, `Slots`, and `Slot` for body and slot placeholders.

Repository examples:

- `themes/default`, `themes/light`, `themes/dark`, and `themes/rich`: publishable file-authored package themes with source under `src/`, all shared block packs, browser-safe module exports, and artifacts under `dist/theme`.
- Light and Dark are fixed-palette appearance themes. They keep the portable 64-block contract while owning distinct typography, color, spacing, responsive composition, and visible interaction states.
- Rich adds the official higher-level data, documentation, guidance, gallery, and conversation vocabulary.
- `themes/canvas`: private React SDK package theme with a Tailwind v4 pipeline and shadcn-style local components. Run `pnpm build:theme:canvas`.

## HTML SDK Authoring

`@mds-crate/theme-sdk-html` is a lightweight adapter for package themes that prefer tagged HTML templates over JSX. It still produces the same `theme.json` and `blocks/*.html` artifact.

```ts
import { defineHtmlTheme, html } from "@mds-crate/theme-sdk-html";

export default defineHtmlTheme({
  name: "html-demo",
  css: ".hero { color: red; }",
  blocks: {
    hero: (block) => html`<section${block.attrs} class="hero">${block.children}</section>`
  }
});
```

Primitive interpolations are escaped by default. Use `unsafeHtml(value)` only for author-controlled HTML fragments or MDS placeholders that are already represented as raw values.

## React SDK Authoring

`@mds-crate/theme-sdk-react` is for theme developers who want normal React component composition or shadcn-style local components. React renders at build time to MDS block templates; the final artifact does not ship React unless your own theme JavaScript imports it.

```tsx
import React from "react";
import { Content, Root, defineReactTheme } from "@mds-crate/theme-sdk-react";
import { Button } from "./components/Button";

export default defineReactTheme({
  name: "react-demo",
  blocks: {
    hero: (block) => (
      <Root block={block} className="rounded-xl border bg-card text-card-foreground">
        <Button className="bg-primary px-4 py-2 text-primary-foreground">
          <Content block={block} />
        </Button>
      </Root>
    )
  }
});
```

For the current builder path, TSX source should import `React` explicitly. Component files can be copied from shadcn/ui or written locally, and Tailwind classes should be included through the Tailwind CSS pipeline above.

## Diagnostics

Theme loaders and builder tools report structured diagnostics with severity, code, message, field, path, and block when available.
`inspect --json` keeps those diagnostics machine-readable: successful inspections include them on the inspection object's `diagnostics` field, while resolution or read failures return a top-level `diagnostics` array.

Common examples:

- `missing-theme-manifest`: package artifact has not been built yet.
- `invalid-theme-manifest`: `theme.json` is malformed or has invalid fields.
- `missing-theme-file`: a referenced CSS, JS, shell, preview, or block file is missing.
- `invalid-theme-path`: an artifact path is absolute, non-POSIX, empty, or escapes the theme directory.
- `reserved-theme-file-reference`: a CSS, JS, head, shell, preview, or block source points at `theme.json`.
- `duplicate-theme-asset-reference`: the same normalized CSS, JS, or head file is referenced more than once.
- `duplicate-theme-block-template`: more than one template handles the same block.

CLI output includes location details when available:

```txt
ERROR missing-theme-file: Theme css file is missing: missing.css. (field=css, path=missing.css)
```

Valid themes can still produce warnings. Warnings do not block rendering, but they help keep artifacts portable and predictable.

## Runtime Contract

MDS rendering never imports package source. Editor, CLI, and renderer load the same built artifact shape:

```txt
theme.json
style.css
script.js
shell.html
blocks/*.html
```

Development metadata such as `.mds-theme-build.json` may exist for inspection and rebuild tooling, but runtime rendering ignores it and packed themes omit it.
