# MDS Editor Workflow

The editor is a working authoring surface for `.mds` documents. It should keep frequent document actions close to the author, and keep theme maintenance close to the preview that depends on the selected theme.

## Surface Layout

The top bar is for document-level controls:

- Example selection.
- Theme selection.
- Preview size.
- Copy and download for the generated standalone HTML.

Theme build and inspect are intentionally not top-level actions. They are theme maintenance actions, so they live in the preview panel's theme toolbelt. This keeps them near the rendered result, makes it clear which theme will be built or inspected, and avoids mixing low-frequency development tasks with regular authoring controls.

## Theme Toolbelt

The preview panel owns a compact theme toolbelt above the iframe. It is collapsed by default because theme maintenance is lower-frequency than editing and previewing. When expanded, it shows:

- The effective theme ref.
- Whether the theme came from the selected preview theme or document frontmatter.
- Build and inspect actions for the effective theme.
- The most recent build or inspect summary when it applies to the current theme.

Build is only available for package themes marked as buildable. Static artifact themes such as plain `theme.json` directories do not expose a usable build action because there is no source package to compile. Inspect remains available for all known themes.

Frontmatter wins over the selected preview theme. If a document contains:

```mds
---
theme: clarity
---
```

the toolbelt operates on `clarity`, even if the top bar selector still points at another theme.

## MDS Editing Feedback

The CodeMirror editor starts with Markdown behavior and layers MDS-specific visual feedback on top. The editor decorates source text that has MDS meaning:

- Frontmatter lines and frontmatter keys.
- Block fences such as `::: hero`.
- Closing fences such as `:::`.
- Slot fences such as `--- title`.
- Block names and explicit ids.
- Block attributes such as `motion="fade-up"`.
- Action links such as `[Open !open drawer]`.
- Navigation arrows such as `[Docs -> /docs]` and `[Open => #dialog]`.
- Form shorthand lines such as `? email 邮箱 邮箱地址`.

This is intentionally an editor rendering layer, not a second parser. The authoritative document model still comes from `parseMds`, and the preview still renders through `renderHtmlResult`. The decoration layer only helps authors see MDS structure while typing.

## Future Work

The current MDS editor feedback is line and token decoration. A full MDS CodeMirror language package can later add:

- Syntax tree support for nested block ranges.
- Fold gutters for block bodies.
- Diagnostics mapped directly into the editor gutter.
- Completion for known block types, slots, actions, and theme-supported attributes.
