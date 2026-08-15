import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = resolve(import.meta.dirname, "..");
const packageDirectories = [
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
  "themes/rich",
  "packages/cli"
];
const importablePackages = [
  "@mds-crate/ast",
  "@mds-crate/html-types",
  "@mds-crate/parser",
  "@mds-crate/renderer-html",
  "@mds-crate/theme-loader",
  "@mds-crate/blocks",
  "@mds-crate/theme-sdk-html",
  "@mds-crate/theme-sdk-react",
  "@mds-crate/theme-builder",
  "@mds-crate/theme-default",
  "@mds-crate/theme-rich"
];
const expectedRuntimeExports = {
  "@mds-crate/parser": "parseMds",
  "@mds-crate/renderer-html": "renderMdsResult",
  "@mds-crate/theme-loader": "readThemeRef",
  "@mds-crate/blocks": "coreBlocks",
  "@mds-crate/theme-sdk-html": "defineHtmlTheme",
  "@mds-crate/theme-sdk-react": "defineReactTheme",
  "@mds-crate/theme-builder": "buildPackageTheme",
  "@mds-crate/theme-default": "theme",
  "@mds-crate/theme-rich": "theme"
};

const packDirectory = await mkdtemp(join(tmpdir(), "mds-package-audit-"));
const packedPackages = new Map();

try {
  for (const packageDirectory of packageDirectories) {
    const cwd = resolve(root, packageDirectory);
    const manifest = JSON.parse(await readFile(resolve(cwd, "package.json"), "utf8"));
    validateManifest(manifest, packageDirectory);

    const { stdout } = await execFileAsync(
      "pnpm",
      ["--reporter=silent", "pack", "--json", "--pack-destination", packDirectory],
      {
        cwd,
        maxBuffer: 10 * 1024 * 1024
      }
    );
    const jsonStart = stdout.indexOf("{");
    if (jsonStart === -1) {
      throw new Error(`Package audit did not receive JSON for ${manifest.name}.`);
    }

    const packed = JSON.parse(stdout.slice(jsonStart));
    const paths = packed.files.map((file) => file.path);
    const unexpected = paths.filter(
      (path) =>
        path !== "package.json" &&
        path !== "README.md" &&
        path !== "LICENSE" &&
        !path.startsWith("dist/")
    );
    const testArtifacts = paths.filter((path) => path.includes(".test."));
    const developmentArtifacts = paths.filter((path) => path.endsWith(".mds-theme-build.json"));

    if (unexpected.length > 0) {
      throw new Error(`${manifest.name} packs unexpected files: ${unexpected.join(", ")}.`);
    }
    if (testArtifacts.length > 0) {
      throw new Error(`${manifest.name} packs test artifacts: ${testArtifacts.join(", ")}.`);
    }
    if (developmentArtifacts.length > 0) {
      throw new Error(`${manifest.name} packs theme development metadata: ${developmentArtifacts.join(", ")}.`);
    }
    for (const required of ["package.json", "README.md", "LICENSE"]) {
      if (!paths.includes(required)) {
        throw new Error(`${manifest.name} is missing ${required} from its tarball.`);
      }
    }
    if (!paths.some((path) => path.startsWith("dist/"))) {
      throw new Error(`${manifest.name} tarball does not contain dist output.`);
    }
    if (manifest.name === "@mds-crate/cli") {
      if (!paths.includes("dist/editor/index.html") || !paths.some((path) => path.startsWith("dist/editor/assets/"))) {
        throw new Error("@mds-crate/cli tarball does not contain the production Editor application.");
      }
    }

    const tarballPath = isAbsolute(packed.filename) ? packed.filename : resolve(packDirectory, packed.filename);
    const { stdout: packedManifestText } = await execFileAsync(
      "tar",
      ["-xOf", tarballPath, "package/package.json"],
      { maxBuffer: 1024 * 1024 }
    );
    const packedManifest = JSON.parse(packedManifestText);
    if (JSON.stringify(packedManifest).includes("workspace:")) {
      throw new Error(`${manifest.name} packed manifest still contains workspace protocol dependencies.`);
    }
    if (packedManifest.name !== manifest.name || packedManifest.version !== manifest.version) {
      throw new Error(`${manifest.name} packed manifest identity does not match its source manifest.`);
    }

    packedPackages.set(manifest.name, tarballPath);
    console.log(`${packed.name}@${packed.version}: ${paths.length} files`);
  }

  await verifyCleanConsumer(packedPackages);
} finally {
  await rm(packDirectory, { recursive: true, force: true });
}

async function verifyCleanConsumer(tarballs) {
  const consumerDirectory = join(packDirectory, "consumer");
  await mkdir(consumerDirectory, { recursive: true });

  const dependencies = Object.fromEntries(
    [...tarballs.entries()].map(([name, tarballPath]) => [
      name,
      `file:${relative(consumerDirectory, tarballPath).replaceAll("\\\\", "/")}`
    ])
  );
  await writeFile(
    join(consumerDirectory, "package.json"),
    `${JSON.stringify(
      {
        name: "mds-tarball-consumer",
        private: true,
        type: "module",
        dependencies,
        devDependencies: {
          vite: "^7.0.0"
        }
      },
      null,
      2
    )}\n`,
    "utf8"
  );
  await writeFile(
    join(consumerDirectory, "pnpm-workspace.yaml"),
    `packages:\n  - "."\n  - "generated-*"\n\noverrides:\n${Object.entries(dependencies)
      .map(([name, dependency]) => `  ${JSON.stringify(name)}: ${JSON.stringify(dependency)}`)
      .join("\n")}\n`,
    "utf8"
  );

  await execFileAsync(
    "pnpm",
    ["--reporter=append-only", "install", "--prefer-offline", "--ignore-scripts", "--no-frozen-lockfile"],
    {
      cwd: consumerDirectory,
      maxBuffer: 10 * 1024 * 1024
    }
  );

  const consumerScript = `
const packages = ${JSON.stringify(importablePackages)};
for (const packageName of packages) {
  await import(packageName);
}
const expectedExports = ${JSON.stringify(expectedRuntimeExports)};
for (const [packageName, exportName] of Object.entries(expectedExports)) {
  const exports = await import(packageName);
  if (!(exportName in exports)) {
    throw new Error(\`\${packageName} does not export \${exportName}.\`);
  }
}
const { renderMdsResult } = await import("@mds-crate/renderer-html");
const rendered = renderMdsResult("# Packed Node consumer", { mode: "fragment" });
if (rendered.html !== rendered.body || !rendered.body.includes("<h1>Packed Node consumer</h1>")) {
  throw new Error("The packed renderer source API did not produce the expected fragment.");
}
const { theme, themeSource } = await import("@mds-crate/theme-default");
if (theme.name !== "default" || themeSource.manifest.name !== "default") {
  throw new Error("The packed default theme module did not expose the expected theme and source.");
}
const themed = renderMdsResult("::: hero\\n# Packed default theme\\n:::", { theme, mode: "fragment" });
if (!themed.body.includes('class="hero"') || !themed.css?.includes(":root")) {
  throw new Error("The packed default theme did not render its hero template and CSS.");
}
const { theme: richTheme, themeSource: richThemeSource } = await import("@mds-crate/theme-rich");
if (richTheme.name !== "rich" || !("blocks/data-table.html" in richThemeSource.files)) {
  throw new Error("The packed Rich theme did not expose its module or high-level block templates.");
}
const { readThemeRef } = await import("@mds-crate/theme-loader");
const artifactThemeSource = await readThemeRef("@mds-crate/theme-default", { baseDirectory: process.cwd() });
if (artifactThemeSource.manifest.name !== "default" || !("blocks/hero.html" in artifactThemeSource.files)) {
  throw new Error("The packed default theme artifact could not be resolved by package name.");
}
console.log(\`Imported \${packages.length} packed MDS libraries.\`);
console.log("Rendered MDS source through the packed Node.js API.");
console.log("Loaded the packed default theme through module and artifact entry points.");
console.log("Loaded the packed Rich theme with its high-level block extensions.");
`;
  const consumerScriptPath = join(consumerDirectory, "verify.mjs");
  await writeFile(consumerScriptPath, consumerScript, "utf8");
  const { stdout: importOutput } = await execFileAsync(process.execPath, [consumerScriptPath], {
    cwd: consumerDirectory,
    maxBuffer: 1024 * 1024
  });

  const cliPath = join(consumerDirectory, "node_modules", ".bin", process.platform === "win32" ? "mds.cmd" : "mds");
  const { stdout: cliOutput } = await execFileAsync(cliPath, ["--help"], {
    cwd: consumerDirectory,
    maxBuffer: 1024 * 1024
  });
  if (!cliOutput.includes("Compile an MDS file to HTML")) {
    throw new Error("The packed mds executable did not expose the expected help output.");
  }
  const { stdout: editorE2eOutput } = await execFileAsync(
    process.execPath,
    [resolve(root, "scripts/editor-browser-e2e.mjs"), "--cli", cliPath],
    {
      cwd: consumerDirectory,
      maxBuffer: 10 * 1024 * 1024
    }
  );

  const htmlThemeDirectory = join(consumerDirectory, "generated-html-theme");
  const htmlInit = await runPackedCliJson(cliPath, [
    "theme",
    "init",
    "generated-html-theme",
    "--name",
    "mds-theme-generated-html",
    "--json"
  ], consumerDirectory);
  if (htmlInit.template !== "html") {
    throw new Error("The packed CLI did not initialize the default HTML theme template.");
  }
  await installConsumerWorkspace(consumerDirectory);
  const htmlBuild = await runPackedCliJson(cliPath, ["theme", "build", "generated-html-theme", "--json"], consumerDirectory);
  if (!Array.isArray(htmlBuild.filesWritten) || !htmlBuild.filesWritten.includes("blocks/hero.html")) {
    throw new Error("The initialized HTML theme did not build its hero override.");
  }
  const htmlInspection = await runPackedCliJson(cliPath, ["theme", "inspect", "./generated-html-theme", "--json"], consumerDirectory);
  if (!Array.isArray(htmlInspection.blocks) || !htmlInspection.blocks.includes("hero")) {
    throw new Error("The initialized HTML theme could not be inspected.");
  }
  const packedArtifactDirectory = join(consumerDirectory, "generated-html-artifact");
  const htmlPack = await runPackedCliJson(
    cliPath,
    ["theme", "pack", "./generated-html-theme", "generated-html-artifact", "--json"],
    consumerDirectory
  );
  if (!Array.isArray(htmlPack.filesWritten) || htmlPack.filesWritten.includes(".mds-theme-build.json")) {
    throw new Error("The initialized HTML theme pack contains development metadata.");
  }
  const packedGeneratedTheme = await readFile(join(packedArtifactDirectory, "theme.json"), "utf8");
  if (!packedGeneratedTheme.includes('"name": "generated-html"')) {
    throw new Error("The initialized HTML theme artifact has the wrong identity.");
  }
  const generatedThemeTarball = await packNpmPackage(htmlThemeDirectory, packDirectory);
  await verifyInstalledThemePackage(tarballs, generatedThemeTarball, "mds-theme-generated-html");

  const jsxInit = await runPackedCliJson(
    cliPath,
    [
      "theme",
      "init",
      "generated-jsx-theme",
      "--template",
      "jsx",
      "--name",
      "mds-theme-generated-jsx",
      "--json"
    ],
    consumerDirectory
  );
  if (jsxInit.template !== "jsx") {
    throw new Error("The packed CLI did not initialize the JSX theme template.");
  }
  await installConsumerWorkspace(consumerDirectory);
  const jsxBuild = await runPackedCliJson(cliPath, ["theme", "build", "generated-jsx-theme", "--json"], consumerDirectory);
  if (!Array.isArray(jsxBuild.filesWritten) || !jsxBuild.filesWritten.includes("blocks/hero.html")) {
    throw new Error("The initialized JSX theme did not build its hero override.");
  }

  const reactInit = await runPackedCliJson(
    cliPath,
    [
      "theme",
      "init",
      "generated-react-theme",
      "--template",
      "react",
      "--name",
      "mds-theme-generated-react",
      "--json"
    ],
    consumerDirectory
  );
  if (reactInit.template !== "react") {
    throw new Error("The packed CLI did not initialize the React theme template.");
  }
  await installConsumerWorkspace(consumerDirectory);
  const reactBuild = await runPackedCliJson(cliPath, ["theme", "build", "generated-react-theme", "--json"], consumerDirectory);
  if (!Array.isArray(reactBuild.filesWritten) || !reactBuild.filesWritten.includes("blocks/hero.html")) {
    throw new Error("The initialized React theme did not build its hero override.");
  }

  await writeFile(
    join(consumerDirectory, "index.html"),
    '<!doctype html><html><body><main id="app"></main><script type="module" src="/main.js"></script></body></html>\n',
    "utf8"
  );
  await writeFile(
    join(consumerDirectory, "main.js"),
    `import { renderMdsResult } from "@mds-crate/renderer-html";\nimport { theme } from "@mds-crate/theme-default";\nconst result = renderMdsResult("::: hero\\n# Packed Vite consumer\\n:::", { mode: "fragment", theme });\nif (result.html !== result.body || !result.css) throw new Error("Expected themed fragment output");\ndocument.querySelector("#app").innerHTML = result.body;\n`,
    "utf8"
  );
  await execFileAsync("pnpm", ["exec", "vite", "build", "--outDir", "vite-dist", "--emptyOutDir"], {
    cwd: consumerDirectory,
    maxBuffer: 10 * 1024 * 1024
  });
  const viteIndex = await readFile(join(consumerDirectory, "vite-dist", "index.html"), "utf8");
  if (!viteIndex.includes("/assets/")) {
    throw new Error("The Vite tarball consumer did not produce a bundled asset entry.");
  }

  console.log(importOutput.trim());
  console.log("Executed the packed mds CLI from a clean consumer project.");
  console.log(editorE2eOutput.trim());
  console.log("Built initialized HTML, JSX, and React theme projects; inspected and packed the HTML artifact.");
  console.log("Installed the generated npm theme tarball by package name and rendered with artifact assets only.");
  console.log("Bundled the packed renderer and default theme in a clean Vite project.");
}

async function packNpmPackage(packageDirectory, destination) {
  const { stdout } = await execFileAsync(
    "pnpm",
    ["--reporter=silent", "pack", "--json", "--pack-destination", destination],
    {
      cwd: packageDirectory,
      maxBuffer: 10 * 1024 * 1024
    }
  );
  const jsonStart = stdout.indexOf("{");
  if (jsonStart === -1) {
    throw new Error(`Theme npm pack did not return JSON for ${packageDirectory}.`);
  }
  const packed = JSON.parse(stdout.slice(jsonStart));
  return isAbsolute(packed.filename) ? packed.filename : resolve(destination, packed.filename);
}

async function verifyInstalledThemePackage(tarballs, themeTarball, themePackageName) {
  const { stdout: tarListing } = await execFileAsync("tar", ["-tf", themeTarball], {
    maxBuffer: 10 * 1024 * 1024
  });
  const packedFiles = tarListing.trim().split("\n");
  const requiredThemeFiles = [
    "package/dist/theme/theme.json",
    "package/dist/theme/style.css",
    "package/dist/theme/script.js",
    "package/dist/theme/shell.html",
    "package/dist/theme/preview.svg"
  ];
  for (const requiredFile of requiredThemeFiles) {
    if (!packedFiles.includes(requiredFile)) {
      throw new Error(`Generated theme npm tarball is missing ${requiredFile}.`);
    }
  }
  if (packedFiles.some((path) => path.startsWith("package/src/") || path.endsWith(".mds-theme-build.json"))) {
    throw new Error("Generated theme npm tarball contains source or development metadata.");
  }

  const consumerDirectory = join(packDirectory, "installed-theme-consumer");
  await mkdir(consumerDirectory, { recursive: true });
  const mdsDependencies = Object.fromEntries(
    [...tarballs.entries()].map(([name, tarballPath]) => [name, fileDependency(consumerDirectory, tarballPath)])
  );
  const dependencies = {
    ...mdsDependencies,
    [themePackageName]: fileDependency(consumerDirectory, themeTarball)
  };
  await writeFile(
    join(consumerDirectory, "package.json"),
    `${JSON.stringify({ name: "mds-installed-theme-consumer", private: true, type: "module", dependencies }, null, 2)}\n`,
    "utf8"
  );
  await writeFile(
    join(consumerDirectory, "pnpm-workspace.yaml"),
    `overrides:\n${Object.entries(mdsDependencies)
      .map(([name, dependency]) => `  ${JSON.stringify(name)}: ${JSON.stringify(dependency)}`)
      .join("\n")}\n`,
    "utf8"
  );
  await installConsumerWorkspace(consumerDirectory);

  const inputPath = join(consumerDirectory, "page.mds");
  const outputPath = join(consumerDirectory, "page.html");
  await writeFile(inputPath, "::: hero published-theme\n# Installed theme\n::: \n", "utf8");
  const cliPath = join(consumerDirectory, "node_modules", ".bin", process.platform === "win32" ? "mds.cmd" : "mds");
  await execFileAsync(cliPath, ["build", inputPath, "--theme", themePackageName, "--output", outputPath], {
    cwd: consumerDirectory,
    maxBuffer: 10 * 1024 * 1024
  });
  const html = await readFile(outputPath, "utf8");
  if (
    !html.includes('data-theme="generated-html"') ||
    !html.includes('id="published-theme" class="hero"') ||
    !html.includes("<style>") ||
    !html.includes("mdsThemeReady") ||
    !html.includes("<script>")
  ) {
    throw new Error("Installed generated theme package did not render its shell, template, CSS, and JavaScript assets.");
  }
}

async function runPackedCliJson(cliPath, args, cwd) {
  const { stdout } = await execFileAsync(cliPath, args, {
    cwd,
    maxBuffer: 10 * 1024 * 1024
  });
  return JSON.parse(stdout);
}

async function installConsumerWorkspace(cwd) {
  await execFileAsync(
    "pnpm",
    ["--reporter=append-only", "install", "--prefer-offline", "--ignore-scripts", "--no-frozen-lockfile"],
    {
      cwd,
      maxBuffer: 10 * 1024 * 1024
    }
  );
}

function fileDependency(fromDirectory, tarballPath) {
  return `file:${relative(fromDirectory, tarballPath).replaceAll("\\\\", "/")}`;
}

function validateManifest(manifest, packageDirectory) {
  if (typeof manifest.name !== "string" || !manifest.name.startsWith("@mds-crate/")) {
    throw new Error(`${packageDirectory} must use the @mds-crate scope.`);
  }
  if (typeof manifest.version !== "string" || manifest.version === "0.0.0") {
    throw new Error(`${manifest.name} must have a publishable prerelease or release version.`);
  }
  if (typeof manifest.description !== "string" || manifest.description.length === 0) {
    throw new Error(`${manifest.name} must have a description.`);
  }
  if (manifest.license !== "Apache-2.0") {
    throw new Error(`${manifest.name} must declare the Apache-2.0 license.`);
  }
  if (manifest.repository?.url !== "git+https://github.com/ziyu/mds.git") {
    throw new Error(`${manifest.name} must declare the canonical repository URL.`);
  }
  if (manifest.engines?.node !== ">=20.19.0") {
    throw new Error(`${manifest.name} must declare the supported Node.js range.`);
  }
  if (manifest.publishConfig?.access !== "public") {
    throw new Error(`${manifest.name} must publish as a public scoped package.`);
  }
  if (!Array.isArray(manifest.files) || manifest.files.length !== 1 || manifest.files[0] !== "dist") {
    throw new Error(`${manifest.name} must restrict package files to dist.`);
  }
}
