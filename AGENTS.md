# AGENTS.md

## Cursor Cloud specific instructions

MDS is a pnpm monorepo (a Markdown-based semantic authoring language). Standard commands
live in the [README](./README.md) "Repository Quick Start" and root `package.json` scripts;
prefer those. The notes below are the non-obvious things that bite you in this environment.

### Node version: use Node 24 (not Node 22)

This is the most important gotcha. The base VM's default `node` (`/exec-daemon/node`) is
**Node 22**, but this repo must run on **Node 24** (or 20.19, the versions CI uses).

On Node 22, `pnpm test` **hangs for ~20 minutes** at the `@mds-crate/theme-builder` vitest
suite (a tsx/esbuild ESM-loader interaction spins a worker at 100% CPU). On Node 24 the full
`pnpm test` finishes in under 10s.

Setup added an nvm-managed Node 24 and a `PATH` prepend in `~/.bashrc`, so new shells already
resolve `node` to v24. Verify with `node --version`. If it ever shows `v22.x`, recover with:

```sh
export NVM_DIR="$HOME/.nvm"; . "$NVM_DIR/nvm.sh"
export PATH="$NVM_DIR/versions/node/v24.19.0/bin:$PATH"   # nvm default alias is already 24
```

`corepack` provides pnpm 10.34.5 (pinned via `packageManager`).

### Build before using the CLI

`pnpm build` compiles every workspace, including `packages/cli/dist` and the theme artifacts.
The CLI is only runnable after a build: `node packages/cli/dist/index.js build <file.mds>`.
On a fresh checkout, `pnpm install` prints `Failed to create bin ... mds-theme ... ENOENT`
warnings — these are expected (the `theme-builder` dist does not exist yet) and clear after
`pnpm build`.

### Services / how to run things

- Editor app (flagship GUI): `pnpm dev:editor` → Vite dev server at http://127.0.0.1:5173/.
  It is a browser app; the source pane on the left drives a live HTML preview on the right.
- CLI render (author flow): `node packages/cli/dist/index.js build examples/basic/index.mds`.
- Semantic block syntax is fenced with `:::` (e.g. `::: hero` ... `:::`), not `::name[...]`.
  See `examples/basic/index.mds`.

### Heavier validation (CI parity)

Beyond `pnpm check` / `pnpm test` / `pnpm build`, CI also runs:
`pnpm check:packages` (packs tarballs + a headless-browser Editor E2E; ~1.5 min) and the
visual smoke suites `pnpm test:visual`, `pnpm test:visual:motion`, `pnpm test:visual:rich`.
All pass on Node 24. These are slower and only needed when touching packaging/themes/rendering.
