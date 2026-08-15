# shadcn/ui To MDS Block Map

This document tracks shadcn/ui component coverage without turning its React component tree into the MDS language.

The source snapshot is the official [shadcn/ui component list](https://ui.shadcn.com/docs/components), reviewed on 2026-08-15. shadcn/ui is an open-code component distribution system; MDS reuses stable semantics and accessibility expectations while continuing to build plain HTML, CSS, and optional JavaScript.

## Mapping Rules

- Prefer an existing MDS semantic block when it already expresses the same intent.
- Do not add aliases whose only benefit is matching a library-specific name.
- Model compound widgets as one public block with attributes, slots, or semantic children rather than exposing every React subcomponent.
- Keep typography, transient state, layout mechanics, and runtime services out of the block vocabulary when Markdown, themes, or application code already own them.
- Every new block must have a readable native HTML fallback before theme enhancement.
- Existing `open`, `close`, `show`, `hide`, `toggle`, `submit`, and `reset` action behavior remains compatible. New application actions must be additive.

## Status

| Status | Meaning |
| --- | --- |
| Existing | MDS already has the same public semantic block. |
| Equivalent | MDS has an equal or better semantic representation; do not add an alias. |
| No block | Better represented by Markdown, theme primitives, document configuration, or runtime state. |

## Coverage Matrix

| shadcn/ui | Status | MDS representation or decision |
| --- | --- | --- |
| Accordion | Existing | `accordion` |
| Alert | Equivalent | `note`, `info`, `warning`, `danger`, `success` |
| Alert Dialog | Equivalent | `dialog` with a semantic tone or variant |
| Aspect Ratio | Equivalent | `media` or `figure`; the theme owns aspect-ratio styling |
| Attachment | Existing | `attachment` with media, description, actions, state, and native download metadata |
| Avatar | Existing | `avatar` |
| Badge | Existing | `badge` |
| Breadcrumb | Existing | `breadcrumb` with `breadcrumb-item` children |
| Bubble | Existing | `bubble` with variant, alignment, and reactions slot |
| Button | Existing | `button` |
| Button Group | Existing | `button-group` |
| Calendar | Existing | `calendar` supports single, range, and multiple selection, locale/week-start formatting, limits, keyboard navigation, and a native date-input fallback |
| Card | Existing | `card` |
| Carousel | Existing | `carousel` |
| Chart | Existing | `chart`, `chart-series`, and `chart-point` use native meter fallbacks; `!chart` remains available for external chart media |
| Checkbox | Existing | `checkbox` |
| Collapsible | Equivalent | Native `details` |
| Combobox | Existing | `combobox` with a native `datalist` fallback; richer grouped or multi-select behavior can be additive later |
| Command | Existing | `command` composes existing menu blocks and progressively enhances them with client-side filtering |
| Context Menu | Existing | `context-menu` composes existing menu blocks, supports right click, and retains an explicit native disclosure fallback |
| Data Table | Existing | `data-table`, `data-column`, `data-row`, and `data-cell` provide filtering, sorting, pagination, optional row selection, and a native table fallback |
| Date Picker | Equivalent | The official component is a `popover` + `calendar` composition; simple forms can use `input type="date"` |
| Dialog | Existing | `dialog` |
| Direction | No block | Document language/direction and theme configuration |
| Drawer | Existing | `drawer` |
| Dropdown Menu | Existing | `dropdown`, `dropdown-menu`, `menu`, `menu-item` |
| Empty | Existing | `empty` |
| Field | Existing | `field`, `label`, `help`, `error` |
| Hover Card | Equivalent | `popover` for rich content or `tooltip` for short help |
| Input | Existing | `input` |
| Input Group | Existing | `input-group` with prefix, suffix, actions, help, and error slots |
| Input OTP | Existing | `input-otp` with one native autofill- and paste-friendly control |
| Item | Existing | `item` with media, title, description, actions, and footer slots |
| Kbd | No block | Inline semantic primitive; a block-level `kbd` would be worse than an inline extension |
| Label | Existing | `label` |
| Marker | Existing | `marker` with default, border, and separator variants plus status semantics |
| Menubar | Existing | `menubar` composes dropdown/menu blocks with arrow-key navigation and mutual exclusion |
| Message | Existing | `message` with avatar, header, body, footer, sender, status, and alignment semantics |
| Message Scroller | Existing | `message-scroller` provides a focusable live transcript, follow-latest behavior, and jump-to-latest control |
| Native Select | Equivalent | `select` and `option` already produce native HTML |
| Navigation Menu | Equivalent | `nav` composed with `menu` or `dropdown` |
| Pagination | Existing | `pagination` containing normal MDS links/actions |
| Popover | Existing | `popover` |
| Progress | Existing | `progress` |
| Radio Group | Existing | `radio-group` and `radio` |
| Resizable | Equivalent | `split`; resizing is optional theme enhancement |
| Scroll Area | No block | Native overflow and theme styling |
| Select | Existing | `select` and `option` |
| Separator | No block | Markdown thematic break |
| Sheet | Equivalent | `drawer` |
| Sidebar | Equivalent | `aside`, `nav`, and `split`; application shells may compose them |
| Skeleton | No block | Transient loading state owned by the application or theme |
| Slider | Existing | `slider` |
| Sonner | No block | Runtime notification service and action result |
| Spinner | No block | Transient loading state owned by the application or theme |
| Switch | Existing | `switch` |
| Table | Equivalent | Markdown tables; richer behavior belongs to the planned data-table contract |
| Tabs | Existing | `tabs` |
| Textarea | Existing | `textarea` |
| Toast | No block | Runtime notification service and action result |
| Toggle | Existing | `toggle` |
| Toggle Group | Existing | `toggle-group` |
| Tooltip | Existing | `tooltip` |
| Typography | No block | Markdown headings, paragraphs, lists, quotes, and code |

## Coverage Result

- Universal display, navigation, controls, forms, selection, commands, and menus are implemented.
- Data tables and composable chart data are implemented in the `data` profile.
- Attachment, bubble, marker, message, and message scroller are implemented in the `chat` profile.
- Date Picker follows the official composition model instead of adding a redundant root alias.
- Runtime notifications, loading placeholders, scroll styling, direction, and typography remain deliberately outside the document block vocabulary.

There are no `Planned` or `Extension` rows left for the current official component list. Update this matrix when that list changes.
