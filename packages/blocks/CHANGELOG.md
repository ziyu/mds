# @mds-crate/blocks

## 0.1.0-beta.3

### Patch Changes

- @mds-crate/theme-loader@0.1.0-beta.3

## 0.1.0-beta.2

### Minor Changes

- 85e8673: Redesign the Default theme as a quiet editorial system with consistent typography, controls, responsive layouts, dark and print modes. Add the missing shared semantic `header` landmark alongside `footer`. Correct tabs and accordion behavior, accessible overlays, anchored dropdown/context-menu/menubar geometry, command/action style isolation, named-slot duplication, details labels, keyboard tooltips, and media sizing. Clarify the shared motion primitives and fully implement presets, triggers, timing, replay, staggered children, normal-block motion attributes, visual scenes, and reduced-motion behavior without changing the existing contracts.
- d84aa9c: Add complete native-first display, navigation, control, form, calendar, command, and menu coverage; focus the shared package on 64 portable primitives across nine packs; and preserve the existing action and motion contracts. Higher-level data, documentation, guidance, gallery, and conversation blocks move to the Rich theme instead of becoming universal dependencies.
- a05b18a: Publish the official Rich theme with 38 high-level data, documentation, guidance, media, and conversation blocks while focusing the shared block layer on 64 portable primitives. Remove the `standardBlocks` aggregate and keep action and motion contracts intact.

### Patch Changes

- 6aaf1d5: Move portable interactive behavior into the shared block runtime, redesign the Rich theme as an editorial systems atlas, and add official fixed Light and Dark themes with the complete 64-block portable contract.
- Updated dependencies [85e8673]
- Updated dependencies [d84aa9c]
  - @mds-crate/theme-loader@0.1.0-beta.2

## 0.1.0-beta.1

### Patch Changes

- d4d704d: Prepare the `@mds-crate` packages for the first external beta with shared block packs, intentional package metadata, clean tarballs, and release validation.
- Updated dependencies [d4d704d]
  - @mds-crate/theme-loader@0.1.0-beta.1
