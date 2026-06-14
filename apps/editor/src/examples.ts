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

::: hero motion="fade-up" delay=80 duration=760
--- title
# MDS turns Markdown into pages

--- body
Use semantic blocks to describe intent. MDS turns that intent into layout, motion, and interaction.

--- media
::: note
Write content. Preview the result. Ship standalone HTML.
:::
:::

::: nav main
[Authoring -> #authoring]
[Design => #design]
[Contact => #contact]
:::

::: cards motion="fade-up" delay=180 stagger=90

::: card authoring
## Simple authoring
Markdown stays Markdown. MDS adds a small layer of semantic blocks.
:::

::: card design
## Reusable design
Layout, style, and interaction stay outside the document body.
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
Authors usually write semantic blocks first. Advanced options can use block attrs.
:::

--- right
## What MDS can render

- Hero layouts
- Cards and grids
- Tabs and drawers
- Forms and media
- Motion and responsive behavior

:::

::: tabs product

--- Author
Write semantic content with Markdown-like syntax.

--- Design
Use reusable visual systems without changing the source document.

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
title: Component Gallery
description: A broad MDS component showcase.
---

::: hero
--- title
# Component gallery

--- body
Semantic blocks cover marketing pages, documentation, product updates, reports, and interactive explainers.

--- actions
[View structure -> #structure]
[Compare plans -> #plans]
:::

::: stats

::: stat value="24" label="Semantic blocks"
Cover pages, docs, media, data, and conversion flows.
:::

::: stat value="0" label="Runtime dependencies"
The final page stays standalone HTML.
:::

::: stat value="3" label="Authoring levels"
Plain Markdown, semantic blocks, and advanced attrs.
:::

::: stat value="100%" label="Portable UI"
Layout, motion, and interaction compile into standalone HTML.
:::

:::

::: logos
::: logo
Atlas
:::

::: logo
Northstar
:::

::: logo
Glyph
:::

::: logo
Papertrail
:::
:::

::: features

::: feature label="Authoring"
## Natural structure
Use plain Markdown for prose and semantic blocks for layout.
:::

::: feature label="Rendering"
## Reusable presentation
MDS preserves semantic intent so different renderers can produce polished output.
:::

::: feature label="Output"
## Standalone HTML
Rendered pages can be copied, downloaded, and hosted without an MDS runtime.
:::

:::

::: section structure
## Structure and guidance

::: split

--- left
::: steps
::: step
## Start with Markdown
Write headings, paragraphs, lists, and links.
:::

::: step
## Add semantic blocks
Describe the purpose of each section.
:::

::: step
## Render the page
MDS turns intent into layout and motion.
:::
:::

--- right
::: timeline
::: step date="Now"
## Content-first authoring
Authors write useful content without touching HTML.
:::

::: step date="Next"
## Reusable systems
Designers and developers ship reusable block systems.
:::
:::

:::
:::

::: cards

::: card
::: badge
Content
:::
## Cards
Cards handle feature summaries, resource links, and compact explanations.
:::

::: card
::: tag
Data
:::
## Metrics
Metrics and progress blocks make reports scannable.
:::

::: card
::: tag
Docs
:::
## Technical blocks
Terminal and code groups support documentation pages.
:::

:::

::: comparison

::: card
## Simple authoring
- Markdown remains readable.
- Blocks are semantic.
- Style stays portable.
:::

::: card
## Advanced control
- Attributes tune variants.
- Motion remains declarative.
- Custom blocks can be added later.
:::

:::

::: metric value="72%" label="Implementation progress"
Phase one focuses on broad static content components.
:::

::: progress value=72 max=100 label="Component coverage"
MDS has a broad component vocabulary in place.
:::

::: scene variant="spotlight"
## Scene variant
Scene blocks describe richer composed sections without adding new MDS runtime concepts.

::: reveal preset="reveal" duration=720
Reveal is also just a block. MDS preserves the motion intent in the output.
:::
:::

::: gallery

::: figure
::: note
A figure can contain media, generated artwork, or a nested semantic block.
:::

--- caption
Figure blocks preserve captions as structured content.
:::

::: figure
::: success
Gallery items can be mixed media or content previews.
:::

--- caption
Useful for product shots, reports, and portfolios.
:::

:::

::: media
!video https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4
:::

::: image src="https://placehold.co/1200x675/eef2e6/1f2a22?text=Canvas+Preview" alt="Canvas placeholder"
--- caption
Image blocks can be framed while still exporting plain HTML.
:::

::: video src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"
--- caption
Video blocks support framing and progressive enhancement.
:::

::: testimonials
::: testimonial author="Ava Chen" role="Content lead"
MDS feels like writing notes, but those notes can render as a polished page.
:::

::: testimonial author="Noah Patel" role="Frontend engineer"
The block vocabulary is small enough to remember and flexible enough to extend.
:::
:::

::: pricing plans
::: pricing-plan creator price="$9"
## Creator
For writers and solo builders.

- Component blocks
- Standalone HTML export
- Visual presets

[Start -> #contact]
:::

::: pricing-plan team price="$29" highlighted
## Team
For teams producing repeatable content systems.

- Shared design folders
- Rich component blocks
- Review-friendly Markdown

[Choose team -> #contact]
:::

::: pricing-plan custom price="Custom"
## Platform
For generated content workflows and app integrations.

- Custom app handlers
- Extended components
- Branded output

[Talk to us -> #contact]
:::
:::

::: cta
## Build a page from intent
Use Markdown for content and MDS blocks for structure. Let MDS render the interface.

[Open dialog !open componentDialog]
[Show drawer !show componentDrawer]
:::

::: dialog componentDialog
## Dialog component
Dialogs are semantic overlays controlled through native MDS actions.

[Close !close componentDialog]
:::

::: drawer componentDrawer
## Drawer component
Drawers are useful for secondary navigation, related resources, and compact forms.

[Hide !hide componentDrawer]
:::

::: tabs componentTabs

--- Authoring
Write readable content using semantic blocks.

--- Rendering
MDS maps blocks to HTML, CSS, and JavaScript.

--- Output
Publish one standalone HTML file.

:::

::: accordion componentAccordion

--- Why blocks?
Blocks give renderers a stable semantic contract.

--- Why attributes?
Attributes provide compact advanced options without turning MDS into HTML.

:::

::: faq

::: details
# Can unsupported blocks still render?

Yes. Unknown blocks should preserve readable content through renderer fallback.
:::

::: details
# Should every renderer implement everything?

No. The shared vocabulary is a roadmap, not a closed grammar.
:::

:::

::: popover label="Read implementation note"
Popover content is native and readable. Placement can be enhanced without changing MDS syntax.
:::

::: tooltip label="What is a tooltip?"
Short contextual help that appears on hover or focus.
:::

::: api

::: endpoint method="POST" path="/v1/render"
Render an MDS document into standalone HTML.
:::

::: endpoint method="GET" path="/v1/renderers/:name"
Resolve renderer metadata, supported blocks, assets, and diagnostics.
:::

:::

::: file-tree
\`\`\`txt
content
├─ landing.mds
├─ docs.mds
└─ assets
   ├─ preview.png
   └─ demo.mp4
\`\`\`
:::

::: terminal title="Install"
\`\`\`sh
pnpm install
pnpm dev:editor
\`\`\`
:::

::: code-group

--- Markdown
\`\`\`mds
::: stat value="12k+" label="Pages generated"
Standalone HTML from semantic Markdown.
:::
\`\`\`

--- HTML output
\`\`\`html
<article class="stat">
  <strong>12k+</strong>
</article>
\`\`\`

:::

::: form contact validate
::: fieldset legend="Lead details"
? email 邮箱 邮箱地址
? role 选择 你的身份
- 内容创作者
- 设计师
- 开发者
:::

::: fieldset legend="Project brief"
? message 长文本 想构建什么？
:::

::: button-group
[Submit !submit contact]
[Open dialog !open componentDialog]
:::
:::
`
  },
  {
    id: "motion",
    label: "Motion",
    source: `---
title: Motion And Attributes
---

# Motion And Attributes

::: hero motion="fade-up" delay=80
--- title
# Motion is an MDS block capability

--- body
MDS keeps animation declarative while the output stays standalone HTML.
:::

::: motion preset="fade-up" trigger="view" stagger=90

::: card
## First card
This card is inside a motion wrapper.
:::

::: card
## Second card
The wrapper can stagger its children.
:::

::: card
## Third card
No animation runtime belongs to MDS core.
:::

:::

::: section custom-section tone="quiet" columns=3
## Custom block attrs
Attributes are preserved for renderers and advanced components.
:::
`
  },
  {
    id: "actions",
    label: "Actions",
    source: `---
title: Action Cases
description: Native and custom app actions in one document.
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

Native actions can toggle, open, or close this details block.
:::

[Toggle details !toggle actionDetails]
[Open details !open actionDetails]
[Close details !close actionDetails]

::: dialog actionDialog
# Dialog Target

This is controlled by MDS actions.

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
