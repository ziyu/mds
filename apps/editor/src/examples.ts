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
::: callout tone="info" label="MDS"
Write content. Preview the result. Ship standalone HTML.
:::
:::

::: nav main
[Authoring -> #authoring]
[Design => #design]
[Contact => #contact]
:::

::: grid motion="fade-up" delay=180 stagger=90

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

::: callout tone="warning" label="Authoring note"
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

::: details faq label="What is MDS?"
MDS is a semantic layer on top of Markdown.
:::
`
  },
  {
    id: "components",
    label: "Components",
    source: `---
title: Shared Block Gallery
description: The 64 portable blocks exported by @mds-crate/blocks, with native-first structure, controls, forms, menus, media, actions, and motion.
---

::: page componentGallery
::: header componentHeader
# UI blocks

This gallery is intentionally limited to the 64 portable primitives exported by \`@mds-crate/blocks\`. Theme-owned extensions belong in theme-specific examples.

::: nav label="Component gallery"
[Explore controls -> #foundationControls]
[See interactions -> #interactions]
[Review structure -> #structure]
[Open media -> #mediaBlocks]
:::
:::

::: callout tone="info" label="Scope"
Every explicit block in this example comes from the shared package. Unknown, compatibility-only, and Rich-owned names are excluded.
:::

::: section foundationControls
## 1. Foundation blocks

Identity, navigation, controls, forms, and menus render as native HTML first. Theme JavaScript may enhance them, but it is not required for basic behavior.

::: breadcrumb label="Project location"
:: breadcrumb-item label="Home" href="/"
:: breadcrumb-item label="Projects" href="/projects"
:: breadcrumb-item label="MDS" href="#foundationControls" current="page"
:::

::: item variant="outline"
--- media
:: avatar src="https://placehold.co/160x160/255c99/ffffff?text=MD" alt="MDS project" fallback="MD"

--- title
## MDS project

--- description
A portable semantic authoring system with native-first foundation blocks.

--- actions
:: button label="Open" action="open" target="componentDialog"

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
:: button label="Create preset" type="button"
:::

### Controls, forms, and menus

::: button-group
:: button label="Save settings" type="submit" form="foundationForm"
:: button label="Reset" type="reset" form="foundationForm"
:: button label="Open dialog" action="open" target="componentDialog"
:::

::: toggle-group label="Preview options"
:: toggle label="Pin details" pressed=false action="toggle" target="componentDetails"
:: toggle label="Compact mode" pressed=false
:::

::: form foundationForm method="post"
::: fieldset legend="Profile"
::: field invalid=true
:: label text="Validation anatomy"
::: help
Supporting guidance belongs next to its control.
:::
::: error
This example shows the shared validation-message structure.
:::
:::

:: input label="Workspace handle" name="workspaceHandle" placeholder="mds-core" required invalid=true

:: input label="Display name" name="displayName" placeholder="Ada Lovelace" autocomplete="name" required

:: textarea label="About" name="about" placeholder="What are you building?" rows=4

::: input-group label="Project URL" name="projectUrl" placeholder="mds" autocomplete="url"
--- prefix
https://

--- suffix
.dev

--- actions
:: button label="Check" type="button"

--- help
Choose a short public project URL.
:::

::: input-otp label="Verification code" name="verificationCode" length=6 pattern="[0-9]*" placeholder="000000" required
--- help
Paste the six-digit code from your authenticator.
:::

::: combobox label="Framework" name="framework" list="framework-options" placeholder="Choose a framework" autocomplete="off" required
:: option label="React" value="react"
:: option label="Vue" value="vue"
:: option label="Svelte" value="svelte"
:::

:: calendar label="Release date" name="releaseDate" value="2026-08-21" month="2026-08" min="2026-08-01" max="2026-09-30" weekstart=1 required

::: select label="Workspace" name="workspace" required
:: option label="Personal" value="personal" selected
:: option label="Team" value="team"
:::
:::

::: fieldset legend="Preferences"
:: checkbox label="Include release notes" name="releaseNotes" checked

::: radio-group legend="Editor density"
:: radio label="Comfortable" name="density" value="comfortable" checked
:: radio label="Compact" name="density" value="compact"
:::

:: slider label="Preview scale" name="scale" min=50 max=150 step=10 value=100

:: switch label="Email notifications" name="notifications" checked
:::
:::

::: command label="Command palette" placeholder="Search commands..." empty="No matching commands."
::: menu label="Commands"
::: menu-group label="Navigation"
:: menu-item label="Open dialog" keywords="modal preview" shortcut="⌘1" action="open" target="componentDialog"
:: menu-item label="Show drawer" keywords="panel sidebar" shortcut="⌘2" action="show" target="componentDrawer"
:: menu-item label="Toggle details" keywords="disclosure notes" shortcut="⌘3" action="toggle" target="componentDetails"
:::
:: menu-separator
:: menu-item label="Close dialog" keywords="dismiss modal" shortcut="Esc" action="close" target="componentDialog"
:::
:::

::: dropdown label="File actions"
::: menu label="File actions"
::: menu-group label="Document"
:: menu-item label="Open dialog" action="open" target="componentDialog"
:: menu-item label="Show drawer" action="show" target="componentDrawer"
:::
:: menu-separator
:: menu-item label="Close dialog" action="close" target="componentDialog"
:::
:::
:::

::: context-menu label="Right-click file canvas"
::: menu label="File canvas actions"
:: menu-item label="Open dialog" shortcut="↵" action="open" target="componentDialog"
:: menu-item label="Show drawer" shortcut="⇧D" action="show" target="componentDrawer"
:: menu-separator
:: menu-item label="Close dialog" shortcut="Esc" action="close" target="componentDialog"
:::
:::

::: menubar label="Editor menu"
::: dropdown label="File"
::: menu label="File"
:: menu-item label="Open" shortcut="⌘O" action="open" target="componentDialog"
:: menu-item label="Close" shortcut="⌘W" action="close" target="componentDialog"
:::
:::
::: dropdown label="View"
::: menu label="View"
:: menu-item label="Toggle details" shortcut="⌘D" action="toggle" target="componentDetails"
:: menu-item label="Show drawer" shortcut="⌘B" action="show" target="componentDrawer"
:::
:::
:::

::: section interactions
## 2. Interaction and disclosure

::: details componentDetails label="Native details target"
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

:: calendar label="Plan a review window" mode="range" name="reviewWindow" value="2026-08-18..2026-08-22" month="2026-08" weekstart=1

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
## 3. Structure and status

::: nav label="Component sections"
[Controls -> #foundationControls]
[Interactions -> #interactions]
[Media -> #mediaBlocks]
[Presentation -> #presentation]
:::

::: split

--- left
::: aside
### Primitive boundary

Shared blocks cover structure, native controls, forms, menus, compact status, media semantics, interaction containers, and motion wrappers.
:::

--- right
::: details componentBoundary label="Primitive boundary details"
# What stays outside?

Data systems, documentation layouts, guided sequences, galleries, and conversation UI remain theme or application extensions.
:::

:::

::: grid
::: card
::: badge
Core
:::
## Content containers
Cards, grids, sections, asides, and callouts establish readable structure.
:::

::: card
::: badge tone="info"
Native
:::
## Browser semantics
Inputs, menus, progress, media, and disclosure remain useful without an application runtime.
:::

::: card
::: badge tone="success"
Portable
:::
## Theme-independent intent
The same source can render through different themes.
:::
:::

::: callout tone="info" label="Portable"
The shared contract stays compact enough for every theme to compose selectively.
:::

::: callout tone="warning" label="Control choice"
Do not use a switch where a one-time action button is intended.
:::

::: quote
Choose semantic intent first; let the selected theme own presentation.
:::

::: progress value=64 max=64 label="Shared primitive coverage"
The example covers the complete shared vocabulary boundary without pulling in a richer theme pack.
:::
:::

::: section mediaBlocks
## 4. Native media

::: figure
![MDS preview](https://placehold.co/1200x675/eef2e6/1f2a22?text=MDS+Preview)

::: caption
Figure and caption provide portable media semantics without defining a gallery system.
:::
:::

::: video src="https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"
--- caption
Video blocks use native playback controls.
:::
:::

::: section advancedMotion
## 5. Motion primitives

Motion stays declarative: the document describes intent and the theme owns timing, easing, and reduced-motion behavior.

::: scene variant="spotlight"
## Scene: a visual stage
Use Scene to create a distinct editorial moment. Its variant changes atmosphere; Scene is not an animation timeline.

::: reveal preset="reveal" delay=120 duration=820
Reveal treats this nested content as one region entering the viewport.
:::
:::

::: motion preset="fade-up" trigger="view" stagger=140 once=false
::: card
## Motion: grouped choreography
The first child starts when the wrapper enters the viewport.
:::
::: card
## Staggered child
The second child follows 140 milliseconds later.
:::
:::
:::

::: footer
Foundation first. Presentation when needed. Standalone HTML at the end.
:::
:::
`
  },
  {
    id: "motion",
    label: "Motion",
    source: `---
title: Motion Primitives
description: Three small contracts for grouped choreography, single-region reveals, and visual staging.
---

::: hero motion="fade-up" trigger="load" delay=120 duration=900
--- title
# Motion belongs to the theme

--- body
MDS preserves motion intent. The selected theme decides how movement feels, while the content stays readable without animation.
:::

::: section
## Reveal one region

::: reveal preset="blur-in" delay=80 duration=760
This whole region enters together. Use Reveal for a single message, image, or composed piece of content.
:::
:::

::: section
## Choreograph a group

::: motion preset="fade-up" trigger="view" stagger=160 once=false

::: card
## First card
The wrapper begins when it enters the viewport.
:::

::: card
## Second card
This child follows 160 milliseconds later.
:::

::: card
## Third card
Scroll away and return: \`once=false\` allows the sequence to replay.
:::

:::
:::

::: scene variant="spotlight"
## Stage a scene

Scene creates a visually distinct editorial surface. It may animate on entry, but its primary job is staging—not sequencing children.

::: reveal preset="slide-left" delay=180 duration=820
This nested Reveal remains an independent motion region inside the scene.
:::
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
