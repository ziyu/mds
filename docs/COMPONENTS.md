# MDS Component Blocks

This document plans the component block system for MDS themes.

MDS components are semantic blocks. They are not runtime components, JSX tags, or HTML shortcuts. A theme decides how each block looks and behaves, and the final output remains standalone HTML.

For the shared blocks layer that turns this vocabulary into reusable block packs and theme overrides, see [BLOCK_LAYER.md](./BLOCK_LAYER.md).

## Goals

- Cover most common content scenarios: marketing pages, documentation, reports, portfolios, courses, product pages, and AI-generated interactive explanations.
- Keep authoring natural for non-developers.
- Let advanced authors use attributes when a theme explicitly exposes variants.
- Keep unknown or unsupported blocks renderable through safe fallback HTML.
- Let themes implement rich components without adding new core syntax.
- Make the editor Components example a broad visual regression page for theme authors.

## Non-Goals

- MDS will not define a browser component runtime.
- MDS will not require React, JSX, Tailwind, shadcn, or any package at runtime.
- MDS will not expose arbitrary event handlers in documents.
- MDS will not try to standardize every visual variant across all themes.
- MDS will not make attributes the primary authoring style.

## Design Principles

1. **Semantic first**

   Authors should write what the content means:

   ```mds
   ::: testimonial
   MDS let us ship standalone pages from plain text.
   :::
   ```

   They should not need to describe implementation details:

   ```mds
   ::: div class="rounded-card shadow-lg"
   ```

2. **Blocks compose blocks**

   Complex components should use nested blocks and slots instead of large attribute payloads:

   ```mds
   ::: pricing
   ::: pricing-plan pro
   ## Pro
   For growing teams.
   :::
   :::
   ```

3. **Attributes are compact configuration**

   Attributes should handle small options such as `tone`, `variant`, `columns`, `value`, `price`, `motion`, and `duration`.

4. **Themes own presentation**

   MDS core parses and preserves the block. Canvas, Clarity, or a user theme decides the layout, CSS, motion, and progressive enhancement.

5. **Native HTML before custom JavaScript**

   Use native anchors, buttons, forms, details, dialog-like overlays, and media semantics where possible. Theme JavaScript should enhance behavior, not replace basic content.

6. **Fallback must be readable**

   Unsupported blocks should still render content in a safe container with a diagnostic when appropriate.

## Component Coverage Matrix

### Page Structure

| Block | Purpose | Recommended Content |
| --- | --- | --- |
| `page` | Top-level page shell. | Whole document body. |
| `section` | Generic content section. | Headings, paragraphs, nested blocks. |
| `header` | Page or section header. | Title, eyebrow, summary, actions. |
| `footer` | Footer content. | Links, copyright, notes. |
| `aside` | Secondary contextual content. | Notes, links, supporting copy. |
| `sticky` | Sticky supporting panel. | CTA, outline, related links. |
| `divider` | Visual section separator. | Optional label. |
| `spacer` | Intentional spacing. | Usually empty; advanced use only. |

### Layout

| Block | Purpose | Recommended Content |
| --- | --- | --- |
| `split` | Two-column layout. | `left` and `right` slots, or nested blocks. |
| `grid` | Generic responsive grid. | Cards, figures, stats, feature blocks. |
| `grid-2` | Two-column grid. | Repeated child blocks. |
| `grid-3` | Three-column grid. | Repeated child blocks. |
| `grid-auto` | Auto-fit grid. | Repeated child blocks. |
| `stack` | Vertical grouping with theme spacing. | Any block sequence. |
| `cluster` | Wrapping inline group. | Badges, buttons, small items. |

### Marketing And Product

| Block | Purpose | Recommended Content |
| --- | --- | --- |
| `hero` | Primary first-viewport message. | `title`, `body`, `media`, `actions` slots. |
| `cta` | Focused call to action. | Heading, body, actions. |
| `feature` | Single feature. | Heading, body, optional media. |
| `features` | Feature collection. | Nested `feature` or `card` blocks. |
| `cards` | Card collection. | Nested `card` blocks. |
| `card` | General framed item. | Heading, paragraph, action. |
| `stats` | Metric group. | Nested `stat` blocks. |
| `stat` | Single metric. | `value`, `label`, optional body. |
| `logos` | Logo cloud. | Nested `logo` blocks or images. |
| `logo` | Single logo item. | Text or image. |
| `testimonials` | Testimonial collection. | Nested `testimonial` blocks. |
| `testimonial` | Quote with attribution. | Quote text, `author`, `role`. |
| `pricing` | Pricing table/group. | Nested `pricing-plan` blocks. |
| `pricing-plan` | Single plan. | Title, price, features, action. |

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
| `comparison` | Compare options/features. | Nested cards or markdown table. |
| `metric` | Highlighted metric. | `value`, `label`, optional body. |
| `progress` | Progress indicator. | `value`, `max`, optional label. |
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

### Forms And Inputs

| Block | Purpose | Recommended Content |
| --- | --- | --- |
| `form` | Native form container. | Field shorthand and actions. |
| `fieldset` | Group related fields. | Fields and legend heading. |
| `input` | Text-like input. | Attributes for type/name/label. |
| `select` | Select control. | Options as list items. |
| `textarea` | Long text input. | Label/placeholder. |
| `checkbox` | Boolean input. | Label text. |
| `radio` | Single option in a group. | Label text. |
| `switch` | Toggle-like checkbox. | Label text. |
| `button-group` | Related actions. | Action links/buttons. |

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
| `motion` | Motion wrapper. | Child blocks. |
| `scene` | Rich visual or immersive section. | Theme-defined composition. |
| `reveal` | Theme reveal effect. | Child content. |

## Priority Plan

### Phase 1: Broad Content MVP

Status: implemented in Canvas.

Implement these first in Canvas because they unlock most examples:

```txt
stats / stat
steps / step
timeline
testimonials / testimonial
pricing / pricing-plan
cta
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
logos / logo
feature / features
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
- `reveal` is a normal block that maps to theme-owned motion.
- `video`, `image`, and generic `media` blocks provide theme framing around native media.
- Gallery lightbox enhances existing `figure` blocks; without JavaScript, figures stay inline.
- `code-group` tab switching enhances named slots; without JavaScript, all code panels remain visible.
- Form validation is opt-in with a `validate` block attribute and uses native controls plus theme-owned status UI.

## Authoring Patterns

### Stats

```mds
::: stats
::: stat value="12k+" label="Pages generated"
Standalone pages built from semantic Markdown.
:::

::: stat value="98%" label="Runtime-free"
The output is static HTML, CSS, and JavaScript.
:::
:::
```

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

### Testimonials

```mds
::: testimonials
::: testimonial author="Ava Chen" role="Content Lead"
MDS keeps authoring simple without giving up polished pages.
:::
:::
```

### Pricing

```mds
::: pricing
::: pricing-plan creator price="$9" highlighted
## Creator
For writers and solo builders.

- 10 projects
- Canvas theme
- Export HTML

[Start !plan.select creator]
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

### Features

```mds
::: features
::: feature label="Authoring"
## Natural structure
Write Markdown first, then add semantic blocks where layout matters.
:::

::: feature label="Themes"
## Reusable presentation
Themes own spacing, motion, and component composition.
:::
:::
```

### Logos

```mds
::: logos
::: logo
Atlas
:::

::: logo
Northstar
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

### Gallery Lightbox

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
| `validate` | Enable theme-owned form validation. | `validate` |
| `src` | Media source for image/video blocks. | `src="/demo.mp4"` |
| `alt` | Image alternative text. | `alt="Product screenshot"` |
| `motion` | Motion preset. | `motion="fade-up"` |
| `preset` | Motion/reveal preset for wrapper blocks. | `preset="reveal"` |
| `delay` | Motion delay in ms. | `delay=120` |
| `duration` | Motion duration in ms. | `duration=640` |
| `stagger` | Child stagger in ms. | `stagger=80` |

Avoid attributes that duplicate large content. Prefer slots or child Markdown for anything human-readable and long-form.

## Canvas Theme Implementation Notes

Canvas should implement component blocks through shared primitives:

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

- Keep `theme.tsx` readable by extracting reusable pieces into `themes/canvas/src/components/`.
- Prefer CSS for layout and simple interaction states.
- Use theme JavaScript only for progressive enhancement such as dialog, drawer, carousel controls, code-group switching, and advanced gallery behavior.
- Every interactive block must still render useful content when JavaScript is unavailable.
- Avoid adding editor-specific behavior into the theme.

## Components Example Plan

The editor `Components` example should become a broad showcase with stable sections:

```txt
1. Structure
   hero, section, split, aside, sticky

2. Cards And Metrics
   cards, card, features, stats, metric, progress

3. Guidance
   note, info, warning, success, quote, steps, timeline

4. Media
   figure, gallery, caption

5. Interactive
   tabs, accordion, carousel, dialog, drawer

6. Forms
   form, fieldset, checkbox, select, textarea

7. Technical Docs
   code-group, terminal, file-tree, api, endpoint

8. Pricing And CTA
   pricing, pricing-plan, testimonials, cta
```

The example should use realistic copy but stay compact enough to scan in the editor. It should include at least one instance of each Phase 1 and Phase 2 block.

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

3. **Editor visual smoke tests**

   - Components example renders without diagnostics.
   - `pnpm test:visual` renders default, folio, and atelier at mobile and desktop viewports.
   - The smoke runner captures PNG artifacts and rejects horizontal viewport overflow.
   - Canvas desktop/tablet/mobile previews are readable.
   - Interactive blocks do not hide content accidentally.
   - Theme JavaScript does not emit console errors.

## Compatibility Rules

- Themes are not required to implement every block in this document.
- A theme can declare supported blocks through `theme.json#supportedBlocks`.
- Shared block packs may provide reusable templates for subsets of this vocabulary. Themes can opt into those packs and override selected block templates.
- MDS documents may use custom block names outside this list.
- Core should not special-case most component names. The list is a shared vocabulary and Canvas roadmap, not a closed grammar.
- Block names should stay lowercase and hyphenated when they contain multiple words, such as `pricing-plan` and `code-group`.
