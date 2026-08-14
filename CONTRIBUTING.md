# Contributing To MDS

MDS is currently in public beta. Discuss large syntax, AST, theme artifact, or public API changes before implementation because these contracts affect multiple packages.

## Development Setup

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

Run the Editor locally:

```sh
pnpm dev:editor
```

Run the visual theme smoke suite:

```sh
pnpm test:visual
```

## Change Guidelines

- Keep parser, renderer, theme loader, and theme builder responsibilities separate.
- Preserve plain Markdown compatibility.
- Keep blocks as the semantic extension boundary.
- Add tests for parser, renderer, artifact, CLI, or browser contracts affected by a change.
- Update the relevant design document when changing a public contract.
- Do not commit generated package `dist` directories or local package stores.
- Treat MDS content as untrusted and theme source as trusted build code.

## Pull Request Checklist

- The change has a focused purpose.
- Public behavior has tests.
- `pnpm check`, `pnpm test`, and `pnpm build` pass.
- Theme-facing visual changes pass `pnpm test:visual`.
- Documentation and examples match the new behavior.
- Package or API changes include a release note created with `pnpm changeset`.

See [docs/RELEASE_PLAN.md](./docs/RELEASE_PLAN.md) for the release milestones and package acceptance criteria.
