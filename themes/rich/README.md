# @mds-crate/theme-rich

Official MDS theme for documents that need data tables, charts, technical documentation, guided sequences, galleries, and conversation layouts. Its calm editorial system keeps dense content readable with restrained color, typography-led hierarchy, and minimal container chrome.

The shared `@mds-crate/blocks` package owns portable primitive semantics, actions, keyboard and focus behavior, overlays, menus, and motion lifecycle. Rich keeps only higher-level composition and theme-specific enhancement, including data-table behavior and message scrolling, while still producing a standalone theme artifact.

Validate the public artifact and browser contracts from the repository root:

```sh
pnpm build:theme:rich
pnpm test:visual -- --theme=rich
pnpm test:visual:motion -- --theme=rich
pnpm test:visual:rich
```

See the [theme documentation](https://github.com/ziyu/mds/blob/main/docs/THEMES.md). Licensed under Apache-2.0.
