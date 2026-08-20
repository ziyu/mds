# MDS Blocks Layer

This document defines the shared blocks layer that sits between MDS syntax and individual themes.

The short version:

**The block layer is the portable UI kernel: it provides primitive semantics, native-first templates, structural CSS, and shared baseline behavior. Themes compose those primitives, own visual expression and higher-level content patterns, and still build to plain runtime artifacts.**

MDS already treats every extensible component as a block. The next step is to make the common block vocabulary reusable across themes without copying `blocks/*.html` into every theme directory.

## Goals

- Let many themes share a compact, stable vocabulary of UI primitives.
- Keep the current artifact contract: runtime loads `theme.json`, block templates, CSS, optional JavaScript, and shell files.
- Let themes opt into shared block sets, override primitive structure when needed, and add richer blocks without expanding the base package.
- Keep renderer, parser, and editor contracts stable.
- Keep file-based themes approachable for authors who do not use TypeScript, JSX, or a package builder.
- Let package themes author rich blocks through SDKs, then build to the same artifact format.
- Make block support inspectable and testable.
- Keep portable interaction semantics identical when the same document changes themes.

## Non-Goals

- Do not add a framework, virtual DOM, custom-element system, or application runtime to generated pages. Small pack-owned progressive-enhancement scripts are allowed when native HTML alone cannot provide the declared behavior.
- Do not make React, JSX, Tailwind, or package tooling part of MDS runtime.
- Do not make the parser know every standard block name.
- Do not require every theme to implement every shared block.
- Do not remove custom block support.
- Do not turn block attributes into arbitrary HTML attributes or JavaScript hooks.

## Semantic Minimum Invariant

Every shared pack, official theme, SDK-authored theme, and third-party component library must implement a block at the smallest structure that fully expresses that block's declared semantics.

- A theme may style the semantic root and the native parts required for its behavior.
- A theme must not invent visible titles, labels, value summaries, metadata, actions, panels, cards, or layout roles that the author did not request and the block contract does not require.
- A theme must not duplicate an attribute as visible content merely because the value is available. Accessibility-only output such as an `aria-label` is allowed when it names the native semantic element without adding visible UI.
- Extra presentation must be composed explicitly with Markdown, an outer layout block, or a declared child/slot contract. It must not be hidden inside an atomic primitive.
- Theme overrides may change DOM only when accessibility, interaction, or the declared content model requires it. A visual preference alone is not a reason to widen a primitive's responsibility.

For example, `progress` renders one native `<progress>` element. A theme may style its track and fill. It may not wrap it in a card, print its label, or add a `value/max` summary. Authors who want visible explanatory text write that text separately and compose it with layout blocks.

## Terms

**Block vocabulary**

A named set of semantic block types, their intended content model, recommended slots, recommended attributes, and fallback expectations. `COMPONENTS.md` is the current vocabulary reference.

**Block pack**

A reusable artifact-shaped source of block templates and optional metadata:

```txt
blocks/
  page.html
  button.html
  card.html
metadata.json
```

A block pack is not a framework component library. It is merged into a theme source before rendering or before writing a built artifact, and may contribute small de-duplicated CSS and JavaScript assets for portable behavior.

**Block profile**

A named subset of the primitive vocabulary, such as `core`, `display`, `navigation`, `controls`, `forms`, `menus`, or `motion`. Profiles let small themes opt into only the contracts they use.

**Theme override**

A theme-owned block template that replaces a shared pack template for one or more block types. Existing block source ordering already supports this idea: later block sources override earlier templates.

**Final theme artifact**

The only runtime input. After composition, the output is still:

```txt
theme.json
style.css
script.js
shell.html
blocks/*.html
```

## Layering

The block resolution stack should be:

```txt
MDS parser
  -> generic block AST
  -> renderer base fallback renderers
  -> shared block pack templates
  -> theme block template overrides
  -> caller renderHtml block renderer overrides
  -> standalone HTML
```

The parser only preserves `blockType`, `name`, `id`, `attrs`, slots, and children. It does not validate whether `message-scroller` or `code-group` is a standard block.

The renderer remains narrow. It receives an `HtmlTheme` and renders block nodes through the merged renderer map.

The loader or builder owns block pack composition because it already owns artifact interpretation and block template discovery.

## Responsibility Decision

The blocks layer should own more than template contracts. It is the single source of truth for behavior that must remain stable when a document switches themes.

| Layer | Owns | Must Not Own |
| --- | --- | --- |
| Parser and renderer core | Syntax, AST preservation, escaping, safe fallback rendering, template expansion. | Component state machines, theme layout, or application workflows. |
| `@mds-crate/blocks` | Primitive vocabulary, minimal templates, native semantics, ARIA, stable runtime hooks, structural CSS, keyboard/focus behavior, and built-in `open`, `close`, `show`, `hide`, and `toggle` behavior. | Brand styling, editorial composition, business actions, remote data, or persistence. |
| Theme | Tokens, typography, color, spacing, responsive layout, decorative surfaces, visual motion presets, and higher-level theme-specific blocks. | Reimplementing shared primitive state machines or changing their meaning. |
| Application | Business actions, routing decisions, analytics, submission handlers, remote data, persistence, permissions, and product state. | Silently changing block semantics based on the selected theme. |

This is a portability rule, not an attempt to build a client framework. The final artifact remains plain HTML, CSS, and optional JavaScript. Shared JavaScript should be small, event-delegated where appropriate, and scoped to explicit block runtime hooks.

### Behavior The Blocks Layer Must Own

The following behavior belongs in shared packs because it has one portable meaning:

- intrinsic pressed state for targetless `toggle` controls;
- target state for built-in `open`, `close`, `show`, `hide`, and `toggle` actions;
- `tabs` selection, keyboard navigation, panel visibility, and ARIA relationships;
- `accordion` expansion, keyboard behavior, and panel visibility;
- `carousel` index state, next/previous controls, and scrolling confined to the carousel track;
- `dialog` and `drawer` visibility, Escape handling, focus trapping and restoration, background inertness, and viewport-level interaction shielding;
- dropdown, context-menu, and menubar positioning and keyboard behavior;
- command filtering and calendar value/keyboard behavior;
- motion trigger lifecycle, reduced-motion handling, `once`, delay, duration, and stagger state. Themes still own the visual preset, easing, transforms, and keyframes;
- initialization safety: shared enhancements must not scroll the page, steal focus, open transient UI, or resize surrounding layout without an author request or user action.

Native HTML remains the first choice. A shared runtime is justified only when the declared primitive cannot meet its contract with native behavior and structural CSS alone.

### Behavior Themes And Applications Keep

Themes keep behavior only when it is part of a theme-owned extension or visual expression, for example a Rich gallery lightbox transition, a theme-specific data visualization, or the keyframes behind `fade-up`.

Applications keep actions such as `lead.submit`, `analytics.track`, authentication, network requests, persistence, and product-specific navigation. The blocks package may preserve and dispatch their metadata, but it must not implement their business meaning.

### Stable Runtime Hooks

Shared behavior must target semantic hooks instead of theme class names. The migration target is a small set of stable attributes such as `data-mds-role`, `data-mds-state`, `data-action`, `data-target`, and native ARIA attributes.

- Classes are primarily presentation hooks and may be restyled by themes.
- Shared runtime must not depend on a theme-specific DOM wrapper or sibling order.
- Theme template overrides must preserve required runtime hooks and native relationships.
- Builder inspection and conformance tests should reject an override that removes required hooks for a block whose shared behavior is enabled.
- Runtime state must use native properties and attributes such as `hidden`, `open`, `aria-pressed`, `aria-expanded`, and `aria-hidden` as the source of truth. A class such as `is-open` may mirror state for styling, but must not be the only behavioral state.

## Theme Conformance Contract

A theme is not complete merely because it builds or renders every block name. Every official and publishable third-party theme should pass the same conformance runner.

The runner should render focused fixtures for every selected pack across mobile, tablet, and desktop viewports and verify:

- the semantic minimum invariant, including omitted optional labels and content;
- no initial page scroll or unexpected focus movement;
- no horizontal viewport overflow;
- stable control height, alignment, and popup geometry;
- popup content does not resize its trigger or surrounding layout;
- overlays cover the viewport, remain above their backdrop, and block background interaction;
- built-in actions and ARIA state behave identically across themes;
- keyboard navigation and focus restoration;
- reduced-motion behavior;
- no browser console errors;
- screenshots against reviewed visual baselines.

The editor Components page remains a showcase and broad integration fixture. It must not be the only test. Each primitive also needs isolated fixtures for its default, minimal, unlabeled, long-content, disabled, invalid, open, nested, and adjacent states where those states apply.

## Initial Implementation

The first implementation is source-level composition:

- `@mds-crate/theme-loader` exports `composeThemeSource()`.
- `@mds-crate/theme-loader` exports the `ThemeBlockPackSource` and `ComposeThemeSourceOptions` types.
- `@mds-crate/blocks` exports nine focused packs and the seven-pack `foundationBlocks` composition.
- JSX, HTML, and React theme SDK definitions accept optional `blockPacks`.

This first version intentionally does not resolve string references such as `"@mds-crate/blocks/core"` from `theme.json`. Package and SDK authors pass pack objects directly, and the generated `ThemeSourceInput` is a normal artifact-shaped source.

## Composition Model

Shared blocks should compose at the `ThemeSourceInput` level:

```ts
interface ThemeSourceInput {
  manifest: ThemeManifest;
  files: Record<string, string>;
  rootName?: string;
}
```

The composition helper merges packs and themes before `createThemeFromSources()`:

```ts
import { composeThemeSource } from "@mds-crate/theme-loader";
import { foundationBlocks } from "@mds-crate/blocks";

composeThemeSource({
  manifest: {
    name: "clean"
  },
  files: {}
}, {
  blockPacks: foundationBlocks
});
```

The composed source behaves as if pack templates were loaded before theme templates:

```json
{
  "blocks": "blocks"
}
```

The implementation materializes the final renderer-visible templates under `blocks/*.html`, so builder output, theme inspection, CLI rendering, and browser rendering continue to consume ordinary theme artifact files. Theme templates override pack templates for the same block type.

## Authoring API

File-based themes may eventually declare block packs in `theme.json`:

```json
{
  "name": "clean",
  "blockPacks": ["@mds-crate/blocks/foundation"],
  "blocks": "blocks",
  "css": "style.css"
}
```

Package themes can already use SDK helpers:

```ts
import { foundationBlocks } from "@mds-crate/blocks";
import { defineReactTheme } from "@mds-crate/theme-sdk-react";

export default defineReactTheme({
  name: "clean",
  blockPacks: foundationBlocks,
  blocks: {
    hero: (block) => "...theme-specific template..."
  }
});
```

The important contract is that pack references are resolved before runtime rendering, and the final artifact remains plain files.

## Pack Shape

A block pack should be serializable as a `ThemeSourceInput`-like fragment:

```ts
interface BlockPackSource {
  name: string;
  profiles?: string[];
  supportedBlocks: string[];
  files: Record<string, string>;
  blocks: ThemeBlockReference;
  actions?: string[];
}
```

Rules:

- Pack file paths use the same relative POSIX path rules as theme artifacts.
- Pack templates use the same placeholders as theme templates: `{{ attrs }}`, `{{ children }}`, `{{ slots }}`, `{{ slot:name }}`, `{{ attr:name:fallback }}`, `{{ optional:source:html-name }}`, and `{{ bool:name }}`.
- Pack templates should prefer readable native HTML and safe fallbacks.
- Pack templates should avoid visual styling that forces one specific theme aesthetic.
- Pack CSS should stay structural: state visibility, containment, native fallback behavior, and geometry required for correct interaction. It must not impose a brand aesthetic.
- Pack JavaScript should own portable progressive enhancement. It must not implement business workflows or theme-specific visual effects.

## Profiles

The shared package intentionally stops at portable primitives:

| Profile | Purpose | Example Blocks |
| --- | --- | --- |
| `core` | Basic page structure and content containers. | `page`, `header`, `section`, `nav`, `footer`, `card`, `grid`, `split`, `callout`, `details` |
| `display` | Reusable identity and compact status presentation. | `avatar`, `empty`, `item`, `badge`, `progress` |
| `navigation` | Hierarchical and paged navigation. | `breadcrumb`, `breadcrumb-item`, `pagination` |
| `controls` | Universal buttons and two-state controls. | `button`, `toggle`, `toggle-group` |
| `forms` | Native-first form composition and date selection. | `form`, `fieldset`, `field`, `label`, `input`, `input-group`, `input-otp`, `combobox`, `calendar`, `textarea`, `select`, `option`, `checkbox`, `radio-group`, `radio`, `slider`, `switch`, `button-group` |
| `interactive` | Native-first interactive containers. | `tabs`, `accordion`, `carousel`, `dialog`, `drawer`, `popover`, `tooltip`, `command` |
| `menus` | Commands, disclosure menus, context menus, and application menubars. | `dropdown`, `context-menu`, `menubar`, `menu`, `menu-group`, `menu-item`, `menu-separator` |
| `media` | Native media semantics that do not imply a gallery system. | `video`, `figure`, `caption` |
| `motion` | Theme-owned entry choreography: grouped motion, single-region reveal, and visual staging. | `motion`, `reveal`, `scene` |

Themes may opt into multiple profiles. A theme should only publish profiles whose output has been visually checked with its CSS.

`foundationBlocks` composes `core`, `display`, `navigation`, `controls`, `forms`, `interactive`, and `menus`. Themes add `media` and `motion` explicitly when needed. The complete shared layer is 64 blocks across nine packs. Packs may include de-duplicated structural CSS and progressive-enhancement JavaScript; those assets compose before theme-owned assets so external themes work immediately and can override presentation.

Higher-level patterns are theme capabilities. The official `@mds-crate/theme-rich` package owns 38 such names: hero/card collections and layout aliases, semantic callout aliases, data tables and charts, documentation structures, guided sequences, gallery composition, and conversation layouts. This preserves useful built-in coverage without making every theme or application inherit those opinions.

The [shadcn/ui coverage matrix](./SHADCN_BLOCK_MAP.md) is used as a completeness benchmark. It does not introduce library-specific aliases when Markdown or an existing MDS block already provides a stronger representation.

`toggle` and `switch` deliberately remain separate: `toggle` is a pressed/unpressed command button, while `switch` is an immediate on/off form value. `select` chooses a form value; `dropdown` exposes a list of commands. The menu fallback uses native `<details>` and `<summary>` so it stays readable without a browser component runtime.

## Supported Blocks

`supportedBlocks` remains metadata, but composition should make it less error-prone.

Recommended behavior:

- The final supported block list is the stable de-duplicated union of selected packs and the theme manifest.
- Theme-owned `supportedBlocks` can add custom blocks.
- A theme may omit `supportedBlocks`; inspection can derive implemented blocks from templates and report them separately.
- Validation should warn when a theme declares support for a block that has no pack or theme template.
- Validation should warn or inform when a template exists for a block not listed in `supportedBlocks`.

This keeps custom blocks possible while reducing drift between declared capability and actual templates.

## Override Rules

Override order must be deterministic:

```txt
pack profile templates
theme templates
explicit render options
```

If two packs register the same block type, later selected packs override earlier selected packs and diagnostics should report the duplicate. This mirrors current duplicate block template diagnostics.

Theme overrides should be ordinary templates:

```html
<template data-block="note info warning danger success">
  <aside{{ attrs }} class="callout {{ type }}" role="note">
    {{ children }}
  </aside>
</template>
```

A theme should be able to override a grouped template with one specific block template, and vice versa. The final block renderer map only cares about block type keys.

## Builder Responsibilities

The package builder should:

- Resolve block pack declarations from source definitions and package config.
- Merge selected pack files before theme files.
- Preserve deterministic artifact paths.
- Write only the final composed artifact to `dist/theme`.
- Record selected packs and profiles in `.mds-theme-build.json`.
- Include pack input files in watch metadata when the pack is local.
- Validate duplicate block templates and supported block drift.
- Keep `mds theme inspect` focused on final artifact behavior, with optional build metadata showing where templates came from.

The builder should not require runtime tools to resolve packages or execute source files.

## Loader Responsibilities

The loader should:

- Continue to create `HtmlTheme` from a validated `ThemeSourceInput`.
- Support composed sources in browser and Node environments.
- Keep path validation and reserved-file rules shared with themes.
- Keep block pack logic out of `renderer-html`.

For pure runtime artifact loading, the loader does not need to know that a pack existed if the builder has already written the composed artifact.

For editor development mode, the dev server may compose pack sources before sending serialized `ThemeSource` to the browser.

## Migration Plan

1. **Document the layer**

   Keep this file as the design contract before changing runtime behavior.

2. **Extract reusable primitive packs**

   Use Canvas as the initial reference because it currently has the broadest implemented block set. Start with templates that are readable without Canvas-specific styling.

3. **Add source composition helpers**

   Status: implemented through `composeThemeSource()` and the initial `@mds-crate/blocks` package.

4. **Move existing themes gradually**

   Status: implemented for `default`, `folio`, `atelier`, and `rich`. Themes explicitly compose `foundation`, `media`, and `motion` as needed, keep source under `src/`, and materialize complete plain runtime artifacts under `dist/theme`. The shared vocabulary contains 64 blocks across nine packs. Rich adds 38 higher-level names and exposes 102 capabilities in its final artifact.

5. **Update package SDKs**

   Status: implemented for JSX, HTML, and React source definitions.

6. **Update builder and inspection**

   Status: implemented. Package config resolves named packs, file themes can declare stable override sources, build metadata records packs and per-block provenance, and inspect exposes that provenance with support-drift diagnostics.

7. **Add visual smoke tests**

   Status: partially implemented through `pnpm test:visual`. The Components gallery covers exactly the 64 shared blocks and exercises `default` and `canvas` at 390x844, 820x1000, and 1440x1000. Chrome DevTools Protocol captures PNGs and rejects initial scroll/focus movement, horizontal overflow, broken menu geometry, inconsistent shared state, overlay coverage/inertness/focus failures, or render diagnostics. The Motion fixture separately checks timing, stagger, reduced trigger state, and replay across both themes. It does not yet provide complete official-theme coverage, per-block isolated fixtures, or reviewed screenshot-diff baselines.

8. **Move portable state machines into blocks**

   Status: implemented for the shared primitive set. Controls, native target actions, form validation state, calendar, command, tabs, accordion, carousel, dialog, drawer, dropdown, context-menu, menubar, and motion lifecycle now come from pack-owned runtime assets. `default` and `canvas` preserve stable `data-mds-role` hooks and no longer duplicate those state machines. Canvas keeps only its theme-owned code-group, gallery-lightbox, and video enhancements.

9. **Add a conformance runner and release gate**

   Status: planned. It should execute focused fixtures against every official theme and become mandatory in CI, theme scaffolds, and official theme release checks.

## Compatibility

- Existing themes with only `blocks: "blocks"` keep working.
- Existing `blocks` arrays keep their current override semantics.
- Existing render-time `blockRenderers` overrides keep highest priority.
- Unknown MDS blocks still render through safe fallback HTML when no template exists.
- Themes do not need to support every shared block.
- Custom block names remain valid as long as they follow the existing block-name conventions.

## Open Questions

- Should block pack references live in `theme.json`, package config, SDK source definitions, or all three?
- Should `supportedBlocks` default to the composed template list when omitted?
- Should pack profiles be versioned independently from theme manifest version?
- How should inspect output show template and runtime provenance without making the runtime artifact more complex?
- Which stable `data-mds-*` hooks should be part of the versioned override contract?
