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

--- actions
[Read the docs -> /docs]
[View examples => /examples]

--- media
::: note
Write content. Choose a theme. Ship standalone HTML.
:::
:::

::: cards

::: card
## Simple authoring
Markdown stays Markdown. MDS adds a small layer of semantic blocks.
:::

::: card
## Theme-owned design
Layout, style, and interaction live in the theme directory, not in the document body.
:::

::: card
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
  }
];
