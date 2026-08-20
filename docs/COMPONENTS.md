# MDS Component Blocks

This document plans the component block system for MDS themes.

MDS components are semantic blocks. They are not framework components, JSX tags, or HTML shortcuts. The shared blocks layer owns portable semantics and baseline behavior; a theme decides how those semantics look and how theme-owned extensions behave. The final output remains standalone HTML.

For the shared blocks layer that turns this vocabulary into reusable block packs and theme overrides, see [BLOCK_LAYER.md](./BLOCK_LAYER.md).

## Goals

- Cover common document scenarios: documentation, reports, portfolios, courses, and AI-generated interactive explanations.
- Keep authoring natural for non-developers.
- Let advanced authors use attributes when a theme explicitly exposes variants.
- Keep unknown or unsupported blocks renderable through safe fallback HTML.
- Let themes implement rich components without adding new core syntax.
- Make the editor Components example a broad visual regression page for theme authors.

## Non-Goals

- MDS will not require a framework, virtual DOM, or custom-element runtime. Compact block-pack enhancement scripts remain valid when they provide portable behavior that native HTML cannot express alone.
- MDS will not require React, JSX, Tailwind, shadcn, or any package at runtime.
- MDS will not expose arbitrary event handlers in documents.
- MDS will not try to standardize every visual variant across all themes.
- MDS will not make attributes the primary authoring style.

## Design Principles

1. **Semantic first**

   Authors should write what the content means:

   ```mds
   ::: warning
   Back up the workspace before continuing.
   :::
   ```

   They should not need to describe implementation details:

   ```mds
   ::: div class="rounded-card shadow-lg"
   ```

2. **Blocks compose blocks**

   Complex components should use nested blocks and slots instead of large attribute payloads:

   ```mds
   ::: cards
   ::: card
   ## First item
   Reusable content.
   :::
   :::
   ```

3. **Leaf blocks stay on one line**

   Blocks without Markdown content, slots, or child blocks use `::` and need no closing fence:

   ```mds
   :: button label="Save" type="submit"
   :: slider label="Volume" min=0 max=100 value=50
   ```

4. **Attributes are compact configuration**

   Attributes should handle small options such as `tone`, `variant`, `columns`, `value`, `motion`, and `duration`.

5. **Blocks own portable behavior; themes own presentation**

   MDS core parses and preserves the block. `@mds-crate/blocks` defines its minimal native structure, ARIA, stable state, and cross-theme interaction. Canvas, Clarity, or a user theme decides typography, color, spacing, responsive layout, surfaces, and visual motion presets.

6. **Implement only the declared semantics**

   A block implementation styles and enhances the smallest native structure required by its contract. It must not silently add visible copy, metadata, controls, cards, or layout. Compose those concerns explicitly with Markdown, outer blocks, or declared slots.

   For example, `:: progress value=5 max=100 label="Upload progress"` renders a progress indicator whose label is an accessible name. The theme may style the track and fill, but must not add a card, a visible heading, or a `5/100` summary.

7. **Native HTML before custom JavaScript**

   Use native anchors, buttons, forms, details, dialog-like overlays, and media semantics where possible. Shared block JavaScript may progressively enhance behavior, but themes must not replace a portable state machine with a different meaning.

8. **Fallback must be readable**

   Unsupported blocks should still render content in a safe container with a diagnostic when appropriate.

## Component Coverage Matrix

This matrix is the authoring vocabulary, not a promise that every name lives in the shared package. The 64 portable primitives come from `@mds-crate/blocks`. Richer layout aliases, data systems, technical-documentation structures, guided sequences, galleries, and conversation blocks are implemented by `@mds-crate/theme-rich`; other themes may implement their own subsets or extensions.

### Page Structure

| Block | Purpose | Recommended Content |
| --- | --- | --- |
| `page` | Top-level page shell. | Whole document body. |
| `hero` | Primary first-viewport message. | `title`, `body`, `media`, `actions` slots. |
| `section` | Generic content section. | Headings, paragraphs, nested blocks. |
| `header` | Page or section header. | Title, eyebrow, summary, actions. |
| `footer` | Footer content. | Links, copyright, notes. |
| `aside` | Secondary contextual content. | Notes, links, supporting copy. |
| `sticky` | Sticky supporting panel. | Outline, status, related links. |
| `divider` | Visual section separator. | Optional label. |
| `spacer` | Intentional spacing. | Usually empty; advanced use only. |

### Layout

| Block | Purpose | Recommended Content |
| --- | --- | --- |
| `split` | Two-column layout. | `left` and `right` slots, or nested blocks. |
| `grid` | Generic responsive grid. | Cards, figures, and repeated items. |
| `grid-2` | Two-column grid. | Repeated child blocks. |
| `grid-3` | Three-column grid. | Repeated child blocks. |
| `grid-auto` | Auto-fit grid. | Repeated child blocks. |
| `stack` | Vertical grouping with theme spacing. | Any block sequence. |
| `cluster` | Wrapping inline group. | Badges, buttons, small items. |
| `cards` | Card collection. | Nested `card` blocks. |
| `card` | General framed item. | Heading, paragraph, action. |

### Information And Guidance

| Block | Purpose | Recommended Content |
| --- | --- | --- |
| `note` | Neutral note. | Short contextual copy. |
| `info` | Informational callout. | Explanation or hint. |
| `warning` | Warning callout. | Risk or caution. |
| `danger` | High-risk warning. | Destructive or critical info. |
| `success` | Positive status. | Completed action or good state. |
| `callout` | Generic callout with `tone`. | Any short content. |
| `quote` | Pull quote or citation. | Quoted content and attribution. |
| `details` | Native expandable detail. | Summary/title and content. |
| `faq` | FAQ group. | Nested `details` or `qa` blocks. |
| `timeline` | Sequential events. | Nested `step` or `event` blocks. |
| `steps` | Process steps. | Nested `step` blocks. |
| `step` | One step in a process. | Heading, body, optional media. |

### Data And Comparison

| Block | Purpose | Recommended Content |
| --- | --- | --- |
| `table` | Tabular data. | Markdown table or rendered children. |
| `data-table` | Filterable, sortable, paged native table. | `columns`, `rows`, and `empty` slots. |
| `data-column` | Data-table column definition. | `key`, `label`, optional `sortable`. |
| `data-row` | Data-table row. | Nested `data-cell` blocks. |
| `data-cell` | Data-table cell. | `column` key and cell Markdown. |
| `chart` | Accessible chart surface. | Nested `chart-series` blocks and description/legend slots. |
| `chart-series` | Named chart series. | Nested `chart-point` blocks. |
| `chart-point` | Native meter-backed numeric value. | `label`, `value`, and `max`. |
| `comparison` | Compare options/features. | Nested cards or markdown table. |
| `metric` | Highlighted metric. | `value`, `label`, optional body. |
| `progress` | Native progress indicator. | `value`, `max`, optional accessible `label`; visible copy is composed separately. |
| `badge` | Small status label. | Short text, optional `tone`. |
| `tag` | Category label. | Short text. |
| `kbd` | Keyboard key/chord. | Key text. |

### Media

| Block | Purpose | Recommended Content |
| --- | --- | --- |
| `media` | Generic media frame. | Image/video/embed fallback. |
| `image` | Theme-controlled image block. | Image markdown or `src` attr. |
| `video` | Video embed/frame. | URL or fallback content. |
| `figure` | Figure with caption. | Media plus caption slot/content. |
| `caption` | Caption text. | Short explanatory text. |
| `gallery` | Media gallery. | Nested `figure` or `image` blocks. |

### Interactive Presentation

| Block | Purpose | Recommended Content |
| --- | --- | --- |
| `tabs` | Tabbed content. | Named slots. |
| `accordion` | Stacked collapsible sections. | Named slots or nested details. |
| `carousel` | Horizontal browsing. | Nested item blocks. |
| `dialog` | Theme overlay dialog. | Content and close action. |
| `drawer` | Theme side drawer. | Content and close action. |
| `popover` | Small contextual panel. | Short content. |
| `tooltip` | Lightweight hover/focus explanation. | Short text only. |
| `command` | Searchable menu composition. | Existing menu blocks. |
| `context-menu` | Right-click menu with disclosure fallback. | Existing menu blocks. |
| `menubar` | Persistent application menu bar. | Nested dropdown/menu blocks. |

### Forms And Inputs

| Block | Purpose | Recommended Content |
| --- | --- | --- |
| `form` | Native form container. | Field shorthand and actions. |
| `fieldset` | Group related fields. | Fields and legend heading. |
| `input` | Text-like input. | Attributes for type/name/label. |
| `input-group` | Input with addons/actions/help. | Named slots. |
| `input-otp` | Native one-time-code field. | Help and error slots. |
| `combobox` | Native autocomplete selection. | Nested `option` blocks. |
| `calendar` | Single, range, or multiple date selection. | Attributes for mode/value/limits/locale. |
| `select` | Select control. | Options as list items. |
| `textarea` | Long text input. | Label/placeholder. |
| `checkbox` | Boolean input. | Label text. |
| `radio` | Single option in a group. | Label text. |
| `switch` | Toggle-like checkbox. | Label text. |
| `button-group` | Related actions. | Action links/buttons. |

### Conversation

| Block | Purpose | Recommended Content |
| --- | --- | --- |
| `attachment` | File/image attachment with state. | Metadata attrs plus media/description/actions slots. |
| `bubble` | Conversational content surface. | Markdown and optional reactions slot. |
| `marker` | Status note or separator. | Label/content and optional icon slot. |
| `message` | Conversation row. | Avatar/header/body/footer slots. |
| `message-scroller` | Focusable live transcript. | Nested messages, markers, attachments. |

### Technical Documentation

| Block | Purpose | Recommended Content |
| --- | --- | --- |
| `code` | Code block wrapper. | Fenced code or children. |
| `code-group` | Multi-language/file code switcher. | Named slots. |
| `terminal` | Terminal transcript. | Shell commands/output. |
| `file-tree` | File tree display. | Indented text or list. |
| `api` | API reference group. | Nested `endpoint` blocks. |
| `endpoint` | Single API endpoint. | Method/path attrs, body. |

### Motion And Advanced Composition

| Block | Purpose | Recommended Content |
| --- | --- | --- |
| `motion` | Coordinates a preset across a group. | Multiple child blocks, optionally using `stagger`. |
| `reveal` | Reveals one content region as a unit. | A heading, paragraph, media item, or composed region. |
| `scene` | Establishes a visually distinct stage. | Theme-defined composition selected through `variant`; not a timeline. |

## Priority Plan

### Phase 1: Broad Content MVP

Status: implemented in Canvas.

Implement these first in Canvas because they unlock most examples:

```txt
steps / step
timeline
gallery / figure / caption
comparison
badge / tag / metric / progress
terminal
code-group
```

Phase 1 should avoid heavy JavaScript. Most blocks can be static HTML/CSS.

### Phase 2: Interaction And Documentation Depth

Status: implemented in Canvas as static or native-first components.

```txt
faq
popover
tooltip
file-tree
api / endpoint
fieldset
button-group
```

Phase 2 should keep interaction lightweight. `faq` uses nested `details`, `popover` uses native `details`, and `tooltip` uses CSS hover/focus behavior. Technical documentation blocks such as `file-tree`, `api`, and `endpoint` should remain readable without JavaScript.

### Phase 3: Advanced Theme Capabilities

Status: implemented in Canvas as progressive enhancement.

```txt
scene variants
reveal
video enhancements
gallery lightbox
code-group tab switching
form validation UI
```

Phase 3 can add progressive enhancement scripts where native HTML is not enough.

The Canvas implementation keeps the no-JavaScript fallback readable:

- `scene` variants are CSS-driven through `variant`.
- `reveal` is a normal block whose trigger lifecycle is portable while the selected theme supplies the visible preset.
- `video`, `image`, and generic `media` blocks provide theme framing around native media.
- Gallery lightbox enhances existing `figure` blocks; without JavaScript, figures stay inline.
- `code-group` tab switching enhances named slots; without JavaScript, all code panels remain visible.
- Form validation is opt-in with a `validate` block attribute and uses native controls plus shared validation state hooks. Themes style the status UI; applications still own submission and server-side validation.

## Authoring Patterns

### Steps

```mds
::: steps
::: step
## Write Markdown
Start with ordinary content.
:::

::: step
## Add semantic blocks
Describe layout and intent.
:::

::: step
## Choose a theme
Let the theme produce HTML.
:::
:::
```

### Timeline

```mds
::: timeline
::: step date="2026-06"
## Parser foundation
Block attrs and slots become AST data.
:::

::: step date="2026-07"
## Theme ecosystem
Themes implement rich components.
:::
:::
```

### Gallery

```mds
::: gallery
::: figure
![Dashboard preview](dashboard.png)

--- caption
Responsive editor preview.
:::
:::
```

### Code Group

````mds
::: code-group
--- npm
```sh
npm create mds
```

--- pnpm
```sh
pnpm create mds
```
:::
````

### API Endpoint

```mds
::: api
::: endpoint method="POST" path="/v1/render"
Render an MDS document to standalone HTML.
:::
:::
```

### FAQ

```mds
::: faq
::: details
# Can unsupported blocks still render?

Yes. Renderer fallback should keep content readable.
:::
:::
```

### Popover And Tooltip

```mds
::: popover label="Read note"
Popover content is native and readable.
:::

::: tooltip label="What is MDS?"
A semantic Markdown layer that renders to standalone HTML.
:::
```

### File Tree

````mds
::: file-tree
```txt
themes/canvas
├─ src/theme.tsx
└─ dist/theme
   └─ blocks/*.html
```
:::
````

### Fieldset And Button Group

```mds
::: form contact
::: fieldset legend="Lead details"
? email Email email@example.com
:::

::: button-group
[Submit !submit contact]
[Cancel !close contact]
:::
:::
```

### Foundation Display And Navigation

```mds
::: breadcrumb label="Project location"
:: breadcrumb-item label="Home" href="/"
:: breadcrumb-item label="MDS" href="/projects/mds" current="page"
:::

::: item
--- media
:: avatar src="/avatar.png" alt="MDS project" fallback="MD"

--- title
## MDS project

--- description
A reusable content row.
:::

::: pagination label="Results" current=1 pages=4
[Previous -> ?page=1]
[Next -> ?page=2]
:::
```

`avatar`, `empty`, and `item` are display semantics. `breadcrumb` and `pagination` use native navigation landmarks and remain usable without a client component runtime.

### Foundation Controls

The shared block layer provides native HTML fallbacks for buttons, toggles, form controls, sliders, and menus. Themes style these structures and may override them, but do not need to reimplement their basic behavior.

```mds
:: button label="Save" type="submit" form="profile"

:: toggle label="Pin panel" pressed=false action="toggle" target="panel"

:: slider label="Volume" name="volume" min=0 max=100 step=5 value=50

::: select label="Workspace" name="workspace" required
:: option label="Personal" value="personal" selected
:: option label="Team" value="team"
:::

:: switch label="Email notifications" name="notifications" checked
```

Input composition remains native-first:

```mds
::: input-group label="Project URL" name="projectUrl" placeholder="mds"
--- prefix
https://

--- suffix
.dev

--- help
Choose a public project URL.
:::

::: input-otp label="Verification code" name="code" length=6 pattern="[0-9]*" required
--- help
Paste the six-digit code from your authenticator.
:::

::: combobox label="Framework" name="framework" list="framework-options" placeholder="Choose a framework"
:: option label="React" value="react"
:: option label="Vue" value="vue"
:::
```

`input-group` keeps the native input before its visual addons in DOM focus order. `input-otp` uses one native input so browser autofill, copy, paste, form submission, and accessibility do not depend on a JavaScript slot implementation. `combobox` uses native `input` plus `datalist`, preserving keyboard input, form submission, and a useful fallback without theme JavaScript.

Calendar selection is also native-first:

```mds
:: calendar label="Review window" mode="range" name="reviewWindow" value="2026-08-18..2026-08-22" month="2026-08" weekstart=1
```

Without enhancement, the block exposes a date input. The shared pack runtime upgrades it to an inline grid with single, `range`, or `multiple` value serialization, min/max limits, locale-aware labels, configurable week start, and arrow-key navigation.

`toggle` is a pressed/unpressed button; `switch` is a form value. `select` chooses a value; `dropdown` contains commands. This distinction keeps the generated HTML and accessibility semantics predictable.

### Dropdown Menu

```mds
::: dropdown label="File actions"
::: menu label="File actions"
:: menu-item label="Open" action="open" target="document"
:: menu-item label="Close" action="close" target="document"
:: menu-separator
:: menu-item label="Toggle preview" action="toggle" target="previewPanel"
:::
:::
```

The fallback is a native disclosure. `menu-item` reuses the existing `data-action` and `data-target` bridge; it does not replace or redefine command-link actions.

### Command Palette

```mds
::: command label="Commands" placeholder="Search commands..." empty="No matching commands."
::: menu label="Commands"
::: menu-group label="Navigation"
:: menu-item label="Open dialog" keywords="modal preview" shortcut="⌘1" action="open" target="dialog"
:: menu-item label="Show drawer" keywords="panel sidebar" shortcut="⌘2" action="show" target="drawer"
:::
:::
:::
```

Without JavaScript, every command remains visible as an ordinary menu. Theme enhancement reveals the search field and filters existing `menu-item` elements by label, keywords, and visible text. The command actions still use the unchanged `data-action` contract.

`context-menu` and `menubar` reuse the same menu children and action bridge. Context menus retain a clickable native `<details>` fallback; menubars add horizontal arrow navigation without defining new action names.

### Data Table And Chart (Rich)

```mds
::: chart label="Weekly builds"
::: chart-series label="Builds"
:: chart-point label="Monday" value=42 max=80
:: chart-point label="Tuesday" value=58 max=80
:::
:::

::: data-table label="Releases" filter="Filter releases" page-size=10 selectable
--- columns
:: data-column key="package" label="Package" sortable
:: data-column key="version" label="Version" sortable

--- rows
::: data-row
::: data-cell column="package"
@mds-crate/blocks
:::
::: data-cell column="version"
0.2.0
:::
:::
:::
```

Charts remain readable through native `<meter>` elements. Data tables emit a complete native `<table>` first; the Rich theme runtime adds search, stable text/number sorting, pagination, optional selection, and live result summaries.

### Conversation Blocks (Rich)

```mds
::: message-scroller label="Conversation" follow=true height="24rem"
::: message align="start" sender="MDS" status="Delivered"
--- body
::: bubble variant="secondary"
All checks passed.
:::
:::

::: attachment title="manifest.json" href="/manifest.json" type="JSON" size="18 KB" state="done" download
--- description
Package versions and integrity hashes.
:::
:::
```

The Rich theme owns presentation and scroll behavior only. Transport, persistence, streaming state, branching, and model state remain application responsibilities.

### Scene And Reveal

```mds
::: scene variant="spotlight"
## Launch sequence
Scene variants are interpreted by the selected theme.

::: reveal preset="reveal" duration=720
Reveal is a block, not core animation syntax.
:::
:::
```

### Media Blocks

```mds
::: image src="/preview.png" alt="Preview"
--- caption
A theme-framed image.
:::

::: video src="/demo.mp4"
--- caption
A theme-framed video.
:::
```

### Gallery Lightbox (Rich)

```mds
::: gallery
::: figure
![Preview](preview.png)

--- caption
Click to inspect in themes that provide a lightbox.
:::
:::
```

### Validated Form

```mds
::: form contact validate
::: fieldset legend="Lead details"
? email Email Email address
? message Long Message
:::

::: button-group
[Submit !submit contact]
:::
:::
```

## Attribute Conventions

These attribute names are recommended across themes:

| Attr | Meaning | Example |
| --- | --- | --- |
| `variant` | Visual variant. | `variant="featured"` |
| `tone` | Semantic tone. | `tone="warning"` |
| `size` | Component size. | `size="compact"` |
| `columns` | Preferred grid columns. | `columns=3` |
| `value` | Metric/progress value. | `value="12k+"` |
| `label` | Short label. | `label="Pages"` |
| `price` | Pricing display. | `price="$9"` |
| `method` | API method. | `method="POST"` |
| `path` | API path. | `path="/v1/render"` |
| `date` | Timeline date. | `date="2026-06"` |
| `author` | Attribution name. | `author="Ava"` |
| `role` | Attribution role. | `role="Designer"` |
| `highlighted` | Boolean emphasis. | `highlighted` |
| `validate` | Enable shared native-first form validation enhancement. | `validate` |
| `src` | Media source for image/video blocks. | `src="/demo.mp4"` |
| `alt` | Image alternative text. | `alt="Product screenshot"` |
| `motion` | Motion preset. | `motion="fade-up"` |
| `preset` | Motion/reveal preset for wrapper blocks. | `preset="reveal"` |
| `trigger` | Motion activation policy. | `trigger="view"` or `trigger="load"` |
| `delay` | Motion delay in ms. | `delay=120` |
| `duration` | Motion duration in ms. | `duration=640` |
| `stagger` | Child stagger in ms. | `stagger=80` |
| `once` | Whether view-triggered motion should run only once. | `once=false` |

Avoid attributes that duplicate large content. Prefer slots or child Markdown for anything human-readable and long-form.

## Rich Theme Implementation Notes

Rich implements higher-level component blocks on top of shared primitives:

```txt
Surface      root block shell, attrs, motion data
Flow         Markdown/content flow
Card         framed content
Panel        simple contained surface
Badge        small semantic label
Metric       value + label display
MediaFrame   images/video/figure frame
Stack        vertical rhythm
Grid         responsive repeated content
```

Implementation guidelines:

- Keep higher-level templates isolated under `themes/rich/src/blocks/` rather than moving them back into the shared package.
- Prefer CSS for layout and simple interaction states.
- Use theme JavaScript only for Rich-owned behavior such as code-group switching, advanced gallery behavior, and theme-specific data presentation. Shared dialog, drawer, carousel, action, menu, and control behavior belongs in `@mds-crate/blocks`.
- Every interactive block must still render useful content when JavaScript is unavailable.
- Avoid adding editor-specific behavior into the theme.

## Components Example Plan

The editor `Components` example is the canonical shared-package showcase. It must contain every `@mds-crate/blocks` name exactly within the 64-block vocabulary and no theme-owned extension:

```txt
1. Foundation
   page, header, section, split, aside, footer, card, grid, callout, display, and navigation blocks

2. Controls And Forms
   buttons, toggles, fields, inputs, selection controls, calendar, and validation messages

3. Menus And Interactive
   tabs, accordion, carousel, dialog, drawer, command, calendar, context-menu, menubar

4. Media And Status
   badge, progress, figure, caption, and video

5. Motion
   motion, reveal, and scene while preserving the separate action contract
```

Rich-owned data, documentation, guidance aliases, gallery, and conversation blocks belong in a separate Rich-specific example if one is added later. They must not leak into the Components capability test or visual baseline.

## Testing Expectations

Component expansion should be verified at three levels:

1. **Parser/AST**

   - Block type, name, attrs, slots, and nested children are preserved.
   - Attribute values are normalized consistently.
   - Unknown blocks remain in the AST.

2. **Renderer/theme loading**

   - New block templates are discovered.
   - `{{ attrs }}` and `{{ attr:name:fallback }}` produce expected HTML.
   - Unsupported blocks fall back safely.

3. **Browser conformance and visual regression**

   - Components example renders without diagnostics.
   - Focused fixtures cover every selected block pack and relevant state.
   - Every official theme runs at mobile, tablet, and desktop viewports. The current gate covers Default and Canvas; the remaining official themes still need to join it.
   - The runner rejects initial scroll, horizontal overflow, popup geometry changes, broken overlay shielding, inconsistent action state, focus failures, and console errors.
   - PNG artifacts are compared with reviewed visual baselines instead of only being generated.
   - Interactive blocks do not hide content accidentally.
   - Shared runtime behavior remains identical when the same fixture changes themes.

## Compatibility Rules

- Themes are not required to implement every block in this document.
- A theme can declare supported blocks through `theme.json#supportedBlocks`.
- Shared block packs provide only portable primitives. Themes can opt into those packs, override selected templates, and own richer vocabulary locally.
- MDS documents may use custom block names outside this list.
- Core should not special-case most component names. The list is an authoring vocabulary and theme-extension roadmap, not a closed grammar.
- Block names should stay lowercase and hyphenated when they contain multiple words, such as `code-group` and `message-scroller`.
