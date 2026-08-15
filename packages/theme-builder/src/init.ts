import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";

export type ThemeInitTemplate = "html" | "jsx" | "react";

export interface ThemeInitOptions {
  template?: ThemeInitTemplate;
  packageName?: string;
}

export interface ThemeInitResult {
  directory: string;
  packageName: string;
  themeName: string;
  template: ThemeInitTemplate;
  filesWritten: string[];
}

const npmPackageNamePattern = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;

export async function initializeThemePackage(
  directory: string,
  options: ThemeInitOptions = {}
): Promise<ThemeInitResult> {
  const root = resolve(directory);
  const template = options.template ?? "html";
  if (template !== "html" && template !== "jsx" && template !== "react") {
    throw new Error(`Unknown theme template: ${template}. Expected html, jsx, or react.`);
  }

  const derivedSlug = slugify(basename(root));
  if (derivedSlug.length === 0) {
    throw new Error(`Cannot derive an npm package name from theme directory: ${root}.`);
  }
  const packageName = options.packageName ?? (derivedSlug.startsWith("mds-theme-") ? derivedSlug : `mds-theme-${derivedSlug}`);
  if (!npmPackageNamePattern.test(packageName)) {
    throw new Error(`Invalid npm package name: ${packageName}. Use lowercase letters, numbers, dots, underscores, dashes, and an optional scope.`);
  }

  const themeName = themeNameFromPackage(packageName);
  const label = titleCase(themeName);
  const version = await readBuilderVersion();
  const files = createThemeFiles({ packageName, themeName, label, template, version });

  await mkdir(root, { recursive: true });
  const existingEntries = await readdir(root);
  if (existingEntries.length > 0) {
    throw new Error(`Theme init target must be empty: ${root}.`);
  }

  const filesWritten = Object.keys(files).sort();
  for (const path of filesWritten) {
    const outputPath = join(root, path);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, files[path] ?? "", { encoding: "utf8", flag: "wx" });
  }

  return {
    directory: root,
    packageName,
    themeName,
    template,
    filesWritten
  };
}

function createThemeFiles(input: {
  packageName: string;
  themeName: string;
  label: string;
  template: ThemeInitTemplate;
  version: string;
}): Record<string, string> {
  const sourcePath = input.template === "html" ? "./src/theme.ts" : "./src/theme.tsx";
  const authoringPackage =
    input.template === "react"
      ? "@mds-crate/theme-sdk-react"
      : input.template === "jsx"
        ? "@mds-crate/theme-loader"
        : "@mds-crate/theme-sdk-html";
  const mdsDependencies: Record<string, string> = {
    "@mds-crate/blocks": `^${input.version}`,
    "@mds-crate/theme-builder": `^${input.version}`,
    [authoringPackage]: `^${input.version}`,
    typescript: "^5.8.0"
  };
  const devDependencies =
    input.template === "react"
      ? {
          ...mdsDependencies,
          "@types/react": "^19.0.0",
          "@types/react-dom": "^19.0.0",
          react: "^19.0.0",
          "react-dom": "^19.0.0"
        }
      : mdsDependencies;
  const packageJson = {
    name: input.packageName,
    version: "0.1.0",
    description: `${input.label} theme for MDS.`,
    keywords: ["mds", "markdown", "theme"],
    license: "MIT",
    type: "module",
    files: ["dist/theme"],
    engines: {
      node: ">=20.19.0"
    },
    publishConfig: {
      access: "public"
    },
    scripts: {
      build: "mds-theme build .",
      dev: "mds-theme watch .",
      inspect: "mds-theme inspect .",
      "pack:artifact": "mds-theme pack . ./dist/artifact",
      smoke: "pnpm run build && pnpm run inspect",
      prepack: "pnpm run build && node ./scripts/prepare-package.mjs"
    },
    mdsTheme: {
      source: sourcePath,
      dist: "./dist/theme",
      blockPacks: ["@mds-crate/blocks/foundation"],
      assets: {
        css: "./src/style.css",
        js: "./src/script.js",
        shell: "./src/shell.html",
        preview: "./src/preview.svg"
      }
    },
    devDependencies
  };

  return {
    ".gitignore": "node_modules\ndist\n",
    "LICENSE": createMitLicense(),
    "README.md": createReadme(input.packageName, input.template),
    "example.mds": createExample(),
    "package.json": `${JSON.stringify(packageJson, null, 2)}\n`,
    "scripts/prepare-package.mjs": createPreparePackageScript(),
    "src/preview.svg": createPreviewSvg(input.label),
    "src/script.js": createThemeScript(),
    "src/shell.html": createShell(input.themeName),
    "src/style.css": createStyleSheet(),
    [sourcePath.slice(2)]:
      input.template === "react"
        ? createReactThemeSource(input)
        : input.template === "jsx"
          ? createJsxThemeSource(input)
          : createHtmlThemeSource(input),
    "tsconfig.json": `${JSON.stringify(createTsconfig(input.template), null, 2)}\n`
  };
}

function createPreparePackageScript(): string {
  return `import { rm } from "node:fs/promises";\n\nawait rm(new URL("../dist/theme/.mds-theme-build.json", import.meta.url), { force: true });\n`;
}

function createMitLicense(): string {
  return `MIT License

Copyright (c) ${new Date().getUTCFullYear()} Theme contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;
}

function createJsxThemeSource(input: { themeName: string; label: string }): string {
  return [
    '/** @jsxImportSource @mds-crate/theme-loader */',
    'import { Content, Root, Slot, defineJsxTheme } from "@mds-crate/theme-loader/jsx";',
    "",
    "export default defineJsxTheme({",
    `  name: ${JSON.stringify(input.themeName)},`,
    `  label: ${JSON.stringify(input.label)},`,
    '  description: "A custom JSX-authored MDS theme.",',
    '  tags: ["custom", "jsx"],',
    "  blocks: {",
    "    hero: (block) => (",
    '      <Root block={block} className="hero">',
    '        <div className="hero-title"><Slot block={block} name="title" /></div>',
    '        <div className="hero-content"><Content block={block} /></div>',
    '        <div className="hero-actions"><Slot block={block} name="actions" /></div>',
    "      </Root>",
    "    )",
    "  }",
    "});",
    ""
  ].join("\n");
}

function createHtmlThemeSource(input: { themeName: string; label: string }): string {
  return [
    'import { defineHtmlTheme, html } from "@mds-crate/theme-sdk-html";',
    "",
    "export default defineHtmlTheme({",
    `  name: ${JSON.stringify(input.themeName)},`,
    `  label: ${JSON.stringify(input.label)},`,
    '  description: "A custom HTML-authored MDS theme.",',
    '  tags: ["custom", "html"],',
    "  blocks: {",
    "    hero: (block) =>",
    '      html`<section${block.attrs} class="hero"><div class="hero-title">${block.slot("title")}</div><div class="hero-content">${block.children}</div><div class="hero-actions">${block.slot("actions")}</div></section>`',
    "  }",
    "});",
    ""
  ].join("\n");
}

function createReactThemeSource(input: { themeName: string; label: string }): string {
  return [
    'import React from "react";',
    'import { Content, Root, Slot, defineReactTheme } from "@mds-crate/theme-sdk-react";',
    "",
    "export default defineReactTheme({",
    `  name: ${JSON.stringify(input.themeName)},`,
    `  label: ${JSON.stringify(input.label)},`,
    '  description: "A custom React-authored MDS theme.",',
    '  tags: ["custom", "react"],',
    "  blocks: {",
    "    hero: (block) => (",
    '      <Root block={block} className="hero">',
    '        <div className="hero-title"><Slot block={block} name="title" /></div>',
    '        <div className="hero-content"><Content block={block} /></div>',
    '        <div className="hero-actions"><Slot block={block} name="actions" /></div>',
    "      </Root>",
    "    )",
    "  }",
    "});",
    ""
  ].join("\n");
}

function createStyleSheet(): string {
  return `:root {
  color: #1b2430;
  background: #f7f5ef;
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
}

body {
  margin: 0;
}

.page {
  width: min(100% - 2rem, 72rem);
  margin-inline: auto;
  padding-block: 4rem;
}

.hero {
  display: grid;
  gap: 1.5rem;
  padding: clamp(2rem, 6vw, 5rem);
  border: 1px solid #d8d4c8;
  border-radius: 1.5rem;
  background: #fffdf7;
  box-shadow: 0 1.5rem 4rem rgb(38 34 25 / 10%);
}

.hero-title h1 {
  margin: 0;
  font-size: clamp(2.5rem, 8vw, 5.5rem);
  line-height: 0.95;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}
`;
}

function createExample(): string {
  return `---
title: Custom MDS Theme
---

::: hero welcome
--- title
# Make the theme yours

--- actions
[Read the guide -> https://github.com/ziyu/mds]

This page is rendered by your package-defined MDS theme.
:::
`;
}

function createThemeScript(): string {
  return `document.documentElement.dataset.mdsThemeReady = "true";\n`;
}

function createShell(themeName: string): string {
  return `<!doctype html>
<html lang="{{ lang }}" data-theme="${themeName}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{ title }}</title>
  {{ head }}
</head>
<body>
  {{ body }}
  {{ scripts }}
</body>
</html>
`;
}

function createPreviewSvg(label: string): string {
  const escapedLabel = label
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
  <rect width="1200" height="675" fill="#f7f5ef"/>
  <rect x="96" y="92" width="1008" height="491" rx="32" fill="#fffdf7" stroke="#d8d4c8"/>
  <text x="152" y="290" fill="#1b2430" font-family="system-ui, sans-serif" font-size="72" font-weight="700">${escapedLabel}</text>
  <text x="152" y="370" fill="#657080" font-family="system-ui, sans-serif" font-size="32">An MDS theme</text>
</svg>
`;
}

function createReadme(packageName: string, template: ThemeInitTemplate): string {
  return `# ${packageName}

An MDS theme authored with ${template === "react" ? "React" : template === "jsx" ? "JSX" : "the HTML SDK"}.

\`\`\`sh
pnpm install
pnpm build
pnpm inspect
pnpm pack:artifact
\`\`\`

Preview the example with the MDS CLI:

\`\`\`sh
mds build ./example.mds --theme . --output ./example.html
\`\`\`

The npm package is artifact-first: \`files\` only publishes \`dist/theme\`. Review the generated package name, license, repository metadata, and version before publishing.
`;
}

function createTsconfig(template: ThemeInitTemplate): Record<string, unknown> {
  return {
    compilerOptions: {
      target: "ES2022",
      module: "NodeNext",
      moduleResolution: "NodeNext",
      strict: true,
      noEmit: true,
      skipLibCheck: true,
      ...(template === "react"
        ? { jsx: "react-jsx", types: ["react"] }
        : template === "jsx"
          ? { jsx: "react-jsx", jsxImportSource: "@mds-crate/theme-loader" }
          : {})
    },
    include: ["src/**/*.ts", "src/**/*.tsx"]
  };
}

async function readBuilderVersion(): Promise<string> {
  const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8")) as {
    version?: unknown;
  };
  if (typeof manifest.version !== "string" || manifest.version.length === 0) {
    throw new Error("Cannot read @mds-crate/theme-builder package version.");
  }
  return manifest.version;
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[._-]+|[._-]+$/g, "");
}

function themeNameFromPackage(packageName: string): string {
  const unscoped = packageName.split("/").at(-1) ?? packageName;
  return unscoped.replace(/^mds-theme-/, "") || unscoped;
}

function titleCase(value: string): string {
  return value
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}
