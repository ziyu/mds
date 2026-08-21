# @mds-crate/theme-dark

Official fixed-dark theme for MDS. Dark is a warm nocturne rather than an inversion of Light: charcoal planes, parchment typography, copper rules, and ember interaction states create a low-glare reading and application surface. It deliberately ignores the operating-system color preference.

The theme composes all 64 portable blocks from `@mds-crate/blocks` and adds the `hero`, `float`, and `sticky` layout blocks. Shared packages own ARIA, keyboard behavior, overlay geometry, menus, and motion lifecycle; this package owns typography, color, spacing, responsive composition, and visible states.

```ts
import { renderMdsResult } from "@mds-crate/renderer-html";
import { theme } from "@mds-crate/theme-dark";

const result = renderMdsResult(source, { theme, mode: "fragment" });
```

Node.js tools can resolve the prebuilt artifact through `package.json#mdsTheme.dist`:

```ts
import { readThemeRef } from "@mds-crate/theme-loader";

const themeSource = await readThemeRef("@mds-crate/theme-dark");
```

Licensed under Apache-2.0.
