# @mds-crate/theme-sdk-react

Build-time React authoring SDK for package-defined MDS themes.

React components render to plain MDS block templates during theme build. The final theme artifact does not require React unless the theme's own browser JavaScript imports it.

React and React DOM are peer dependencies so theme projects use their own compatible React installation.

See the [theme authoring guide](https://github.com/ziyu/mds/blob/main/docs/THEMES.md). Licensed under Apache-2.0.
