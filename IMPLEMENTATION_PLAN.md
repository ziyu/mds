# MDS Implementation Plan

MDS is a Markdown-based semantic authoring language. Its job is to let authors express page intent with a small set of syntax extensions, then compile that intent into HTML.

This document defines the first implementation plan for MDS v0.1.

## Product Direction

MDS should feel like Markdown to authors and like HTML to browsers.

The language keeps authoring simple:

- Plain Markdown remains valid.
- Semantic blocks express page intent.
- Authors do not write HTML attributes, JSX, XML-style tags, event handlers, CSS parameters, or animation parameters.
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

    theme-default/
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

### `@mds/ast`

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

### `@mds/parser`

Parses `.mds` source into the MDS AST.

Responsibilities:

- Parse YAML frontmatter.
- Preserve normal Markdown compatibility.
- Detect MDS block boundaries with `:::` syntax.
- Parse optional block names.
- Reject block attributes such as `{columns=3}` or `key=value`.
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

### `@mds/renderer-html`

Turns MDS AST into HTML.

Responsibilities:

- Render standard Markdown to HTML.
- Coordinate HTML document generation.
- Render non-themed primitive nodes such as Markdown, actions, media, forms, and fallback blocks.
- Delegate semantic block rendering to theme/component handlers.
- Provide safe fallback HTML for unknown blocks.
- Generate document-level HTML from frontmatter.
- Escape and sanitize output where required.

This package should compile everything to HTML strings or HTML AST. It should not require a browser runtime and should not own the default visual mapping for semantic blocks.

### `@mds/html-types`

Defines shared HTML renderer/theme contracts.

Responsibilities:

- Export `HtmlTheme`.
- Export `HtmlBlockRenderer`.
- Export `HtmlBlockRenderers`.
- Export `HtmlRenderContext`.

This package exists to avoid a dependency cycle between `@mds/renderer-html` and theme packages.

### `@mds/theme-default`

Provides the first built-in theme renderer and default file-based theme assets.

Responsibilities:

- Export a `defaultTheme` object.
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

## File-Based Themes

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

```json
{
  "name": "default",
  "css": "style.css",
  "js": "script.js",
  "shell": "shell.html",
  "blocks": {
    "hero": "blocks/hero.html",
    "card": "blocks/card.html",
    "warning": "blocks/warning.html"
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

The renderer/CLI should support both:

- `HtmlTheme` object for developer integrations.
- Theme directory path for author workflows.

### `@mds/cli`

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
- Nested blocks
- Slots
- Action links
- Media directives
- Comments
- Escaping
- Diagnostics for forbidden attributes

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
<section class="block x-name" data-block="x-name">
  ...
</section>
```

This keeps output useful while preserving extension metadata.

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
```

MVP behavior:

- Preserve them as semantic HTML metadata.
- Render as inert buttons or links with `data-action`.
- Emit diagnostics when the action cannot be represented without runtime.
- Let future themes decide whether to add optional theme-specific JavaScript.

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
2. Create `@mds/ast`.
3. Create `@mds/parser`.
4. Parse frontmatter, Markdown, and basic `::: block` structures.
5. Add a basic fixture from `SPEC.md`.
