import { readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";

const packageDirectory = resolve(process.argv[2] ?? ".");
const distDirectory = join(packageDirectory, "dist");
const artifactDirectory = join(distDirectory, "theme");
const manifestPath = join(artifactDirectory, "theme.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const files = {};

for (const path of await listFiles(artifactDirectory)) {
  if (path === "theme.json" || path === ".mds-theme-build.json") {
    continue;
  }
  files[path] = await readFile(join(artifactDirectory, path), "utf8");
}

const themeSource = {
  manifest,
  files,
  rootName: typeof manifest.name === "string" && manifest.name.length > 0 ? manifest.name : "default"
};
const moduleSource = `import { createThemeFromSources } from "@mds-crate/theme-loader/browser";\n\nexport const themeSource = ${JSON.stringify(themeSource, null, 2)};\n\nexport const theme = createThemeFromSources(themeSource);\n\nexport default theme;\n`;
const declarations = `import type { HtmlTheme } from "@mds-crate/html-types";\nimport type { ThemeSourceInput } from "@mds-crate/theme-loader/browser";\n\nexport declare const themeSource: ThemeSourceInput;\nexport declare const theme: HtmlTheme;\nexport default theme;\n`;

await writeFile(join(distDirectory, "index.js"), moduleSource, "utf8");
await writeFile(join(distDirectory, "index.d.ts"), declarations, "utf8");
await rm(join(artifactDirectory, ".mds-theme-build.json"), { force: true });

console.log(`Generated browser-safe theme module: ${relative(process.cwd(), join(distDirectory, "index.js"))}`);

async function listFiles(root) {
  const files = [];

  async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(absolutePath);
      } else if (entry.isFile()) {
        files.push(relative(root, absolutePath).split(sep).join("/"));
      }
    }
  }

  await walk(root);
  return files.sort();
}
