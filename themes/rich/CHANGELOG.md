# @mds-crate/theme-rich

## 0.1.0-beta.4

### Patch Changes

- d6c289b: Render each template slot once, scan inline positions and malformed delimiters in linear time, reuse the Markdown processor, and bound parser/render expansion. Add an optional bounded Markdown cache that preserves current diagnostic positions and resolved state dependencies.

  Move Editor preview compilation into a Worker with a bounded latest-revision queue and timeout recovery. Apply large text inserts directly to CodeMirror. Lifecycle-aware themes update their preview body without reloading the sandboxed iframe; unchanged interactive components retain state, and removed components release observers and global listeners. Other themes retain full-document reload behavior.

- Updated dependencies [d6c289b]
  - @mds-crate/theme-loader@0.1.0-beta.4
  - @mds-crate/html-types@0.1.0-beta.4

## 0.1.0-beta.3

### Patch Changes

- ebdd0ec: Fully redesign Rich as an expressive editorial publishing system. Fix Hero media so slotted callouts fill the composition instead of leaving an empty shell, honor authored callout labels, keep drawers as bounded side panels across responsive layouts, and introduce high-contrast typography, asymmetric grids, vivid color fields, tactile controls, angular accent geometry, and richer data, media, guidance, and conversation surfaces while preserving the existing block and interaction contracts.
  - @mds-crate/html-types@0.1.0-beta.3
  - @mds-crate/theme-loader@0.1.0-beta.3

## 0.1.0-beta.2

### Minor Changes

- 85e8673: Redesign the Default theme as a quiet editorial system with consistent typography, controls, responsive layouts, dark and print modes. Add the missing shared semantic `header` landmark alongside `footer`. Correct tabs and accordion behavior, accessible overlays, anchored dropdown/context-menu/menubar geometry, command/action style isolation, named-slot duplication, details labels, keyboard tooltips, and media sizing. Clarify the shared motion primitives and fully implement presets, triggers, timing, replay, staggered children, normal-block motion attributes, visual scenes, and reduced-motion behavior without changing the existing contracts.
- 6aaf1d5: Move portable interactive behavior into the shared block runtime, redesign the Rich theme as an editorial systems atlas, and add official fixed Light and Dark themes with the complete 64-block portable contract.
- a05b18a: Publish the official Rich theme with 38 high-level data, documentation, guidance, media, and conversation blocks while focusing the shared block layer on 64 portable primitives. Remove the `standardBlocks` aggregate and keep action and motion contracts intact.

### Patch Changes

- Updated dependencies [85e8673]
- Updated dependencies [d84aa9c]
  - @mds-crate/theme-loader@0.1.0-beta.2
  - @mds-crate/html-types@0.1.0-beta.2

## 0.1.0-beta.1

### Minor Changes

- Add the official rich-content theme for data, documentation, guidance, media, and conversation blocks.
