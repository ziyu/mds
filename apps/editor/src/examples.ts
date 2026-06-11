export interface EditorExample {
  id: string;
  label: string;
  source: string;
}

export const examples: EditorExample[] = [
  {
    id: "landing",
    label: "Landing",
    source: `---
title: MDS Landing
description: A polished standalone page generated from semantic Markdown.
layout: landing
---

::: hero
--- title
# MDS turns Markdown into pages

--- body
Use semantic blocks to describe intent. Let the theme turn that intent into layout, motion, and interaction.

--- media
::: note
Write content. Choose a theme. Ship standalone HTML.
:::
:::

::: nav main
[Authoring -> #authoring]
[Themes => #themes]
[Contact => #contact]
:::

::: cards

::: card authoring
## Simple authoring
Markdown stays Markdown. MDS adds a small layer of semantic blocks.
:::

::: card themes
## Theme-owned design
Layout, style, and interaction live in the theme directory, not in the document body.
:::

::: card output
## Standalone output
The final artifact is plain HTML with embedded CSS and JavaScript.
:::

:::

::: split

--- left
## Why MDS exists

Markdown is simple. HTML is rich. MDS keeps authoring simple while compiling to HTML.

::: warning
Authors should not write \`key=value\` attributes in content. Themes decide presentation.
:::

--- right
## What themes control

- Hero layouts
- Cards and grids
- Tabs and drawers
- Forms and media
- Motion and responsive behavior

:::

::: tabs product

--- Author
Write semantic content with Markdown-like syntax.

--- Theme
Drop files into a theme directory and customize CSS variables.

--- Output
Publish a standalone HTML file without a runtime.

:::

::: form contact
? email 邮箱 邮箱地址
? role 选择 你的身份
- 内容创作者
- 设计师
- 开发者
? message 长文本 想构建什么页面？

[提交 !submit contact]
:::
`
  },
  {
    id: "basic",
    label: "Basic",
    source: `---
title: MDS Basic
---

# MDS Basic

Plain Markdown stays valid.

::: hero
# Write pages like Markdown

[Start -> /docs]
:::

::: details faq
# What is MDS?

MDS is a semantic layer on top of Markdown.
:::
`
  },
  {
    id: "components",
    label: "Components",
    source: `---
title: Components
---

::: hero
--- title
# Components without attributes

--- body
Blocks stay semantic. Themes choose presentation.
:::

::: grid-3

--- item
## Info
::: info
Useful context.
:::

--- item
## Warning
::: warning
Something needs attention.
:::

--- item
## Success
::: success
The action completed.
:::

:::

::: quote
Good authoring tools make the simple path feel complete.
:::
`
  },
  {
    id: "actions",
    label: "Actions",
    source: `---
title: Action Cases
description: Native, theme, and custom app actions in one document.
---

# Action Cases

Navigation actions stay plain HTML links:

[Primary link -> /docs]
[Secondary link => /examples]
[External link >> https://example.com]

Block navigation groups links semantically:

::: nav actionsNav
[Details target -> #actionDetails]
[Dialog target => #actionDialog]
[Drawer target => #actionDrawer]
[Form target => #actionContact]
:::

::: details actionDetails
# Details Target

Theme actions can toggle, open, or close this native details block.
:::

[Toggle details !toggle actionDetails]
[Open details !open actionDetails]
[Close details !close actionDetails]

::: dialog actionDialog
# Dialog Target

This is controlled by theme actions.

[Close dialog !close actionDialog]
:::

[Open dialog !open actionDialog]

::: drawer actionDrawer
# Drawer Target

The same action metadata works for another block.

[Hide drawer !hide actionDrawer]
:::

[Show drawer !show actionDrawer]

::: form actionContact
? email 邮箱 邮箱地址
? role 选择 你的身份
- 内容创作者
- 开发者
? message 长文本 留言内容

[Submit native form !submit actionContact]
[Reset native form !reset actionContact]
:::

Custom app actions are preserved as metadata. They warn until an outer app registers handlers.

[Send lead !lead.submit actionContact primary 42]
[Track event !analytics.track docs_cta landing primary]
`
  }
];
