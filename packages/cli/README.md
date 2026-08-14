# @mds-crate/cli

Command-line tools for MDS documents and themes. The package installs the `mds` executable.

```sh
mds check ./page.mds
mds build ./page.mds --output ./page.html
mds edit ./page.mds
mds edit ./docs
mds theme init ./my-theme
mds theme init ./my-jsx-theme --template jsx
mds theme init ./my-react-theme --template react
mds theme inspect ./my-theme
```

`mds edit` starts the packaged Editor on `127.0.0.1`, opens a browser, and supports real file selection, creation, atomic save, dirty state, external-modification conflicts, diagnostics, and project or installed-package themes. It does not require the MDS repository or a Vite development server. Use `--no-open` to keep the command terminal-only and `--port <number>` to request a port.

See the [Editor guide](https://github.com/ziyu/mds/blob/main/docs/EDITOR.md), [MDS repository](https://github.com/ziyu/mds), and [release plan](https://github.com/ziyu/mds/blob/main/docs/RELEASE_PLAN.md). Licensed under Apache-2.0.
