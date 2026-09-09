# @mds-crate/cli

## 0.1.0-beta.4

### Patch Changes

- d6c289b: Render each template slot once, scan inline positions and malformed delimiters in linear time, reuse the Markdown processor, and bound parser/render expansion. Add an optional bounded Markdown cache that preserves current diagnostic positions and resolved state dependencies.

  Move Editor preview compilation into a Worker with a bounded latest-revision queue and timeout recovery. Apply large text inserts directly to CodeMirror. Lifecycle-aware themes update their preview body without reloading the sandboxed iframe; unchanged interactive components retain state, and removed components release observers and global listeners. Other themes retain full-document reload behavior.

- d6c289b: Preserve edits typed while an Editor save is pending, prevent duplicate save requests, and serialize file saves so concurrent requests cannot bypass revision conflict checks.

  Reject theme build outputs that would delete or overwrite source files or build assets, including overlaps through symbolic links, before modifying existing files.

- Updated dependencies [d6c289b]
- Updated dependencies [d6c289b]
  - @mds-crate/parser@0.1.0-beta.4
  - @mds-crate/renderer-html@0.1.0-beta.4
  - @mds-crate/theme-loader@0.1.0-beta.4
  - @mds-crate/theme-default@0.1.0-beta.4
  - @mds-crate/theme-builder@0.1.0-beta.4

## 0.1.0-beta.3

### Patch Changes

- @mds-crate/parser@0.1.0-beta.3
- @mds-crate/renderer-html@0.1.0-beta.3
- @mds-crate/theme-loader@0.1.0-beta.3
- @mds-crate/theme-builder@0.1.0-beta.3
- @mds-crate/theme-default@0.1.0-beta.3

## 0.1.0-beta.2

### Patch Changes

- Updated dependencies [85e8673]
- Updated dependencies [d84aa9c]
- Updated dependencies [a05b18a]
  - @mds-crate/theme-default@0.1.0-beta.2
  - @mds-crate/parser@0.1.0-beta.2
  - @mds-crate/renderer-html@0.1.0-beta.2
  - @mds-crate/theme-loader@0.1.0-beta.2
  - @mds-crate/theme-builder@0.1.0-beta.2

## 0.1.0-beta.1

### Minor Changes

- d4d704d: Add the packaged local MDS Editor with `mds edit`, real file open/create/save workflows, conflict-safe atomic persistence, project and installed-package themes, a loopback security boundary, and browser end-to-end coverage.
- d4d704d: Add `mds theme init` and `mds-theme init` with artifact-first HTML, JSX, and React theme package templates.

### Patch Changes

- d4d704d: Prepare the `@mds-crate` packages for the first external beta with shared block packs, intentional package metadata, clean tarballs, and release validation.
- Updated dependencies [d4d704d]
- Updated dependencies [d4d704d]
- Updated dependencies [d4d704d]
- Updated dependencies [d4d704d]
  - @mds-crate/theme-default@0.1.0-beta.1
  - @mds-crate/parser@0.1.0-beta.1
  - @mds-crate/renderer-html@0.1.0-beta.1
  - @mds-crate/theme-loader@0.1.0-beta.1
  - @mds-crate/theme-builder@0.1.0-beta.1
