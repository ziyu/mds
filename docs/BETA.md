# MDS 0.1.0 Beta

`0.1.0-beta.1` is the first external MDS beta. Eleven public packages are available under [`@mds-crate`](https://www.npmjs.com/org/mds-crate), and prerelease installs should use the npm `next` tag.

## Requirements

- Node.js 20.19 or newer.
- npm, pnpm, or another package manager that supports public scoped packages.
- ESM for direct package integration.
- A local browser for the packaged Editor workflow.

## Test the three supported journeys

### 1. Edit a real `.mds` file

```sh
npm install --global @mds-crate/cli@next
mkdir mds-beta-editor
cd mds-beta-editor
printf '# Hello from MDS\n' > page.mds
mds edit ./page.mds
```

Expected result: the browser Editor opens, previews the document, saves changes to `page.mds`, and shows parser or renderer diagnostics without requiring this repository or Vite.

### 2. Render MDS from an application

```sh
mkdir mds-beta-renderer
cd mds-beta-renderer
npm init -y
npm install @mds-crate/renderer-html@next @mds-crate/theme-default@next
```

Create `render.mjs`:

```js
import { renderMdsResult } from "@mds-crate/renderer-html";
import { theme } from "@mds-crate/theme-default";

const result = renderMdsResult("# Registry consumer", { theme });

if (result.diagnostics.length > 0) {
  console.error(result.diagnostics);
  process.exitCode = 1;
} else {
  console.log(result.html);
}
```

Run it with `node render.mjs`. Expected result: a standalone HTML document is printed without diagnostics.

### 3. Create a package-defined theme

```sh
npm install --global @mds-crate/cli@next
mds theme init ./mds-beta-theme
cd ./mds-beta-theme
npm install
npm run build
npm run inspect
```

Expected result: the generated project builds and validates a complete artifact under `dist/theme`. The scaffold also supports `--template jsx` and `--template react`.

## Current beta boundaries

- The Editor is a local browser application launched through `mds edit`; native desktop installers are not part of this beta.
- Public packages require Node.js 20.19 or newer and are ESM-only.
- `@mds-crate/theme-default` is the only officially supported published visual theme in the first beta.
- Installed theme packages are trusted dependencies. Review them before installation or build.
- APIs and artifact contracts may receive compatibility fixes before `0.1.0`; pin exact versions when reproducibility matters.

## Send feedback

Use the repository's [issue chooser](https://github.com/ziyu/mds/issues/new/choose):

- choose **Beta feedback** for successful journeys, usability friction, missing documentation, or compatibility results;
- choose **Bug report** for reproducible incorrect behavior;
- use a [private security advisory](https://github.com/ziyu/mds/security/advisories/new) for suspected vulnerabilities.

Include the tested journey, exact package version, Node.js version, operating system, package manager, commands used, and the smallest safe reproduction. Do not put secrets or private document contents in a public issue.
