# AI Authoring Guide

Use this guide when generating MDS from a prompt or converting Markdown into MDS. For implementation status and the remaining AI-tooling roadmap, see [AI_GENERATION.md](./AI_GENERATION.md).

## Generation Contract

1. Determine the target theme before choosing theme-specific blocks.
2. Start with valid Markdown and preserve readable prose, headings, lists, code, tables, and links.
3. Add semantic blocks only where structure, interaction, or intent matters.
4. Prefer the 64 portable shared blocks unless the selected theme explicitly exposes a richer capability.
5. Put human-readable titles in Markdown headings or slots. The optional token after a block type is an id.
6. Use attributes only for compact, documented configuration.
7. Do not write HTML, JSX, JavaScript, event handlers, or CSS classes in MDS.
8. Do not emit executable or local URL schemes such as `javascript:`, `data:`, `vbscript:`, or `file:`.
9. Use `:: block ...` for a leaf block with no content; use `::: block ... :::` when the block owns Markdown, slots, or child blocks.

## Discover the Target Theme

Inspect an installed or local theme before generation:

```sh
mds theme inspect @mds-crate/theme-default --json
mds theme inspect @mds-crate/theme-rich --json
```

The JSON inspection includes:

- `supportedBlocks`: capabilities declared by the final theme;
- `blocks`: templates actually present in the artifact;
- `actions`: non-native actions declared by the theme;
- `blockPacks`: composed pack names, profiles, and portable capabilities when build metadata is present;
- `templateSources`: the pack or theme that supplied each final template when build metadata is present;
- `diagnostics`: support drift, invalid metadata, and artifact warnings or errors.

Generate only against the selected theme's supported or implemented blocks. If `supportedBlocks` is omitted, use `blocks` as the implemented capability list and keep any mismatch diagnostics visible.

Generation tools can also consume the portable vocabulary directly:

```ts
import { blockVocabulary, blockVocabularyByName } from "@mds-crate/blocks";
```

Each portable vocabulary entry contains a block name, profile, purpose, and any known slots, attributes, or expected child blocks.

## Portable Defaults

The portable layer contains 64 primitives across the `core`, `display`, `navigation`, `controls`, `forms`, `interactive`, `menus`, `media`, and `motion` profiles. Default, Light, Dark, and Rich all compose this layer.

| Intent | Portable choice |
| --- | --- |
| Page introduction | `header` followed by `section` |
| Generic page region | `section` |
| Supporting content | `aside` |
| Footer content | `footer` |
| Repeated items | `grid` with nested `card` blocks |
| Warning, risk, or status | `callout` with a compact `tone` and optional `label` |
| Compact status | `badge` or `progress` |
| Quote or citation | `quote` |
| Expandable question | `details` |
| Image with caption | `figure` with a `caption` slot |
| Command or installation text | Markdown code fence inside `section` or `card` |
| Contact or signup | `form` with `fieldset`, fields, and `button-group` |
| Hierarchical navigation | `breadcrumb` with `breadcrumb-item` |
| Tabbed or collapsible content | `tabs` or `accordion` |
| Overlay or contextual content | `dialog`, `drawer`, `popover`, or `tooltip` |

`hero` is an official-theme extension supported by Default, Light, Dark, and Rich, but it is not part of the portable `@mds-crate/blocks` vocabulary. Use it only after confirming the target theme.

## Rich Theme Capabilities

Use the Rich theme when the requested document needs higher-level data, documentation, guidance, gallery, or conversation structures.

| Intent | Rich capability |
| --- | --- |
| Main pitch | `hero` |
| Named card collection | `cards` with nested `card` blocks |
| Metrics | `metric`, shared `progress`, or a Markdown table |
| Steps or instructions | `steps` with nested `step` blocks |
| Timeline | `timeline` with nested `step` blocks |
| FAQ collection | `faq` with nested `details` blocks |
| Semantic status | `note`, `info`, `warning`, `danger`, or `success` |
| Multiple media items | `gallery` with nested `figure` blocks |
| Command transcript | `terminal` |
| Multi-language snippets | `code-group` with named slots |
| API documentation | `api` with nested `endpoint` blocks |
| Data presentation | `data-table`, `chart`, `comparison`, or `metric` |
| Conversation UI | `message`, `message-scroller`, `bubble`, or `attachment` |

Do not silently emit a Rich-only block for a portable or unknown theme. Either choose a portable representation or make the Rich theme requirement explicit.

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

## Leaf and Container Blocks

Use a leaf block only when it owns no Markdown, slots, or child blocks:

```mds
Migration progress

:: progress value=72 max=100 label="Migration progress"
```

Use a container when content belongs to the block:

```mds
::: card
## A readable heading
The content remains normal Markdown.
:::
```

The structural `if`, `unless`, `each`, and `data` blocks always require `:::` container syntax.

## Slots

Use slots when a supported block has predictable parts. This example uses the official `hero` capability:

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

Common slots include:

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

Do not invent a slot solely because its name looks plausible. Check the shared vocabulary or the selected theme's documentation first.

## Attributes

Attributes are advanced. Use only attributes documented by the portable vocabulary or selected theme:

```mds
:: progress value=72 max=100 label="Migration progress"
```

Rich-only example:

```mds
::: metric value="12k+" label="Pages generated"
Standalone pages rendered from semantic Markdown.
:::
```

Avoid attributes for long content:

```mds
:: card title="A long human heading that should be Markdown"
```

Prefer:

```mds
::: card
## A long human heading that should be Markdown
:::
```

## Markdown Migration Patterns

### Portable README

````mds
::: header project-intro
# Project Name

Short project summary.

[Install -> #install]
[API => #api]
:::

::: section install
## Install

```sh
pnpm add project-name
```
:::
````

### Portable Structured Page

```mds
::: section overview
## Project Overview

One clear summary.
:::

::: grid
::: card
## Readable authoring
Keep source files readable.
:::

::: card
## Theme-aware output
Choose blocks supported by the selected theme.
:::
:::
```

### Rich Tutorial

Use this only when Rich has been selected and inspected:

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

## Safety Rules

- Treat document source as potentially untrusted input and keep content inside MDS and Markdown syntax.
- Use relative URLs, HTTP(S), `mailto:`, or `tel:` only where the relevant link or media contract allows them.
- Use MDS action syntax instead of event-handler attributes. `submit` and `reset` are renderer-native form actions; `open`, `close`, `show`, `hide`, and `toggle` are declared by the portable interactive pack and must still be present in the selected theme's `actions` list.
- Do not generate theme JavaScript, theme head markup, or executable package-theme source unless the user explicitly asks for trusted theme development.
- Preserve `unsafe-url`, `unsafe-block-attribute`, `missing-action-handler`, and `missing-block-renderer` diagnostics instead of hiding them.

## Validation and Repair Loop

Run both parser-only and theme-aware validation before considering generated MDS complete:

```sh
mds check ./page.mds --json
mds build ./page.mds \
  --theme @mds-crate/theme-rich \
  --output ./page.html \
  --json
```

If the document declares its theme in frontmatter, the explicit `--theme` option may be omitted. For reproducible AI workflows, keep the selected theme and package version explicit in the surrounding project.

Repair in this order:

1. Fix parser errors such as invalid attributes, unclosed blocks, or structural blocks using leaf syntax.
2. Fix unsafe URL and attribute diagnostics.
3. Fix theme loading or validation errors.
4. Fix `missing-block-renderer` by choosing a supported block or an explicitly selected capable theme.
5. Fix `missing-action-handler` by using a native action or an action declared by the selected theme.
6. Re-run `mds check --json` and `mds build --json` until no error diagnostics remain.
7. Keep warnings visible only when a custom block or action is intentional and the consuming integration supplies its implementation.

The readable fallback for an unsupported block prevents data loss; it does not mean the generated document satisfies the selected theme contract.
