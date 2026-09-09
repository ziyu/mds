# @mds-crate/theme-light

## 0.1.0-beta.4

### Patch Changes

- d6c289b: Render each template slot once, scan inline positions and malformed delimiters in linear time, reuse the Markdown processor, and bound parser/render expansion. Add an optional bounded Markdown cache that preserves current diagnostic positions and resolved state dependencies.

  Move Editor preview compilation into a Worker with a bounded latest-revision queue and timeout recovery. Apply large text inserts directly to CodeMirror. Lifecycle-aware themes update their preview body without reloading the sandboxed iframe; unchanged interactive components retain state, and removed components release observers and global listeners. Other themes retain full-document reload behavior.

- Updated dependencies [d6c289b]
  - @mds-crate/theme-loader@0.1.0-beta.4
  - @mds-crate/html-types@0.1.0-beta.4

## 0.1.0-beta.3

### Patch Changes

- @mds-crate/html-types@0.1.0-beta.3
- @mds-crate/theme-loader@0.1.0-beta.3

## 0.1.0-beta.2

### Minor Changes

- 6aaf1d5: Move portable interactive behavior into the shared block runtime, redesign the Rich theme as an editorial systems atlas, and add official fixed Light and Dark themes with the complete 64-block portable contract.

### Patch Changes

- Updated dependencies [85e8673]
- Updated dependencies [d84aa9c]
  - @mds-crate/theme-loader@0.1.0-beta.2
  - @mds-crate/html-types@0.1.0-beta.2

## 0.1.0-beta.1

### Minor Changes

- Introduce the official fixed-light theme with the complete portable block vocabulary, responsive layouts, accessible states, and package/artifact entry points.
