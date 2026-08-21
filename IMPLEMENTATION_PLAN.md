# MDS Implementation Plan

MDS is a Markdown-based semantic authoring language. Its job is to let authors express page intent with a small set of syntax extensions, then compile that intent into HTML.

For the external package, Editor, Renderer, and release-automation roadmap, see [docs/RELEASE_PLAN.md](./docs/RELEASE_PLAN.md).

This document defines the first implementation plan for MDS v0.1.

## Product Direction

MDS should feel like Markdown to authors and like HTML to browsers.

The language keeps authoring simple:

- Plain Markdown remains valid.
- Semantic blocks express page intent.
- Authors primarily write semantic blocks and content. Advanced authors may pass theme-defined block attributes, but they still do not write JSX, XML-style tags, event handlers, or JavaScript.
- Themes and renderers decide the final HTML structure and styling.

The implementation keeps the platform simple:

- MDS has its own AST layer.
- MDS does not ship a dedicated browser runtime.
- All MDS source is ultimately compiled to HTML.
- Interactions should prefer native HTML elements and static HTML patterns.
- Any client-side JavaScript, if later needed by a theme, belongs to that theme output, not to a required MDS runtime.

## Core Constraints

1. **No MDS runtime**
   MDS compilation produces HTML. Runtime behavior should come from native browser features whenever possible, such as links, anchors, `<details>`, `<summary>`, `<dialog>`, forms, and CSS.

2. **AST as the extension boundary**
   MDS needs a first-class AST so future tooling can add formatters, linters, editor support, transforms, theme renderers, docs generators, and plugins without reparsing raw text.

3. **Do not reinvent Markdown**
   The MVP should use mature parsing and rendering libraries for Markdown, frontmatter, HTML sanitation, AST traversal, and CLI ergonomics.

4. **Monorepo from day one**
   The project should be structured as packages so parser, AST, renderer, CLI, themes, and examples can evolve independently.

5. **Spec compliance over feature breadth**
   The first MVP should preserve the spirit of `SPEC.md`: semantic intent over implementation detail.

## Proposed Monorepo Layout

```txt
mds/
  package.json
  pnpm-workspace.yaml
  tsconfig.base.json
  SPEC.md
  IMPLEMENTATION_PLAN.md

  packages/
    ast/
      src/
      package.json

    parser/
      src/
      package.json

    renderer-html/
      src/
      package.json

    html-types/
      src/
      package.json

    cli/
      src/
      package.json

    theme-loader/
      src/
      package.json

    theme-builder/
      src/
      package.json

    theme-sdk-html/
      src/
      package.json

    theme-sdk-react/
      src/
      package.json

  examples/
    basic/
      index.mds
      expected.html

    landing/
      index.mds

  tests/
    fixtures/
    snapshots/
```

## Package Responsibilities

### `@mds-crate/ast`

Defines stable AST types and helper utilities.

Initial node families:

- `Document`
- `Frontmatter`
- `Markdown`
- `MdsBlock`
- `Slot`
- `ActionLink`
- `MediaDirective`
- `FormField`
- `StateDeclaration`
- `Interpolation`
- `Diagnostic`

The AST package should avoid dependencies where possible. It is the shared contract for the rest of the ecosystem.

Current AST design separates generic semantic blocks from control/data syntax:

- `MdsBlock` for ordinary semantic and extension blocks.
- `ConditionBlock` for `::: if` and `::: unless`.
- `EachBlock` for `::: each`.
- `DataBlock` for `::: data`.
- `Markdown` nodes retain raw Markdown text and discovered inline syntax metadata.

### `@mds-crate/parser`

Parses `.mds` source into the MDS AST.

Responsibilities:

- Parse YAML frontmatter.
- Preserve normal Markdown compatibility.
- Detect MDS block boundaries with `:::` syntax.
- Parse optional block names.
- Treat block names as stable machine-friendly ids, not display titles.
- Derive block ids from the first heading or `title` slot when no explicit name exists, using deterministic Markdown-like slugging.
- Parse optional block attributes such as `variant="featured"`, `columns=3`, and boolean flags.
- Reject curly attribute syntax such as `{columns=3}` and diagnose unsafe event/script attributes.
- Parse slot markers like `--- title`, `--- left`, and `--- item`.
- Parse action links such as `[Start -> /docs]` and `[Open !toggle faq]`.
- Parse media directives such as `!video /demo.mp4`.
- Parse comments and escaped special syntax.
- Produce diagnostics with line and column locations.

The parser should not render HTML and should not know theme behavior.

The parser is split into focused modules:

- `parser.ts` for line-level document/block parsing.
- `inline.ts` for inline action links and interpolation metadata.
- `patterns.ts` for syntax patterns and known action names.
- `utils.ts` for source location and syntax utility helpers.

### `@mds-crate/renderer-html`

Turns MDS AST into HTML.

Responsibilities:

- Render standard Markdown to HTML.
- Coordinate HTML document generation.
- Render non-themed primitive nodes such as Markdown, actions, media, forms, and fallback blocks.
- Delegate semantic block rendering to theme/component handlers.
- Provide safe fallback HTML for unknown blocks.
- Generate document-level HTML from frontmatter.
- Escape and sanitize output where required.
- Resolve and de-duplicate generated block ids for anchors and block navigation.

This package should compile everything to HTML strings or HTML AST. It should not require a browser runtime and should not own the default visual mapping for semantic blocks.

### `@mds-crate/html-types`

Defines shared HTML renderer/theme contracts.

Responsibilities:

- Export `HtmlTheme`.
- Export `HtmlBlockRenderer`.
- Export `HtmlBlockRenderers`.
- Export `HtmlRenderContext`.

This package exists to avoid a dependency cycle between `@mds-crate/renderer-html` and theme packages.

### `@mds-crate/theme-loader`

Provides the first built-in theme renderer and default file-based theme assets.

Responsibilities:

- Export file and memory theme registries.
- Provide default block renderers.
- Map common semantic blocks to practical HTML:
  - `hero`
  - `section`
  - `aside`
  - `footer`
  - `note`
  - `info`
  - `warning`
  - `danger`
  - `success`
  - `card`
  - `cards`
  - `details`
  - `tabs`
  - `accordion`
  - `dialog`
  - `drawer`
  - `form`
- Provide minimal CSS.
- Prefer native HTML behavior.

Examples:

- `details` should compile to `<details>`.
- `accordion` can compile to grouped `<details>` sections.
- `dialog` can compile to a `<section role="dialog">` fallback for MVP, then optionally support native `<dialog>` in a theme-specific enhancement.
- `tabs` can initially compile to accessible static sections with anchors, then later to a CSS-only pattern if needed.

Suggested theme shape:

```ts
interface HtmlTheme {
  name: string;
  css?: string;
  blockRenderers?: HtmlBlockRenderers;
}
```

The default theme is an implementation detail of the default build path, not part of MDS syntax. Users should be able to supply a different theme without changing parser behavior.

### `@mds-crate/theme-builder`

Development-time builder for package-style themes.

Responsibilities:

- Read `package.json#mdsTheme`.
- Execute trusted theme source during development builds.
- Convert source-authored themes to plain artifact directories.
- Bundle CSS imports and TypeScript script assets with esbuild.
- Run Tailwind v4 through PostCSS when a package opts into `mdsTheme.pipeline.css = "tailwind"`.
- Write and inspect `.mds-theme-build.json` metadata.
- Pack clean distributable artifacts without development metadata.

### `@mds-crate/theme-sdk-html`

Lightweight HTML authoring adapter for package themes.

Responsibilities:

- Provide a tagged `html` helper for block templates.
- Escape primitive interpolations by default.
- Preserve explicit raw MDS placeholders.
- Produce the same `ThemeSourceInput` artifact contract as JSX-authored themes.

### `@mds-crate/theme-sdk-react`

React authoring adapter for package themes.

Responsibilities:

- Let theme authors compose block templates with React components.
- Support shadcn-style local component source and Tailwind class names.
- Render React components to MDS template HTML during build.
- Preserve `attrs`, block attributes, `children`, and slot placeholders.
- Produce `ThemeSourceInput` so the builder stays adapter-agnostic.

## File-Based Themes

Detailed theme-system architecture and roadmap live in [docs/THEME_DESIGN.md](./docs/THEME_DESIGN.md). The block extension, attributes, and motion model lives in [docs/BLOCKS_AND_MOTION.md](./docs/BLOCKS_AND_MOTION.md). This section keeps the implementation-plan summary.

The primary theme customization path should be folder-based, because many MDS users are expected to be content authors rather than TypeScript package authors.

Authors should be able to install or create a theme by placing files in a directory:

```txt
themes/
  default/
    theme.json
    style.css
    script.js
    shell.html
    blocks/
      page.html
      hero.html
      card.html
      warning.html
      details.html
      tabs.html
```

Then select it from frontmatter:

```mds
---
title: Demo
theme: default
---
```

or with a path:

```mds
---
theme: ./themes/my-theme
---
```

### `theme.json`

Theme Blocks Contract v2 removes most explicit mapping boilerplate by allowing directory and single-file block sources.

```json
{
  "name": "default",
  "css": "style.css",
  "js": "script.js",
  "shell": "shell.html",
  "blocks": "blocks"
}
```

If `blocks` is omitted and `blocks/` exists, the loader treats it as `blocks: "blocks"`.

The v2 shape supports:

```ts
type ThemeBlocks =
  | string
  | string[]
  | Record<string, string>;
```

Examples:

```json
{ "blocks": "blocks" }
```

```json
{ "blocks": "blocks.html" }
```

```json
{ "blocks": ["blocks", "overrides.html"] }
```

The existing explicit form remains compatible:

```json
{
  "blocks": {
    "hero": "blocks/hero.html",
    "warning": "blocks/callout.html"
  }
}
```

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

### Block Template

```html
<section id="{{ id }}" class="hero">
  {{ children }}
</section>
```

V2 block source files may also contain one or more native HTML templates:

```html
<template data-block="note info warning danger success">
  <aside{{ attrs }} class="callout {{ type }}" role="note">
    {{ children }}
  </aside>
</template>
```

`data-block` is a whitespace-separated list, so one template can cover related block types without repeating aliases in `theme.json`.

If a block source file has no `<template data-block>`, the entire file is used as the template for the block named by the filename:

```txt
blocks/card.html -> card
blocks/grid-3.html -> grid-3
```

Supported template variables should stay intentionally small:

```txt
{{ children }} rendered child HTML
{{ slots }}    rendered slot HTML
{{ name }}     block name
{{ id }}       escaped id attribute value
{{ type }}     block type
{{ title }}    document title
{{ lang }}     document lang
{{ head }}     generated head additions
{{ body }}     rendered document body
{{ scripts }}  generated script tags
```

Programmatic `HtmlTheme` remains available for developers, but file-based themes are the default author-facing extension model.

### JSX Theme Authoring

JSX support is a developer authoring layer over the same file/source theme contract. It should not become a required runtime and should not change the ordinary author workflow.

The intended model:

```tsx
/** @jsxImportSource @mds-crate/theme-loader */
import { Content, defineJsxTheme, Root } from "@mds-crate/theme-loader/jsx";

export default defineJsxTheme({
  name: "jsx-demo",
  css: ".hero { color: red; }",
  blocks: {
    hero: (block) => (
      <Root block={block} className="hero">
        <Content block={block} />
      </Root>
    ),
    "note warning": (block) => (
      <Root block={block} as="aside" className={`callout ${block.type}`} role="note">
        <Content block={block} />
      </Root>
    )
  }
});
```

This compiles or converts to the same source shape used by directory themes:

```txt
theme.json
style.css
blocks/
  hero.html
  note.html
```

The loader still consumes `ThemeSource` or a theme directory. JSX is only a convenient way to author those files with components and TypeScript.

For checked-in themes, generated block templates should be committed so runtime tools do not need to execute TSX. The authoring loop can be:

```sh
pnpm build:theme:canvas
```

### Package Theme Development

Package themes are development containers that compile to standard theme artifacts. MDS should not execute package source code during normal rendering.

Package shape:

```txt
my-theme/
  package.json
  src/theme.tsx
  src/style.css
  src/script.ts
  dist/theme/
    theme.json
    style.css
    script.js
    blocks/*.html
```

`package.json` declares the source and artifact paths:

```json
{
  "mdsTheme": {
    "source": "./src/theme.tsx",
    "dist": "./dist/theme",
    "assets": {
      "css": "./src/style.css",
      "js": "./src/script.ts",
      "shell": "./src/shell.html",
      "preview": "./src/preview.svg"
    }
  }
}
```

The first builder package is `@mds-crate/theme-builder`. Its MVP command reads `package.json#mdsTheme`, imports the source theme under `tsx`, accepts SDK-produced `ThemeSourceInput` or legacy JSX theme definitions, copies declared assets including preview files, bundles CSS imports and TypeScript script assets to plain artifact CSS/JavaScript, optionally runs Tailwind v4 through PostCSS, writes `.mds-theme-build.json` with input/debug metadata, and writes the artifact directory.

`mds theme inspect` and `mds-theme inspect` read the built artifact through the same resolution path used by editor and CLI rendering. They print metadata, files, blocks, assets, actions, build metadata, and validation diagnostics without importing package source.

`mds theme pack` and `mds-theme pack` read the same built artifact, validate it, and write a clean shareable theme directory without package source files or `.mds-theme-build.json`.

`themes/canvas` is the framework-authored package example: source files live under `src/`, local components are imported by `src/theme.tsx`, Tailwind CSS and `src/script.ts` are bundled, and the runtime artifact is written under `dist/theme`. The publishable Default, Light, Dark, and Rich themes use the same source/artifact separation with file-authored templates.

Future builder phases can add Vite dev integration, Preact/Vue adapters, richer CSS transforms, and package distribution polish. Those are development-time features only; the renderer and editor continue to load `theme.json` artifacts.

The renderer/CLI should support both:

- `HtmlTheme` object for developer integrations.
- Theme directory path for author workflows.

### `@mds-crate/cli`

Provides command-line workflows.

Initial commands:

```txt
mds build input.mds -o output.html
mds ast input.mds
mds check input.mds
```

Later commands:

```txt
mds init
mds build-dir docs/ -o site/
```

## Recommended Libraries

Use mature libraries to accelerate the MVP.

### Markdown and AST Ecosystem

- `unified`
- `remark-parse`
- `remark-frontmatter`
- `remark-gfm`
- `mdast-util-to-hast`
- `hast-util-to-html`
- `unist-util-visit`

Rationale: this ecosystem is stable, extensible, and already models Markdown and HTML as ASTs.

### Frontmatter

- `vfile-matter` or `gray-matter`
- `yaml`

Rationale: avoid ad hoc YAML parsing.

### HTML Safety and Serialization

- `hast-util-sanitize`
- `hast-util-to-html`
- `html-escaper`

Rationale: keep output generation predictable and safe.

### CLI

- `commander` or `cac`
- `chokidar` only if watch mode is added later.

Rationale: small, proven tools with low implementation overhead.

### Testing

- `vitest`
- `tsx`

Rationale: fast TypeScript testing and local execution.

## MVP Syntax Scope

The MVP should implement enough syntax to validate the language design without building every advanced feature immediately.

### Phase 1 Syntax

- Frontmatter
- Normal Markdown
- Semantic blocks
- Optional block names
- Markdown-like generated block ids
- Nested blocks
- Slots
- Action links
- Media directives
- Comments
- Escaping
- Diagnostics for malformed, curly, or unsafe attributes

### Phase 2 Syntax

- Forms
- State declarations as AST metadata
- Static interpolation support where values are known at build time
- `if` and `unless`
- Data blocks

### Phase 3 Syntax

- `each`
- More advanced data-driven components
- Theme/plugin extension registry
- Formatter and linter rules

## HTML Rendering Strategy

MDS should output semantic, inspectable HTML.

Suggested block mappings:

```txt
::: page       -> <main class="page">
::: section    -> <section class="section">
::: hero       -> <section class="hero">
::: aside      -> <aside class="aside">
::: footer     -> <footer class="footer">
::: card       -> <article class="card">
::: details    -> <details class="details">
::: warning    -> <aside class="callout warning">
::: tabs       -> static accessible sections for MVP
::: accordion  -> multiple <details> elements
::: form       -> <form>
```

Unknown blocks should render safely:

```html
<section class="block x-name" data-block="x-name" id="optionalName">
  ...
</section>
```

This keeps output useful while preserving extension metadata. Safe block attributes should remain available to themes and diagnostics, but renderer fallback must not turn unsafe event/script attributes into executable browser behavior.

### Renderer Extension Registry

The HTML renderer exposes a block renderer registry so themes and plugins can override built-in blocks or render custom blocks.

```ts
renderHtml(document, {
  blockRenderers: {
    "x-feature": (block, context) =>
      `<article class="feature">${context.renderChildren(block.children)}</article>`
  }
})
```

Default block renderers can be disabled for tests or specialized renderers:

```ts
renderHtml(document, {
  includeDefaultBlockRenderers: false,
  blockRenderers: {
    hero: customHeroRenderer
  }
})
```

The registry keeps MDS extensible without requiring an MDS browser runtime.

The renderer should merge block renderers in this order:

```txt
fallback renderer
theme blockRenderers
explicit renderHtml({ blockRenderers })
```

This lets themes provide broad defaults and lets callers override individual blocks.

## Action Link Strategy Without Runtime

Because MDS has no required runtime, action links need careful treatment.

Initial HTML output:

```txt
[Start -> /docs]        -> <a class="action primary" href="/docs">
[More => /docs]         -> <a class="action secondary" href="/docs">
[Site >> https://x.io]  -> <a class="action external" href="https://x.io" rel="noopener noreferrer">
```

For command-style actions:

```txt
[Open !toggle faq]
[Close !close menu]
[Next !next docs]
[Submit !lead.submit contact primary]
```

MVP behavior:

- Preserve them as semantic HTML metadata.
- Render native form actions as working HTML.
- Render custom actions as buttons with `data-action`, `data-target`, and `data-args`.
- Emit warnings when an action is not native and not declared by a theme or renderer option.
- Let themes or apps decide whether to add optional JavaScript handlers.

Example:

```html
<button type="button" class="action command" data-action="toggle" data-target="faq">
  Open
</button>
```

This is still compiled HTML, but not a required MDS runtime.

## AST Design Draft

```ts
type MdsNode =
  | DocumentNode
  | MarkdownNode
  | MdsBlockNode
  | SlotNode
  | ActionLinkNode
  | MediaDirectiveNode
  | FormFieldNode
  | StateDeclarationNode
  | InterpolationNode;

interface DocumentNode {
  type: "document";
  frontmatter: Record<string, unknown>;
  children: MdsNode[];
  diagnostics: Diagnostic[];
}

interface MdsBlockNode {
  type: "block";
  blockType: string;
  name?: string;
  children: MdsNode[];
  slots?: SlotNode[];
  position?: Position;
}

interface SlotNode {
  type: "slot";
  name: string;
  children: MdsNode[];
  position?: Position;
}

interface ActionLinkNode {
  type: "actionLink";
  label: string;
  kind: "primary" | "secondary" | "external" | "command";
  target?: string;
  action?: string;
  args: string[];
  position?: Position;
}
```

The actual AST can later align more closely with `unist` so existing tools can traverse it naturally.

## Implementation Milestones

### Milestone 1: Monorepo Foundation

- Add workspace configuration.
- Add shared TypeScript config.
- Add package directories.
- Add build and test scripts.
- Add example `.mds` files.

### Milestone 2: AST and Parser MVP

- Define AST types.
- Implement frontmatter parsing.
- Integrate Markdown parsing.
- Parse MDS block syntax.
- Parse slots and action links.
- Add diagnostics.
- Add parser snapshot tests.

### Milestone 3: HTML Renderer MVP

- Render Markdown and MDS blocks to HTML.
- Add default theme handlers.
- Add fallback rendering for unknown blocks.
- Add HTML snapshot tests.

### Milestone 4: CLI MVP

- Implement `mds build`.
- Implement `mds ast`.
- Implement `mds check`.
- Add fixture-based CLI tests.

### Milestone 5: Spec Expansion

- Add forms.
- Add state and interpolation as compile-time AST features.
- Add `if` and `unless`.
- Add `data` blocks.
- Add more theme handlers.

## Open Design Questions

1. Should the parser expose a pure MDS AST, a `unist`-compatible AST, or both?
2. Should command-style action links produce warnings by default because there is no required runtime?
3. Should `tabs` be rendered as static sections first, or should the default theme use a CSS-only tab pattern?
4. Should invalid syntax fail the build, or should `mds check` be stricter than `mds build`?
5. Should generated HTML include embedded CSS by default, or write separate CSS files?

## Immediate Next Step

Initialize the monorepo foundation and implement the first parser slice:

1. Create workspace config.
2. Create `@mds-crate/ast`.
3. Create `@mds-crate/parser`.
4. Parse frontmatter, Markdown, and basic `::: block` structures.
5. Add a basic fixture from `SPEC.md`.
