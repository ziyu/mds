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

Use the built-in default theme folder:

```mds
---
title: Demo
theme: default
---
```

Use a project theme folder:

```mds
---
title: Demo
theme: ./themes/my-theme
---
```

Or pass a theme path from the CLI:

```sh
mds build ./content/index.mds --theme ./themes/my-theme
```

Relative theme paths are resolved from the input MDS file directory. `theme: default` resolves to `themes/default` in the current project.

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

Developers can still pass a programmatic `HtmlTheme` object to `@mds/renderer-html`. The directory-based theme format is the default author-facing customization path; the programmatic API exists for integrations, plugins, and advanced renderers.
