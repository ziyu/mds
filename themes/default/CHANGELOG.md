# @mds-crate/theme-default

## 0.1.0-beta.2

### Minor Changes

- 85e8673: Redesign the Default theme as a quiet editorial system with consistent typography, controls, responsive layouts, dark and print modes. Add the missing shared semantic `header` landmark alongside `footer`. Correct tabs and accordion behavior, accessible overlays, anchored dropdown/context-menu/menubar geometry, command/action style isolation, named-slot duplication, details labels, keyboard tooltips, and media sizing. Clarify the shared motion primitives and fully implement presets, triggers, timing, replay, staggered children, normal-block motion attributes, visual scenes, and reduced-motion behavior without changing the existing contracts.
- d84aa9c: Add complete native-first display, navigation, control, form, calendar, command, and menu coverage; focus the shared package on 64 portable primitives across nine packs; and preserve the existing action and motion contracts. Higher-level data, documentation, guidance, gallery, and conversation blocks move to the Rich theme instead of becoming universal dependencies.
- a05b18a: Publish the official Rich theme with 38 high-level data, documentation, guidance, media, and conversation blocks while focusing the shared block layer on 64 portable primitives. Remove the `standardBlocks` aggregate and keep action and motion contracts intact.

### Patch Changes

- Updated dependencies [85e8673]
- Updated dependencies [d84aa9c]
  - @mds-crate/theme-loader@0.1.0-beta.2
  - @mds-crate/html-types@0.1.0-beta.2

## 0.1.0-beta.1

### Minor Changes

- d4d704d: Publish the official default theme as both a browser-safe module and an artifact-first package resolvable through `package.json#mdsTheme.dist`.

### Patch Changes

- Updated dependencies [d4d704d]
  - @mds-crate/html-types@0.1.0-beta.1
  - @mds-crate/theme-loader@0.1.0-beta.1
