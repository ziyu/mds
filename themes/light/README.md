# @mds-crate/theme-light

Official fixed-light theme for MDS. Light uses a warm paper field, a strict editorial grid, cobalt controls, and vermilion details. It never follows the operating-system color preference, so documents keep the same deliberate appearance in screenshots, embeds, and production applications.

The theme composes all 64 portable blocks from `@mds-crate/blocks` and adds the `hero`, `float`, and `sticky` layout blocks. Shared packages own ARIA, keyboard behavior, overlay geometry, menus, and motion lifecycle; this package owns typography, color, spacing, responsive composition, and visible states.

```ts
import { renderMdsResult } from "@mds-crate/renderer-html";
import { theme } from "@mds-crate/theme-light";

const result = renderMdsResult(source, { theme, mode: "fragment" });
```

Node.js tools can resolve the prebuilt artifact through `package.json#mdsTheme.dist`:

```ts
import { readThemeRef } from "@mds-crate/theme-loader";

const themeSource = await readThemeRef("@mds-crate/theme-light");
```

Licensed under Apache-2.0.
