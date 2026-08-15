# MDS

> **Think in Markdown. Render in HTML.**

MDS is a Markdown-based semantic authoring language. Authors write normal Markdown plus a small set of semantic blocks; MDS parses that source and renders standalone or embeddable HTML through reusable themes.

## Public Beta

`0.1.0-beta.1` is available from the public [`@mds-crate`](https://www.npmjs.com/org/mds-crate) npm organization. The beta requires Node.js 20.19 or newer and publishes ESM packages. Prerelease installation examples use the `next` tag.

The Editor is currently a local browser application launched by the `mds` CLI, not a native `.dmg` or `.exe` application. See the [beta testing guide](./docs/BETA.md) for supported journeys, known limitations, and feedback links.

## Quick Starts

### Edit an MDS file

```sh
npm install --global @mds-crate/cli@next
mds edit ./page.mds
```

The command opens the packaged Editor in your browser and reads and saves real files inside the selected project root. See the [Editor guide](./docs/EDITOR.md) for directory mode, themes, conflict handling, and the local security boundary.

### Render MDS in an application

```sh
npm install @mds-crate/renderer-html@next @mds-crate/theme-default@next
```

```ts
import { renderMdsResult } from "@mds-crate/renderer-html";
import { theme } from "@mds-crate/theme-default";

const result = renderMdsResult("# Hello from MDS", {
  mode: "fragment",
  theme
});

console.log(result.body, result.diagnostics);
```

For data tables, charts, technical documentation, guided sequences, galleries, and conversation layouts, install `@mds-crate/theme-rich@next` and import its `theme` export instead.

### Create a package-defined theme

```sh
npm install --global @mds-crate/cli@next
mds theme init ./my-theme
cd ./my-theme
npm install
npm run build
npm run inspect
```

The scaffold publishes a plain `dist/theme` artifact. HTML is the default authoring mode; pass `--template jsx` or `--template react` for those build-time authoring options.

## Product Surfaces

The `0.1` line is organized around three user journeys:

1. Theme authors can initialize, build, inspect, pack, and publish package-defined themes.
2. Document authors can open, edit, preview, and save real `.mds` files in a local Editor.
3. Application developers can render MDS source in Node.js and browser projects through stable package APIs.

All three journeys pass against the published registry packages. See [the release plan](./docs/RELEASE_PLAN.md) for acceptance evidence and the path from beta feedback to `0.1.0`.

## Repository Quick Start

Requirements:

- Node.js 20.19 or newer
- pnpm 10.34.5

```sh
corepack enable
pnpm install
pnpm check
pnpm test
pnpm build
```

Start the development Editor:

```sh
pnpm dev:editor
```

Build an MDS document with the workspace CLI:

```sh
pnpm --filter @mds-crate/cli exec mds build ./examples/basic/index.mds
```

Open a real file in the packaged local Editor:

```sh
pnpm --filter @mds-crate/cli build
node packages/cli/dist/index.js edit ./examples/basic/index.mds
```

Render source directly from an application:

```ts
import { renderMdsResult } from "@mds-crate/renderer-html";
import { theme } from "@mds-crate/theme-default";

const result = renderMdsResult(source, { mode: "fragment", theme });
console.log(result.body, result.diagnostics);
```

Build and inspect a package theme:

```sh
pnpm build:theme:default
pnpm build:theme:rich
node packages/theme-builder/dist/cli.js inspect ./themes/default
```

Create a new package theme:

```sh
pnpm --filter @mds-crate/cli exec mds theme init ./tmp/my-theme
```

## Architecture

The normal compilation path is:

```txt
MDS source
  -> @mds-crate/parser
  -> @mds-crate/ast
  -> @mds-crate/renderer-html
  -> HtmlTheme
  -> HTML
```

Theme packages are built separately:

```txt
theme source + @mds-crate/blocks
  -> @mds-crate/theme-builder
  -> plain theme artifact
  -> @mds-crate/theme-loader
  -> HtmlTheme
```

The runtime consumes plain theme artifacts. TypeScript, JSX, React, Tailwind, and other authoring tools are build-time choices, not required browser runtimes.

## Packages

Primary public packages:

- `@mds-crate/renderer-html`
- `@mds-crate/theme-default`
- `@mds-crate/theme-rich`
- `@mds-crate/cli`
- `@mds-crate/theme-builder`
- `@mds-crate/theme-sdk-html`
- `@mds-crate/theme-sdk-react`
- `@mds-crate/blocks`

Lower-level packages:

- `@mds-crate/ast`
- `@mds-crate/html-types`
- `@mds-crate/parser`
- `@mds-crate/theme-loader`

## Documentation

- [Language specification](./SPEC.md)
- [Implementation plan](./IMPLEMENTATION_PLAN.md)
- [Release plan](./docs/RELEASE_PLAN.md)
- [Publishing runbook](./docs/PUBLISHING.md)
- [Theme authoring](./docs/THEMES.md)
- [Theme architecture](./docs/THEME_DESIGN.md)
- [Shared block layer](./docs/BLOCK_LAYER.md)
- [Editor plan](./docs/EDITOR_APP_PLAN.md)
- [Local Editor guide](./docs/EDITOR.md)
- [AI authoring rules](./docs/AI_AUTHORING.md)

## Security Model

MDS document source may be untrusted and must render through escaping and URL-safety rules. Themes are trusted code: package-theme builds may execute source, and built themes may intentionally provide JavaScript or head markup.

Navigation links allow relative URLs, HTTP(S), `mailto:`, and `tel:`. Media, embeds, and downloads allow relative URLs and HTTP(S). Executable or local schemes such as `javascript:`, `data:`, `vbscript:`, and `file:` are neutralized and reported as `unsafe-url` diagnostics.

Please read [SECURITY.md](./SECURITY.md) before reporting a vulnerability.

## License

Licensed under the Apache License, Version 2.0. See [LICENSE](./LICENSE).
