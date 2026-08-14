# AI-First MDS Generation

MDS should eventually occupy the same mental slot as Markdown: a user describes the document they want, an AI starts from Markdown habits, adds a small semantic layer, and produces complete `.mds` that can be checked, rendered, and improved without hand-written HTML or JSX.

This document turns that goal into an implementation roadmap.

## Target Outcome

An AI should be able to generate useful MDS from a short prompt such as:

```txt
Create a product launch page for a note-taking app.
```

The generated source should:

- remain readable as Markdown-like text;
- use semantic blocks for page intent;
- avoid HTML, JSX, JavaScript handlers, and implementation styling;
- choose blocks supported by the selected theme or shared block packs;
- pass parser and renderer diagnostics;
- render to standalone HTML with a readable fallback even when a block is unsupported.

## Authoring Model

AI generation should follow three levels.

| Level | Default Use | Description |
| --- | --- | --- |
| 0 | Always allowed | Plain Markdown stays valid MDS. |
| 1 | AI default | Semantic blocks describe structure and intent. |
| 2 | Advanced | Theme-defined attributes tune compact variants. |

The default generation policy is:

1. Write normal prose, headings, lists, code, tables, and links as Markdown.
2. Use blocks when the content has page-level intent: `hero`, `section`, `cards`, `steps`, `faq`, `pricing`, `form`, and similar.
3. Prefer semantic block names over generic blocks with attributes. Use `::: warning` before `::: callout tone="warning"`.
4. Treat the optional token after a block type as a stable id, never as a display title.
5. Put human-readable titles in headings or slots.
6. Use slots for structured content and attributes for compact configuration only.
7. Do not emit HTML, JSX, event attributes, or JavaScript URLs.

## Missing Capabilities

### 1. AI Authoring Rules

The repository needs a compact guide that models can read before generating MDS. It should be shorter and more operational than `SPEC.md`, with direct rules and examples for common Markdown-to-MDS transformations.

### 2. Machine-Readable Block Vocabulary

`docs/COMPONENTS.md` describes the shared vocabulary, but AI tooling also needs structured data:

- block name;
- profile;
- purpose;
- recommended slots;
- recommended attributes;
- expected child blocks;
- short examples;
- fallback expectations.

This should live in `@mds-crate/blocks` so themes, editor UI, generation tools, and tests can consume the same vocabulary.

### 3. Broad Default Block Packs

AI-generated MDS needs a dependable default surface. The shared packs should cover the common document shapes before themes get fancy:

- core layout and callouts;
- marketing and product pages;
- guidance blocks such as steps, timeline, and FAQ;
- media blocks such as figure, gallery, image, and video;
- documentation blocks such as terminal, code group, file tree, API, and endpoint;
- form composition blocks such as fieldset and button group;
- native-first interactive blocks such as tabs, accordion, dialog, drawer, popover, and tooltip.

Themes can override these templates, but unsupported common blocks should not be the normal result of AI generation.

### 4. Theme Capability Discovery

A generator must know what a theme can render. Theme inspection should expose a compact capability summary that includes supported blocks, actions, profiles, and recommended attributes where available.

### 5. Structured Diagnostics For Repair

AI generation becomes reliable when it can run a check and repair its own output. Diagnostics should be machine-readable through the CLI and editor provider:

- parser errors and warnings;
- renderer warnings such as missing block renderers;
- theme validation warnings;
- missing action handlers;
- theme support mismatches.

The CLI should support JSON diagnostics for `build` and `check` so agents can iterate without scraping human text.

### 6. Markdown Migration Examples

MDS needs paired examples that teach the model what to do:

- README to MDS;
- tutorial to MDS;
- API reference to MDS;
- product page to MDS;
- report to MDS;
- course notes to MDS;
- FAQ to MDS;
- launch announcement to MDS.

The goal is not only documentation for humans. These examples are training-shaped context for agents.

## Implementation Roadmap

### Phase 1: Make AI Output Checkable

- Add this roadmap.
- Add an operational authoring guide for AI generation.
- Export a structured block vocabulary from `@mds-crate/blocks`.
- Expand shared block packs beyond core and marketing.
- Add JSON diagnostics to `mds build` and `mds check`.
- Add tests that prove the vocabulary and JSON output stay stable.

### Phase 2: Make AI Output Theme-Aware

- Include block pack profile metadata in theme inspection.
- Derive supported block summaries from templates when `supportedBlocks` is omitted.
- Report theme support mismatches with actionable suggestions.
- Let the editor surface block capability summaries next to examples.

### Phase 3: Teach Markdown Migration

- Add `examples/ai/` with paired `.md` and `.mds` examples.
- Add a `mds convert` command that preserves Markdown and upgrades obvious structures to semantic blocks.
- Add snapshot tests for migrated examples.
- Publish a prompt-oriented migration cookbook.

### Phase 4: Ecosystem Fit

- Add `llms.txt` or an equivalent compact generation entrypoint.
- Add formatter/linter rules for stable block style.
- Provide snippets for common authoring environments.
- Integrate with static-site and documentation toolchains through adapters.

## First Implementation Slice

The first slice should be small but compounding:

1. Create the roadmap and authoring docs.
2. Add structured block vocabulary data to `@mds-crate/blocks`.
3. Add `guidance`, `media`, `docs`, `forms`, and `interactive` packs.
4. Export all packs through `standardBlocks`.
5. Add CLI `--json` diagnostics for `build` and `check`.
6. Add tests for pack composition, vocabulary consistency, and JSON diagnostics.

This gives future AI-facing tooling one place to discover what MDS can express and one reliable command path to validate generated output.
