# AI-First MDS Generation

Status: the checkable, theme-aware generation foundation is implemented in `0.1.0-beta.2`; migration tooling and compact AI context are the next milestones.

Last updated: 2026-08-21

MDS can occupy the same mental slot as Markdown: a user describes the document they want, an AI starts from Markdown habits, adds a small semantic layer, and produces complete `.mds` that can be checked, rendered, and repaired without hand-written HTML or JSX.

This document records the current implementation, the architecture boundary for generators, and the remaining roadmap. Operational generation rules live in [AI_AUTHORING.md](./AI_AUTHORING.md).

## Target Outcome

An AI should be able to generate useful MDS from a short prompt such as:

```txt
Create a product launch page for a note-taking app.
```

The generated source should:

- remain readable as Markdown-like text;
- use semantic blocks only where structure, interaction, or intent matters;
- avoid HTML, JSX, JavaScript handlers, and implementation styling;
- choose portable blocks or capabilities exposed by the selected theme;
- pass parser, renderer, and theme diagnostics;
- render to standalone HTML with readable content even when a custom block falls back;
- treat a fallback warning as an unresolved capability mismatch, not as successful theme support.

## Authoring Model

AI generation follows three levels.

| Level | Default use | Description |
| --- | --- | --- |
| 0 | Always allowed | Plain Markdown stays valid MDS. |
| 1 | AI default | Portable semantic blocks describe structure and intent. |
| 2 | Theme-aware | Inspected theme capabilities and documented attributes provide richer structures. |

The default generation policy is:

1. Write normal prose, headings, lists, code, tables, media, and links as Markdown.
2. Use portable blocks such as `header`, `section`, `grid`, `card`, `callout`, `details`, `figure`, and `form` when structure matters.
3. Inspect the target theme before using extensions such as `hero`, `cards`, `steps`, `faq`, `terminal`, `api`, or `data-table`.
4. Prefer a portable representation when the target theme is missing or unknown.
5. Treat the optional token after a block type as a stable id, never as a display title.
6. Put human-readable titles in headings or slots.
7. Use slots for structured content and attributes for compact, documented configuration only.
8. Do not emit HTML, JSX, event attributes, executable URLs, or local file URLs.

## Architecture Boundary for Generators

### Portable vocabulary

`@mds-crate/blocks` exports 64 portable primitives across nine profiles:

- `core`;
- `display`;
- `navigation`;
- `controls`;
- `forms`;
- `interactive`;
- `menus`;
- `media`;
- `motion`.

The package exports `blockVocabulary`, `blockVocabularyByName`, `blockPacksByName`, the focused packs, and `foundationBlocks`. Each vocabulary entry contains its name, profile, purpose, and any known slots, attributes, or expected children.

Portable packs own readable native HTML, structural CSS, and progressive enhancement where interaction requires it. They do not own data systems, documentation systems, galleries, conversations, or application workflows.

### Official theme capabilities

Default, Light, and Dark compose the complete portable layer and add the official `hero`, `float`, and `sticky` presentation capabilities. Rich composes all 64 portable primitives and adds 38 higher-level capabilities for data, documentation, guidance, galleries, and conversations.

Generators must not treat Rich-only names as universal MDS primitives. They should either:

1. select and inspect Rich explicitly;
2. choose a portable representation; or
3. preserve the custom name and report the resulting capability warning when the consuming application intentionally supplies it.

### Fallback boundary

Unknown blocks render through safe fallback HTML so content is not lost. A `missing-block-renderer` warning still means the selected theme contract is incomplete. AI tooling should repair that warning unless a custom renderer is an explicit project requirement.

## Machine-Readable Inputs

### Shared vocabulary

```ts
import {
  blockPacksByName,
  blockVocabulary,
  blockVocabularyByName
} from "@mds-crate/blocks";
```

This is the canonical structured source for the 64 portable blocks. `docs/COMPONENTS.md` remains the broader human-facing vocabulary and Rich capability reference.

### Theme inspection

```sh
mds theme inspect @mds-crate/theme-rich --json
```

`ThemeArtifactInspection` exposes declared `supportedBlocks`, implemented `blocks`, `actions`, assets, block-pack metadata, per-template sources, and diagnostics. Pack profiles and template provenance are available when build metadata is present; packaged runtime artifacts still expose their final supported and implemented block lists.

### Diagnostics

```sh
mds check ./page.mds --json
mds build ./page.mds \
  --theme @mds-crate/theme-rich \
  --output ./page.html \
  --json
```

`check` provides parser diagnostics. `build` carries parser diagnostics forward and adds renderer and theme results such as unsafe URLs, missing block renderers, missing action handlers, and theme loading or validation failures. Theme `build`, `inspect`, and `pack` also expose JSON result and error contracts. The Editor consumes structured parser, renderer, theme, and builder diagnostics rather than scraping terminal text.

## Capability Status

| Capability | Status in beta.2 | Remaining work |
| --- | --- | --- |
| Operational AI authoring rules | Implemented | Keep examples synchronized with portable and Rich boundaries. |
| Shared machine-readable vocabulary | Implemented for 64 portable blocks | Add short examples and fallback expectations; define equivalent metadata for Rich's 38 capabilities. |
| Broad generation surface | Implemented as a deliberate split | Keep portable primitives in `@mds-crate/blocks` and high-level systems in capable themes. |
| Theme capability discovery | Implemented foundation | Provide one normalized AI-facing view that joins shared vocabulary, theme extensions, attributes, and provenance. |
| Structured diagnostics | Implemented foundation | Add stable repair suggestions or remediation codes where a deterministic fix exists. |
| Editor capability context | Partial | Surface theme-aware block guidance next to examples and authoring controls. |
| Paired Markdown migration examples | Not implemented | Add `examples/ai/`, snapshots, and a prompt-oriented cookbook. |
| Automatic Markdown conversion | Not implemented | Design `mds convert` after paired examples define conservative transformations. |
| Compact model entrypoint | Not implemented | Add `llms.txt` or generated equivalent. |
| Formatter and linter support | Not implemented | Define stable block formatting and safe autofixes. |

## Completed Foundation

The original first implementation slice is complete:

- [x] Add the AI generation roadmap and operational authoring guide.
- [x] Export structured portable vocabulary data from `@mds-crate/blocks`.
- [x] Keep reusable packs focused on 64 primitives across nine profiles.
- [x] Put guidance, data, documentation, gallery, and conversation systems in Rich.
- [x] Add JSON diagnostics to `mds check` and `mds build`.
- [x] Add JSON contracts to theme build, inspection, and packing.
- [x] Add tests for pack composition, vocabulary consistency, diagnostics, and theme inspection.
- [x] Record pack profiles and per-template provenance in theme build metadata.
- [x] Report declared-versus-implemented theme support drift.

## Remaining Roadmap

### Phase 2: Complete Theme-Aware Generation

- [x] Include block-pack profile metadata in theme inspection.
- [x] Expose both declared supported blocks and implemented templates.
- [x] Report theme support drift through structured diagnostics.
- [ ] Add structured metadata for Rich's 38 theme-owned capabilities.
- [ ] Extend vocabulary entries with short examples and fallback expectations.
- [ ] Expose a normalized generator view that joins block metadata with the selected theme's capabilities and provenance.
- [ ] Let the Editor surface the same theme-aware guidance beside examples and authoring controls.

### Phase 3: Teach Markdown Migration

- [ ] Add `examples/ai/` with paired `.md` and `.mds` examples for README, tutorial, API reference, project overview, report, course notes, FAQ, and release notes.
- [ ] Add snapshot tests that check syntax, selected-theme compatibility, diagnostics, and readable source.
- [ ] Publish a prompt-oriented migration cookbook.
- [ ] Design `mds convert` from the transformations proven safe by those examples.

Conversion should preserve Markdown by default and upgrade only obvious structures. It must not infer a Rich theme or invent interactive behavior without an explicit target.

### Phase 4: Repair and Ecosystem Fit

- [ ] Add stable diagnostic remediation metadata for deterministic fixes.
- [ ] Add formatter and linter rules for canonical block style and safe autofixes.
- [ ] Add `llms.txt` or a generated compact entrypoint covering syntax, portable vocabulary, theme discovery, and validation commands.
- [ ] Provide snippets for common authoring and agent environments.
- [ ] Integrate with static-site and documentation toolchains through adapters.
- [ ] Add evaluation fixtures that measure validity, portability, theme compatibility, and repair success.

## Next Implementation Slice

The next slice should make existing capabilities easier for models to discover before adding a broad conversion command:

1. Define structured metadata for Rich's 38 capabilities using the same purpose, slots, attributes, and child concepts as the portable vocabulary.
2. Add optional short examples and fallback expectations to the shared and Rich metadata.
3. Create the first paired README, tutorial, API reference, and report fixtures under `examples/ai/`.
4. Generate a compact model entrypoint from the canonical vocabulary and validation contracts.
5. Add remediation metadata for `missing-block-renderer`, `missing-action-handler`, unsafe URLs, and structural leaf/container errors.
6. Use the paired fixtures to decide which transformations are safe enough for a future `mds convert` command.

## AI Generation Acceptance

An AI-facing workflow is complete when it can:

1. choose or receive an explicit target theme;
2. load portable vocabulary and inspected theme capabilities without scraping prose;
3. generate readable MDS without raw implementation markup;
4. run `mds check --json` and theme-aware `mds build --json`;
5. repair all error diagnostics and unintended capability warnings;
6. preserve explicit custom blocks or actions without hiding their warnings;
7. reproduce the paired migration fixtures across the supported compatibility matrix.

This keeps one canonical vocabulary, one theme capability path, and one machine-readable validation loop at the center of every future AI integration.
