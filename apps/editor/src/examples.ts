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
title: Foundation-first Component Gallery
description: Native controls, forms, menus, interaction, data, documentation, media, and conversation blocks.
---

::: hero
--- title
# UI blocks

--- body
Start with the controls people use every day. Add structure, data, documentation, media, and conversation patterns next. Motion remains an optional presentation layer.

--- actions
[Explore controls -> #foundationControls]
[See interactions -> #interactions]
:::

::: section foundationControls
## 1. Foundation blocks

Identity, navigation, controls, forms, and menus render as native HTML first. Theme JavaScript may enhance them, but it is not required for basic behavior.

::: breadcrumb label="Project location"
::: breadcrumb-item label="Home" href="/"
:::
::: breadcrumb-item label="Projects" href="/projects"
:::
::: breadcrumb-item label="MDS" href="#foundationControls" current="page"
:::
:::

::: item variant="outline"
--- media
::: avatar src="https://placehold.co/160x160/255c99/ffffff?text=MD" alt="MDS project" fallback="MD"
:::

--- title
## MDS project

--- description
A portable semantic authoring system with native-first foundation blocks.

--- actions
::: button label="Open" action="open" target="componentDialog"
:::

--- footer
Updated today
:::

::: pagination label="Component pages" current=1 pages=3
[Previous -> #foundationControls]
[Next -> #interactions]
:::

::: empty
--- title
## No saved presets

--- description
Create a preset when the default foundation is not enough.

--- actions
::: button label="Create preset" type="button"
:::
:::

### Controls, forms, and menus

::: button-group
::: button label="Save settings" type="submit" form="foundationForm"
:::
::: button label="Reset" type="reset" form="foundationForm"
:::
::: button label="Open dialog" action="open" target="componentDialog"
:::
:::

::: toggle-group label="Preview options"
::: toggle label="Pin details" pressed=true action="toggle" target="componentDetails"
:::
::: toggle label="Compact mode" pressed=false action="toggle" target="foundationControls"
:::
:::

::: form foundationForm method="post"
::: fieldset legend="Profile"
::: input label="Display name" name="displayName" placeholder="Ada Lovelace" autocomplete="name" required
:::

::: textarea label="About" name="about" placeholder="What are you building?" rows=4
:::

::: input-group label="Project URL" name="projectUrl" placeholder="mds" autocomplete="url"
--- prefix
https://

--- suffix
.dev

--- actions
::: button label="Check" type="button"
:::

--- help
Choose a short public project URL.
:::

::: input-otp label="Verification code" name="verificationCode" length=6 pattern="[0-9]*" placeholder="000000" required
--- help
Paste the six-digit code from your authenticator.
:::

::: combobox label="Framework" name="framework" list="framework-options" placeholder="Choose a framework" autocomplete="off" required
::: option label="React" value="react"
:::
::: option label="Vue" value="vue"
:::
::: option label="Svelte" value="svelte"
:::
:::

::: calendar label="Release date" name="releaseDate" value="2026-08-21" month="2026-08" min="2026-08-01" max="2026-09-30" weekstart=1 required
:::

::: select label="Workspace" name="workspace" required
::: option label="Personal" value="personal" selected
:::
::: option label="Team" value="team"
:::
:::
:::

::: fieldset legend="Preferences"
::: checkbox label="Include release notes" name="releaseNotes" checked
:::

::: radio-group legend="Editor density"
::: radio label="Comfortable" name="density" value="comfortable" checked
:::
::: radio label="Compact" name="density" value="compact"
:::
:::

::: slider label="Preview scale" name="scale" min=50 max=150 step=10 value=100
:::

::: switch label="Email notifications" name="notifications" checked
:::
:::
:::

::: command label="Command palette" placeholder="Search commands..." empty="No matching commands."
::: menu label="Commands"
::: menu-group label="Navigation"
::: menu-item label="Open dialog" keywords="modal preview" shortcut="⌘1" action="open" target="componentDialog"
:::
::: menu-item label="Show drawer" keywords="panel sidebar" shortcut="⌘2" action="show" target="componentDrawer"
:::
::: menu-item label="Toggle details" keywords="disclosure notes" shortcut="⌘3" action="toggle" target="componentDetails"
:::
:::
::: menu-separator
:::
::: menu-item label="Close dialog" keywords="dismiss modal" shortcut="Esc" action="close" target="componentDialog"
:::
:::
:::

::: dropdown label="File actions"
::: menu label="File actions"
::: menu-group label="Document"
::: menu-item label="Open dialog" action="open" target="componentDialog"
:::
::: menu-item label="Show drawer" action="show" target="componentDrawer"
:::
:::
::: menu-separator
:::
::: menu-item label="Close dialog" action="close" target="componentDialog"
:::
:::
:::
:::

::: context-menu label="Right-click file canvas"
::: menu label="File canvas actions"
::: menu-item label="Open dialog" shortcut="↵" action="open" target="componentDialog"
:::
::: menu-item label="Show drawer" shortcut="⇧D" action="show" target="componentDrawer"
:::
::: menu-separator
:::
::: menu-item label="Close dialog" shortcut="Esc" action="close" target="componentDialog"
:::
:::
:::

::: menubar label="Editor menu"
::: dropdown label="File"
::: menu label="File"
::: menu-item label="Open" shortcut="⌘O" action="open" target="componentDialog"
:::
::: menu-item label="Close" shortcut="⌘W" action="close" target="componentDialog"
:::
:::
:::
::: dropdown label="View"
::: menu label="View"
::: menu-item label="Toggle details" shortcut="⌘D" action="toggle" target="componentDetails"
:::
::: menu-item label="Show drawer" shortcut="⌘B" action="show" target="componentDrawer"
:::
:::
:::
:::

::: section interactions
## 2. Interaction and disclosure

::: details componentDetails
# Native details target

The toggle control above uses the existing action contract to open and close this native disclosure.
:::

::: tabs componentTabs

--- Controls
Buttons, form fields, switches, and sliders use native elements.

--- Composition
Tabs and other containers organize semantic child content.

--- Output
The result remains standalone HTML.

:::

::: accordion componentAccordion

--- Why native first?
The page remains usable before progressive enhancement runs.

--- Why keep actions separate?
Themes and applications can handle commands without changing the block AST.

:::

::: carousel
::: card
## Keyboard-friendly content
Carousel content remains readable when no carousel behavior is installed.
:::
::: card
## Theme-owned enhancement
Themes may add scrolling controls without redefining the block.
:::
:::

::: popover label="Read implementation note"
Popover content is native and readable. Placement can be enhanced without changing MDS syntax.
:::

::: tooltip label="What is a tooltip?"
Short contextual help that appears on hover or focus.
:::

::: calendar label="Plan a review window" mode="range" name="reviewWindow" value="2026-08-18..2026-08-22" month="2026-08" weekstart=1
:::

::: dialog componentDialog
## Dialog component
Dialogs use the existing open and close actions.

[Close !close componentDialog]
:::

::: drawer componentDrawer
## Drawer component
Drawers reuse the same show and hide contract.

[Hide !hide componentDrawer]
:::
:::

::: section structure
## 3. Structure and guidance

::: nav label="Component sections"
[Controls -> #foundationControls]
[Interactions -> #interactions]
[Data and docs -> #dataAndDocs]
[Presentation -> #presentation]
:::

::: split

--- left
::: steps
::: step
## Write
Write headings, paragraphs, lists, and links.
:::

::: step
## Compose
Describe controls, forms, menus, and content structure.
:::

::: step
## Render
Themes style and progressively enhance the shared contract.
:::
:::

--- right
::: timeline
::: step date="Now"
## Now
Prioritize reusable controls and readable native fallbacks.
:::

::: step date="Later"
## Later
Add domain-specific layouts in the owning theme or application when the document needs them.
:::
:::

:::

::: grid-3
::: card
::: badge
Core
:::
## Content containers
Cards, grids, sections, asides, and callouts establish readable structure.
:::

::: card
::: tag
Guidance
:::
## Ordered explanation
Steps and timelines explain sequences without custom layout syntax.
:::

::: card
::: tag
Portable
:::
## Theme-independent intent
The same source can render through different themes.
:::
:::

::: note
Foundation blocks should work before optional presentation blocks are added.
:::

::: warning
Do not use a switch where a one-time action button is intended.
:::

::: quote
Choose semantic intent first; let the selected theme own presentation.
:::
:::

::: section dataAndDocs
## 4. Data and documentation

::: comparison
::: card
## Native foundation
- Controls have browser semantics.
- Forms submit normal values.
- Menus retain readable content.
:::

::: card
## Optional enhancement
- Themes add visual states.
- Applications register custom actions.
- Motion remains declarative.
:::
:::

::: metric value="100" label="Shared block vocabulary"
Foundation and specialized profiles compose without duplicating theme templates.
:::

::: progress value=100 max=100 label="Foundation example coverage"
This example starts with the controls required by everyday documents and applications.
:::

::: chart label="Weekly rendered documents" type="bar"
::: chart-series label="Documents"
::: chart-point label="Monday" value=42 max=80
:::
::: chart-point label="Tuesday" value=58 max=80
:::
::: chart-point label="Wednesday" value=71 max=80
:::
::: chart-point label="Thursday" value=64 max=80
:::
:::

--- description
Native meter elements keep every value readable without a chart runtime.

--- legend
Documents rendered per day.
:::

::: data-table label="Release queue" filter="Filter releases" page-size=3 selectable
--- columns
::: data-column key="status" label="Status" sortable
:::
::: data-column key="package" label="Package" sortable
:::
::: data-column key="version" label="Version" sortable
:::

--- rows
::: data-row releaseBlocks selected
::: data-cell column="status"
Ready
:::
::: data-cell column="package"
@mds-crate/blocks
:::
::: data-cell column="version"
0.2.0
:::
:::
::: data-row releaseEditor
::: data-cell column="status"
Review
:::
::: data-cell column="package"
@mds-crate/editor
:::
::: data-cell column="version"
0.1.0
:::
:::
::: data-row releaseDefault
::: data-cell column="status"
Ready
:::
::: data-cell column="package"
@mds-crate/theme-default
:::
::: data-cell column="version"
0.2.0
:::
:::
::: data-row releaseCli
::: data-cell column="status"
Queued
:::
::: data-cell column="package"
@mds-crate/cli
:::
::: data-cell column="version"
0.1.0
:::
:::

--- empty
No releases match this filter.
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
content/
- landing.mds
- docs.mds
- assets/
:::

::: terminal title="Install"
pnpm install
pnpm dev:editor
:::

::: code-group
--- Markdown
A semantic block stays readable in source.

--- HTML output
The selected theme maps that intent to ordinary HTML.
:::
:::

::: section mediaBlocks
## 5. Media

::: gallery
::: figure
::: info
A figure can contain media, generated artwork, or a nested semantic block.
:::

--- caption
Figure blocks preserve captions as structured content.
:::

::: figure
::: success
Gallery items can mix media and semantic content previews.
:::

--- caption
Useful for reports, documentation, and portfolios.
:::
:::

::: image src="https://placehold.co/1200x675/eef2e6/1f2a22?text=MDS+Preview" alt="MDS placeholder preview"
--- caption
Image blocks still export ordinary HTML.
:::

::: video src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"
--- caption
Video blocks use native playback controls.
:::
:::

::: section chatBlocks
## 6. Conversation and attachments

Chat blocks describe portable conversation content without owning transport, model state, or persistence.

::: message-scroller label="Build conversation" follow=true height="24rem"
::: marker variant="separator" label="Today"
:::

::: message align="start" sender="MDS" status="Delivered"
--- avatar
::: avatar fallback="MD" alt="MDS"
:::

--- body
::: bubble variant="secondary" align="start"
The shared block pack now includes calendars, data tables, charts, menus, and chat composition.

--- reactions
✅ 4
:::

--- footer
10:24
:::

::: message align="end" sender="You" status="Read"
--- body
::: bubble variant="default" align="end"
Can I attach the release manifest?
:::

--- footer
10:25
:::

::: message align="start" sender="MDS"
--- body
::: bubble variant="ghost" align="start"
Yes. Attachments keep their file metadata and progress state readable.
:::

::: attachment title="release-manifest.json" href="/release-manifest.json" type="JSON" size="18 KB" state="done" download
--- description
Generated package versions and integrity hashes.
:::
:::

::: marker variant="border" role="status" label="All package checks passed"
:::
:::
:::

::: section advancedMotion
## 7. Advanced motion

Action and motion contracts remain separate from the new foundation blocks.

::: scene variant="spotlight"
## Scene variant
Scene blocks describe richer composed sections without adding runtime concepts to the parser.

::: reveal preset="reveal" duration=720
Reveal preserves motion intent for themes that choose to implement it.
:::
:::

::: motion preset="fade-up" trigger="view" stagger=80
::: card
## First motion item
The content remains readable if motion is disabled.
:::
::: card
## Second motion item
Reduced-motion preferences remain a theme responsibility.
:::
:::
:::

::: footer
Foundation first. Presentation when needed. Standalone HTML at the end.
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
