export const publicPackageDirectories = [
  "packages/ast",
  "packages/html-types",
  "packages/parser",
  "packages/renderer-html",
  "packages/theme-loader",
  "packages/blocks",
  "packages/theme-sdk-html",
  "packages/theme-sdk-react",
  "packages/theme-builder",
  "themes/default",
  "packages/cli"
];

export const expectedRuntimeExports = {
  "@mds-crate/parser": "parseMds",
  "@mds-crate/renderer-html": "renderMdsResult",
  "@mds-crate/theme-loader": "readThemeRef",
  "@mds-crate/blocks": "coreBlocks",
  "@mds-crate/theme-sdk-html": "defineHtmlTheme",
  "@mds-crate/theme-sdk-react": "defineReactTheme",
  "@mds-crate/theme-builder": "buildPackageTheme",
  "@mds-crate/theme-default": "theme"
};
