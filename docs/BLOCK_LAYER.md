# MDS Blocks Layer

This document defines the shared blocks layer that sits between MDS syntax and individual themes.

The short version:

**Blocks are shared semantic capabilities. Themes are visual implementations and overrides. Runtime still consumes plain theme artifacts.**

MDS already treats every extensible component as a block. The next step is to make the common block vocabulary reusable across themes without copying `blocks/*.html` into every theme directory.

## Goals

- Let many themes support the same broad block vocabulary.
- Keep the current artifact contract: runtime loads `theme.json`, block templates, CSS, optional JavaScript, and shell files.
- Let themes opt into shared block sets and override only the templates they need to change.
- Keep renderer, parser, and editor contracts stable.
- Keep file-based themes approachable for authors who do not use TypeScript, JSX, or a package builder.
- Let package themes author rich blocks through SDKs, then build to the same artifact format.
- Make block support inspectable and testable.

## Non-Goals

- Do not add a browser component runtime.
- Do not make React, JSX, Tailwind, or package tooling part of MDS runtime.
- Do not make the parser know every standard block name.
- Do not require every theme to implement every shared block.
- Do not remove custom block support.
- Do not turn block attributes into arbitrary HTML attributes or JavaScript hooks.

## Terms

**Block vocabulary**

A named set of semantic block types, their intended content model, recommended slots, recommended attributes, and fallback expectations. `COMPONENTS.md` is the current vocabulary reference.

**Block pack**

A reusable artifact-shaped source of block templates and optional metadata:

```txt
blocks/
  page.html
  hero.html
  card.html
metadata.json
```

A block pack is not a runtime component library. It is merged into a theme source before rendering or before writing a built artifact.

**Block profile**

A named subset of a vocabulary, such as `core`, `marketing`, `docs`, `forms`, or `motion`. Profiles let small themes opt into useful coverage without claiming the full Canvas-sized set.

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

The parser only preserves `blockType`, `name`, `id`, `attrs`, slots, and children. It does not validate whether `pricing-plan` or `code-group` is a standard block.

The renderer remains narrow. It receives an `HtmlTheme` and renders block nodes through the merged renderer map.

The loader or builder owns block pack composition because it already owns artifact interpretation and block template discovery.

## Initial Implementation

The first implementation is source-level composition:

- `@mds-crate/theme-loader` exports `composeThemeSource()`.
- `@mds-crate/theme-loader` exports the `ThemeBlockPackSource` and `ComposeThemeSourceOptions` types.
- `@mds-crate/blocks` exports `coreBlocks`, `marketingBlocks`, and `standardBlocks`.
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
import { coreBlocks, marketingBlocks } from "@mds-crate/blocks";

composeThemeSource({
  manifest: {
    name: "clean"
  },
  files: {}
}, {
  blockPacks: [coreBlocks, marketingBlocks]
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
  "blockPacks": ["@mds-crate/blocks/core", "@mds-crate/blocks/marketing"],
  "blocks": "blocks",
  "css": "style.css"
}
```

Package themes can already use SDK helpers:

```ts
import { coreBlocks, marketingBlocks } from "@mds-crate/blocks";
import { defineReactTheme } from "@mds-crate/theme-sdk-react";

export default defineReactTheme({
  name: "clean",
  blockPacks: [coreBlocks, marketingBlocks],
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
- Pack templates use the same placeholders as theme templates: `{{ attrs }}`, `{{ children }}`, `{{ slots }}`, `{{ slot:name }}`, and `{{ attr:name:fallback }}`.
- Pack templates should prefer readable native HTML and safe fallbacks.
- Pack templates should avoid visual styling that forces one specific theme aesthetic.
- Pack CSS should be optional. The preferred first version is structural templates plus class names that themes style.
- Pack JavaScript should be avoided unless a profile explicitly declares progressive enhancement behavior.

## Profiles

Recommended first profiles:

| Profile | Purpose | Example Blocks |
| --- | --- | --- |
| `core` | Basic page structure and content containers. | `page`, `section`, `hero`, `nav`, `footer`, `card`, `cards`, `grid`, `split`, `note`, `details` |
| `marketing` | Landing and product pages. | `cta`, `features`, `feature`, `stats`, `stat`, `logos`, `testimonial`, `pricing`, `pricing-plan` |
| `docs` | Technical documentation and reference pages. | `terminal`, `code-group`, `file-tree`, `api`, `endpoint`, `steps`, `timeline` |
| `media` | Images, video, figures, galleries. | `media`, `image`, `video`, `figure`, `caption`, `gallery` |
| `forms` | Native-first form composition. | `form`, `fieldset`, `button-group` |
| `motion` | Motion wrappers and reveal semantics. | `motion`, `reveal`, `scene` |
| `interactive` | Native-first interactive containers. | `tabs`, `accordion`, `carousel`, `dialog`, `drawer`, `popover`, `tooltip` |

Themes may opt into multiple profiles. A theme should only publish profiles whose output has been visually checked with its CSS.

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

2. **Extract a standard block pack**

   Use Canvas as the initial reference because it currently has the broadest implemented block set. Start with templates that are readable without Canvas-specific styling.

3. **Add source composition helpers**

   Status: implemented through `composeThemeSource()` and the initial `@mds-crate/blocks` package.

4. **Move existing themes gradually**

   Status: implemented for `default`, `folio`, and `atelier`. They opt into `@mds-crate/blocks/standard`, keep source under `src/`, and materialize complete plain runtime artifacts under `dist/theme`. The override audit reduced theme-owned templates from 31 each to 6 for `default`, 10 for `folio`, and 6 for `atelier`; all three artifacts still expose the same 72-block vocabulary.

5. **Update package SDKs**

   Status: implemented for JSX, HTML, and React source definitions.

6. **Update builder and inspection**

   Status: implemented. Package config resolves named packs, file themes can declare stable override sources, build metadata records packs and per-block provenance, and inspect exposes that provenance with support-drift diagnostics.

7. **Add visual smoke tests**

   Status: implemented through `pnpm test:visual`. The Components example renders through `default`, `folio`, and `atelier` at 390x844 and 1440x1000, captures PNGs through Chrome DevTools Protocol, and fails on horizontal overflow or render diagnostics.

## Compatibility

- Existing themes with only `blocks: "blocks"` keep working.
- Existing `blocks` arrays keep their current override semantics.
- Existing render-time `blockRenderers` overrides keep highest priority.
- Unknown MDS blocks still render through safe fallback HTML when no template exists.
- Themes do not need to support every shared block.
- Custom block names remain valid as long as they follow the existing block-name conventions.

## Open Questions

- Should block pack references live in `theme.json`, package config, SDK source definitions, or all three?
- Should pack CSS ever be merged automatically, or should packs only provide structural HTML templates?
- Should `supportedBlocks` default to the composed template list when omitted?
- Should pack profiles be versioned independently from theme manifest version?
- How should inspect output show template provenance without making the runtime artifact more complex?
