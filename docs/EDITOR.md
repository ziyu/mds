# Local MDS Editor

The MDS Editor is a local browser application bundled with `@mds-crate/cli`. It opens real `.mds` files without requiring a repository checkout or a Vite development server.

## Install and open

During the beta channel:

```sh
npm install --global @mds-crate/cli@next
mds edit ./page.mds
```

Open a directory to choose among its `.mds` files:

```sh
mds edit ./docs
```

If the requested `.mds` file does not exist, the command creates it inside its existing parent directory. The Editor opens a browser automatically; use `--no-open` for terminals, containers, and automated workflows. Use `--port <number>` to request a specific local port, or omit it to choose a free port.

The command binds to `127.0.0.1`, prints the project root and active file, and exits cleanly on `Ctrl+C`, `SIGINT`, or `SIGTERM`.

## File workflow

The production Editor supports:

- selecting existing `.mds` files under the opened project root;
- creating a new `.mds` file in an existing project directory;
- live parser, renderer, and theme diagnostics;
- live standalone HTML preview at desktop, tablet, and mobile widths;
- saving with the Save button or `Cmd/Ctrl+S`;
- visible saved and unsaved state;
- a close/replacement warning while content is unsaved;
- HTML copy and download actions.

Saves use a temporary file and atomic rename. Each opened version has a content-hash revision. If another process changes or deletes the file, the next save stops and offers two explicit choices:

- **Reload disk version** discards the Editor copy and loads the external version.
- **Overwrite disk** keeps the Editor copy and replaces the external version.

The Editor does not silently resolve a save conflict.

## Themes

When no theme is declared, the Editor uses the bundled `@mds-crate/theme-default` artifact. A document can select a project or installed package theme in frontmatter:

```mds
---
theme: @acme/mds-theme
---

# Themed document
```

Package themes are resolved from the opened project's dependencies and consumed from `package.json#mdsTheme.dist`; theme source is not executed while previewing. Plain theme artifacts under `<project>/themes/<name>` are also listed and loadable. Relative theme paths must remain inside the project root.

Theme build and inspect controls belong to the repository's theme-development adapter and are hidden in normal document editing mode. Use `mds theme build` and `mds theme inspect` for explicit theme development workflows.

## Local security boundary

The local server:

- binds only to a loopback address;
- gives each process an unguessable session token and requires it on API requests;
- validates `Host` and `Origin` headers;
- accepts relative normalized `.mds` paths only;
- rejects traversal, absolute paths, symbolic-link files, and symlink escapes;
- limits document and request sizes;
- serves the Editor with restrictive browser headers;
- renders document output in an iframe with `allow-scripts allow-forms`, without `allow-same-origin` or popup permission.

Installed themes are trusted local dependencies. MDS document content remains untrusted and is handled by the renderer's escaping and URL-safety rules.

## Repository development

Use the Vite adapter when developing the Editor and theme HMR inside this repository:

```sh
pnpm dev:editor
```

Build and test the packaged application with:

```sh
pnpm --filter @mds-crate/cli build
pnpm test:editor-e2e
pnpm check:packages
```

The browser E2E launches the built or installed CLI, edits and saves a real file, verifies an installed package theme, triggers an external save conflict, reloads the disk version, checks diagnostics, and confirms shutdown releases the local server.
