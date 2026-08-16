# @mds-crate/theme-default

Official portable default theme for MDS. Default is a quiet editorial baseline: content typography uses a book-like rhythm, interface primitives share one compact control system, and accessible interaction states work without external assets or runtime dependencies.

The theme composes the 64 shared blocks from `@mds-crate/blocks` and adds only three layout-level blocks: `hero`, `float`, and `sticky`. High-level content patterns belong in `@mds-crate/theme-rich` or a custom theme.

Default implements the shared motion contract as progressive enhancement:

- `motion` coordinates child blocks and supports `stagger`.
- `reveal` animates one content region.
- `scene` provides `spotlight` and `contrast` staging variants.
- Normal blocks can opt in with `motion="..."`.

Supported presets are `fade-in`, `fade-up`, `slide-left`, `slide-right`, `scale-in`, `blur-in`, and `reveal`. Triggers support `load`, `view`, `hover`, and application-controlled `state`; timing uses milliseconds. Content remains visible without JavaScript, and `prefers-reduced-motion` disables transitions.

Use the browser-safe module with the renderer:

```ts
import { renderMdsResult } from "@mds-crate/renderer-html";
import { theme } from "@mds-crate/theme-default";

const result = renderMdsResult(source, {
  theme,
  mode: "fragment"
});
```

Node.js tools can load the packaged artifact without executing theme source:

```ts
import { readThemeRef } from "@mds-crate/theme-loader";

const themeSource = await readThemeRef("@mds-crate/theme-default");
```

The package contains a prebuilt plain artifact under `dist/theme`. Its JavaScript and head assets are trusted theme output; applications decide whether to apply them.

See the [MDS repository](https://github.com/ziyu/mds) and [theme guide](https://github.com/ziyu/mds/blob/main/docs/THEMES.md). Licensed under Apache-2.0.
