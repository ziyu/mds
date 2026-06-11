# MDS Themes

MDS themes are directory-based by default. They are not npm packages.

This keeps the author workflow simple: place a theme folder in the project, change `theme` in frontmatter or pass `--theme`, then build the MDS file again.

## Directory Layout

```txt
themes/
  default/
    theme.json
    style.css
    script.js
    shell.html
    blocks/
      page.html
      section.html
      card.html
      details.html
```

## Enable A Theme

Use a theme by directory name:

```mds
---
title: Demo
theme: default
---
```

MDS looks for named themes under `themes/`, so `theme: default` resolves to `themes/default`.

Use another project theme the same way:

```mds
---
title: Demo
theme: my-theme
---
```

You can also pass an explicit theme path from the CLI:

```sh
mds build ./content/index.mds --theme ./themes/my-theme
```

Named themes are resolved from project theme roots such as `themes/`. Relative path refs such as `./themes/my-theme` are resolved from the input MDS file directory.

## Managing Multiple Themes

The runtime uses a `ThemeRegistry` abstraction:

```ts
interface ThemeRegistry {
  listThemes(): Promise<ThemeSummary[]>;
  loadTheme(ref: string): Promise<HtmlTheme>;
}
```

Node tools use a file registry that scans theme roots:

```ts
import { createFileThemeRegistry } from "@mds/theme-loader";

const themes = createFileThemeRegistry({
  roots: ["themes"]
});

const available = await themes.listThemes();
const theme = await themes.loadTheme("my-theme");
```

Browser tools cannot read arbitrary local directories directly, so they use the same registry shape with bundled or uploaded theme sources. The editor app consumes a registry instead of importing individual theme files.

## `theme.json`

Theme Blocks Contract v2 keeps `theme.json` small and lets the loader discover block templates from a directory:

```json
{
  "name": "my-theme",
  "css": "style.css",
  "js": "script.js",
  "shell": "shell.html",
  "actions": ["toggle", "open", "close"],
  "blocks": "blocks"
}
```

If `blocks` is omitted and a `blocks/` directory exists, the loader treats it as `blocks: "blocks"`.

The current explicit mapping form remains supported for compatibility and for unusual aliases:

```json
{
  "name": "my-theme",
  "css": "style.css",
  "js": "script.js",
  "shell": "shell.html",
  "actions": ["toggle", "open", "close"],
  "blocks": {
    "page": "blocks/page.html",
    "nav": "blocks/nav.html",
    "hero": "blocks/hero.html",
    "card": "blocks/card.html"
  }
}
```

All paths are relative to the theme directory.

`actions` lists command actions that the theme JavaScript knows how to handle. It is only a declaration for warnings and editor diagnostics; MDS does not prescribe the handler implementation.

### Block Sources

`blocks` accepts three forms:

```ts
type ThemeBlocks =
  | string
  | string[]
  | Record<string, string>;
```

Directory source:

```json
{
  "blocks": "blocks"
}
```

This scans the directory and registers every `.html` file. A file without `<template data-block>` uses its filename as the block type:

```txt
blocks/
  hero.html    -> hero
  nav.html     -> nav
  card.html    -> card
```

Single-file source:

```json
{
  "blocks": "blocks.html"
}
```

This reads all `<template data-block="...">` declarations from one file:

```html
<template data-block="hero">
  <section{{ attrs }} class="hero">{{ children }}{{ slots }}</section>
</template>

<template data-block="nav">
  <nav{{ attrs }} class="nav" aria-label="{{ name }}">{{ children }}</nav>
</template>
```

Multi-source form:

```json
{
  "blocks": ["blocks", "overrides.html"]
}
```

Sources are applied in order. Later sources override earlier block templates. This gives themes a simple base/override model without requiring a build step.

Explicit mapping form:

```json
{
  "blocks": {
    "hero": "blocks/hero.html",
    "warning": "blocks/callout.html"
  }
}
```

This is still useful when a theme needs a small number of aliases or wants to point one block to a specific file. It should not be required for ordinary themes.

## Shell Template

`shell.html` controls the full HTML document. CSS and JavaScript are embedded into the generated HTML, so the build output can be opened or published as a standalone file.

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
{{ title }}        escaped document title
{{ lang }}         escaped document language
{{ description }}  escaped document description
{{ head }}         generated head HTML, including CSS when enabled
{{ body }}         rendered MDS body HTML
{{ scripts }}      generated script tags
```

## Block Templates

Block templates map MDS semantic blocks to HTML.

```html
<section{{ attrs }} class="{{ type }}">
  {{ children }}
</section>
```

Available block variables:

```txt
{{ type }}      escaped block type
{{ name }}      escaped block name
{{ id }}        escaped block id value
{{ attrs }}     generated attributes, currently an escaped id attribute
{{ children }}  rendered child HTML
{{ slots }}     rendered slot HTML
{{ summary }}   escaped summary text for details-like blocks
```

Theme authors should prefer `{{ attrs }}` for block identifiers, because it omits the attribute entirely when the block has no name.

When a block source file contains one or more `<template data-block>` elements, each template declares the block types it handles:

```html
<template data-block="note info warning danger success">
  <aside{{ attrs }} class="callout {{ type }}" role="note">
    {{ children }}
  </aside>
</template>
```

The value of `data-block` is a whitespace-separated list. This lets one template cover related blocks without repeating entries in `theme.json`.

If a source file does not contain `<template data-block>`, the whole file is treated as the template for the block named by the file:

```txt
blocks/card.html -> card
blocks/grid-3.html -> grid-3
```

`nav` blocks can be rendered with the same simple template:

```html
<nav{{ attrs }} class="nav" aria-label="{{ name }}">{{ children }}</nav>
```

When a standalone action link inside `nav` points to a local block id, for example `[Contact -> #contact]`, the renderer outputs a normal anchor plus `data-nav-target="contact"` and a visible `.nav-target` span. Themes can style those selectors without parsing MDS syntax.

## HTML Class Names

Generated HTML should use normal class names such as `page`, `hero`, `card`, and `details`. Do not add an `mds-` prefix unless a specific theme intentionally wants one.

## Developer Extension Point

Developers can still pass a programmatic `HtmlTheme` object to `@mds/renderer-html`. The directory-based theme format is the default author-facing customization path; the registry API exists for CLIs, editor integrations, plugins, and advanced renderers that need to list or switch themes.
