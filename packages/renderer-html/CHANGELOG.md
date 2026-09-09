# @mds-crate/renderer-html

## 0.1.0-beta.4

### Patch Changes

- d6c289b: Render each template slot once, scan inline positions and malformed delimiters in linear time, reuse the Markdown processor, and bound parser/render expansion. Add an optional bounded Markdown cache that preserves current diagnostic positions and resolved state dependencies.

  Move Editor preview compilation into a Worker with a bounded latest-revision queue and timeout recovery. Apply large text inserts directly to CodeMirror. Lifecycle-aware themes update their preview body without reloading the sandboxed iframe; unchanged interactive components retain state, and removed components release observers and global listeners. Other themes retain full-document reload behavior.

- Updated dependencies [d6c289b]
  - @mds-crate/parser@0.1.0-beta.4
  - @mds-crate/ast@0.1.0-beta.4
  - @mds-crate/html-types@0.1.0-beta.4

## 0.1.0-beta.3

### Patch Changes

- @mds-crate/ast@0.1.0-beta.3
- @mds-crate/html-types@0.1.0-beta.3
- @mds-crate/parser@0.1.0-beta.3

## 0.1.0-beta.2

### Minor Changes

- 85e8673: Redesign the Default theme as a quiet editorial system with consistent typography, controls, responsive layouts, dark and print modes. Add the missing shared semantic `header` landmark alongside `footer`. Correct tabs and accordion behavior, accessible overlays, anchored dropdown/context-menu/menubar geometry, command/action style isolation, named-slot duplication, details labels, keyboard tooltips, and media sizing. Clarify the shared motion primitives and fully implement presets, triggers, timing, replay, staggered children, normal-block motion attributes, visual scenes, and reduced-motion behavior without changing the existing contracts.

### Patch Changes

- Updated dependencies [85e8673]
  - @mds-crate/parser@0.1.0-beta.2
  - @mds-crate/ast@0.1.0-beta.2
  - @mds-crate/html-types@0.1.0-beta.2

## 0.1.0-beta.1

### Minor Changes

- d4d704d: Add direct MDS source rendering, document and fragment modes, separate theme asset results, and URL-scheme neutralization with security diagnostics.

### Patch Changes

- d4d704d: Prepare the `@mds-crate` packages for the first external beta with shared block packs, intentional package metadata, clean tarballs, and release validation.
- Updated dependencies [d4d704d]
  - @mds-crate/ast@0.1.0-beta.1
  - @mds-crate/html-types@0.1.0-beta.1
  - @mds-crate/parser@0.1.0-beta.1
