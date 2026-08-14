# AI Authoring Guide

Use this guide when generating MDS from a prompt or converting Markdown into MDS.

## Default Strategy

1. Start with valid Markdown.
2. Add semantic blocks only where structure or intent matters.
3. Keep the source readable without rendering it.
4. Prefer common blocks from the shared vocabulary.
5. Use attributes only for compact, theme-defined options.
6. Do not write HTML, JSX, JavaScript, event handlers, or CSS classes in MDS.

## Safe Defaults

| Intent | Use |
| --- | --- |
| First screen or main pitch | `hero` |
| Generic page section | `section` |
| Side note or supporting content | `aside` |
| Footer content | `footer` |
| Repeated feature/resource items | `cards` with nested `card` |
| Product feature list | `features` with nested `feature` |
| Metrics | `stats` with nested `stat` |
| Steps or instructions | `steps` with nested `step` |
| Timeline | `timeline` with nested `step` |
| FAQ | `faq` with nested `details` |
| Warning or risk | `warning` |
| Positive status | `success` |
| Quote or testimonial | `quote` or `testimonial` |
| Pricing table | `pricing` with nested `pricing-plan` |
| Image with caption | `figure` with `caption` slot |
| Multiple media items | `gallery` with nested `figure` |
| Installation or command transcript | `terminal` |
| Multi-language snippets | `code-group` with named slots |
| API docs | `api` with nested `endpoint` |
| Contact or signup | `form` with `fieldset` and `button-group` |

## Block Names

The optional token after a block type is an id, not a title.

Prefer:

```mds
::: section product-intro
## Product Intro
Readable content goes here.
:::
```

Avoid:

```mds
::: section "Product Intro"
Readable content goes here.
:::
```

Use explicit ids only when links or actions target the block:

```mds
::: details faq
# Frequently Asked Questions
:::

[Toggle FAQ !toggle faq]
```

## Slots

Use slots when a block has predictable parts.

```mds
::: hero
--- title
# Launch faster

--- body
Describe the offer in normal Markdown.

--- actions
[Get started -> /start]
[Read docs => /docs]

--- media
![Product preview](preview.png)
:::
```

Common slots:

```txt
title
body
actions
media
left
right
item
caption
author
question
answer
```

## Attributes

Attributes are advanced. Use them for compact configuration:

```mds
::: stat value="12k+" label="Pages generated"
Standalone pages rendered from semantic Markdown.
:::

::: pricing-plan pro price="$29" highlighted
## Pro
For growing teams.
:::
```

Avoid attributes for long content:

```mds
::: card title="A long human heading that should be Markdown"
:::
```

Prefer:

```mds
::: card
## A long human heading that should be Markdown
:::
```

## Markdown Migration Patterns

### README

```mds
::: hero
--- title
# Project Name

--- body
Short project summary.

--- actions
[Install -> #install]
[API => #api]
:::

::: section install
## Install

::: terminal
```sh
pnpm add project-name
```
:::
:::
```

### Tutorial

```mds
::: steps
::: step
## Install dependencies
Run the package manager command.
:::

::: step
## Create a page
Write Markdown and add semantic blocks.
:::
:::
```

### Product Page

```mds
::: hero
--- title
# Product Name

--- body
One clear value proposition.

--- actions
[Start -> /start]
:::

::: features
::: feature
## Fast authoring
Keep source files readable.
:::
:::
```

## Final Check

Before considering generated MDS complete:

1. Run `mds check`.
2. Run `mds build` with the intended theme.
3. Fix parser errors first.
4. Fix renderer warnings by choosing supported blocks or adding a shared pack.
5. Keep warnings visible when the generated page intentionally uses custom blocks.
