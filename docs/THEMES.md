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

```json
{
  "name": "my-theme",
  "css": "style.css",
  "js": "script.js",
  "shell": "shell.html",
  "blocks": {
    "page": "blocks/page.html",
    "hero": "blocks/hero.html",
    "card": "blocks/card.html"
  }
}
```

All paths are relative to the theme directory.

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

## HTML Class Names

Generated HTML should use normal class names such as `page`, `hero`, `card`, and `details`. Do not add an `mds-` prefix unless a specific theme intentionally wants one.

## Developer Extension Point

Developers can still pass a programmatic `HtmlTheme` object to `@mds/renderer-html`. The directory-based theme format is the default author-facing customization path; the registry API exists for CLIs, editor integrations, plugins, and advanced renderers that need to list or switch themes.
