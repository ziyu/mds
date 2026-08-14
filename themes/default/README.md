# @mds-crate/theme-default

Official portable default theme for MDS.

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
