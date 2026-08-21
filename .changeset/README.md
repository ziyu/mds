# Changesets

Every pull request that changes a public package's behavior or API must include a changeset:

```sh
pnpm changeset
```

The fourteen public `@mds-crate/*` packages are kept in one fixed version group during the `0.x` release line. Private applications and example themes are not versioned or published by Changesets.

The repository is currently in the `beta` prerelease channel. Changesets created during this phase become `0.1.0-beta.*` releases and must be published with the npm `next` dist-tag. Leaving prerelease mode is an explicit release decision:

```sh
pnpm changeset pre exit
```

Do not run `pnpm version-packages` on feature branches. The Release PR workflow owns version and changelog updates.
