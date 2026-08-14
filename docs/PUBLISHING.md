# Publishing MDS

MDS publishes eleven fixed-version public packages under `@mds-crate`. The first release uses the npm `next` dist-tag and a one-time authenticated bootstrap. Later releases should use npm trusted publishing.

Reference: [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/), [`npm trust github`](https://docs.npmjs.com/cli/v11/commands/npm-trust/), and [npm provenance](https://docs.npmjs.com/generating-provenance-statements/).

## Current gates

Before the first publication:

1. Push the feature commit to `main` so the Release PR workflow creates `chore: version packages`.
2. Review and merge that version PR. It must move every public package from `0.1.0-beta.0` to the same `0.1.0-beta.1` version.
3. Use npm 11.5.1 or newer and log in as an owner or developer of the `mds-crate` organization.
4. Decide whether to make `ziyu/mds` public. Public npm provenance is unavailable while the repository is private.

The release readiness command fails closed when the checkout is dirty, versions are not a publishable beta, npm auth or organization membership is missing, the registry is not npmjs.org, or the exact target version already exists:

```sh
pnpm release:check
```

## Bootstrap publication

The initial package objects must exist before npm trusted publishers can be configured. From the merged version commit on a clean checkout:

```sh
npm login
pnpm release:check
pnpm release:publish:next
pnpm release:verify:next
```

`release:publish:next` delegates dependency ordering and fixed-version publication to Changesets. Do not use `latest` for the beta. If publication stops partway through, do not bump or reuse versions blindly: inspect the registry, let `release:check` report exact versions that already exist, and publish only a reviewed recovery release.

The registry verifier creates a clean temporary consumer and:

- installs all eleven packages from `next`;
- imports their public entry points and checks the fixed version;
- renders with `@mds-crate/renderer-html` and `@mds-crate/theme-default`;
- invokes the installed CLI;
- initializes, installs, builds, and inspects a theme package;
- bundles the registry packages with Vite;
- launches the installed local Editor in Chrome and verifies file save, installed themes, conflicts, diagnostics, and shutdown.

## Trusted publishing after bootstrap

After every package exists on npm:

1. Make the GitHub repository public if public provenance is required.
2. Enable two-factor authentication on the publishing npm account.
3. Configure all package trust relationships:

   ```sh
   pnpm release:configure-trust
   ```

   This sets GitHub owner/repository `ziyu/mds`, workflow filename `publish.yml`, environment `npm`, and the `npm publish` action for every public package.
4. Protect the GitHub `npm` environment with required reviewers for stable releases.
5. Remove long-lived npm publish tokens after OIDC succeeds.
6. Publish prereleases with `next`; move to `latest` only after registry acceptance and external beta feedback.

The Release PR workflow versions packages but intentionally does not publish. Publication remains a separate reviewed action so a push to `main` cannot release npm packages by itself.

The trusted publish workflow is manual-only, refuses non-`main` refs, uses the protected `npm` environment, validates the full release, publishes with `next`, runs registry acceptance, and pushes the Changesets-created tags. It becomes usable only after the one-time bootstrap package creation and npm trusted-publisher configuration.
