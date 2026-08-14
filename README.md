# MDS

MDS is a Markdown-based semantic authoring language. Authors write normal Markdown plus a small set of semantic blocks; MDS parses that source and renders standalone or embeddable HTML through reusable themes.

The project is preparing its first external beta under the `@mds-crate` npm organization. Packages are not yet published for general use.

## Release Goals

The `0.1` release is organized around three user journeys:

1. Theme authors can initialize, build, inspect, pack, and publish package-defined themes.
2. Document authors can open, edit, preview, and save real `.mds` files in a local Editor.
3. Application developers can render MDS source in Node.js and browser projects through stable package APIs.

See [the release plan](./docs/RELEASE_PLAN.md) for the implementation sequence and acceptance criteria.

## Repository Quick Start

Requirements:

- Node.js 20.19 or newer
- pnpm 11

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

Primary planned public packages:

- `@mds-crate/renderer-html`
- `@mds-crate/theme-default`
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
