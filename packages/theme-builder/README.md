# @mds-crate/theme-builder

Initialize, build, watch, inspect, and pack package-defined MDS themes.

The package provides the `mds-theme` executable. The main `mds` CLI delegates its theme commands to the same implementation.

```sh
mds-theme init ./my-theme
mds-theme init ./my-jsx-theme --template jsx
mds-theme init ./my-react-theme --template react --name @acme/mds-theme-react
mds-theme build ./my-theme
mds-theme inspect ./my-theme
mds-theme pack ./my-theme ./dist/my-theme-artifact
```

`init` creates an artifact-first npm package. HTML SDK authoring is the default; JSX and React authoring are opt-in. The generated package publishes `dist/theme`, not executable theme source.

See the [theme authoring guide](https://github.com/ziyu/mds/blob/main/docs/THEMES.md). Licensed under Apache-2.0.
