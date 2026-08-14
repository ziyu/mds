import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { promisify } from "node:util";
import { expectedRuntimeExports, publicPackageDirectories } from "./public-packages.mjs";

const execFileAsync = promisify(execFile);
const root = resolve(import.meta.dirname, "..");
const tag = readArgument("--tag") ?? "next";
const consumer = await mkdtemp(join(tmpdir(), `mds-registry-${tag}-`));
const packageNames = await Promise.all(
  publicPackageDirectories.map(async (directory) => {
    const manifest = JSON.parse(await readFile(resolve(root, directory, "package.json"), "utf8"));
    return manifest.name;
  })
);

try {
  await writeFile(
    join(consumer, "package.json"),
    `${JSON.stringify({
      name: "mds-registry-release-consumer",
      private: true,
      type: "module",
      dependencies: Object.fromEntries(packageNames.map((name) => [name, tag])),
      devDependencies: { vite: "^7.0.0" }
    }, null, 2)}\n`,
    "utf8"
  );
  await install(consumer);

  const installedVersions = new Set();
  for (const packageName of packageNames) {
    const manifest = JSON.parse(
      await readFile(join(consumer, "node_modules", ...packageName.split("/"), "package.json"), "utf8")
    );
    installedVersions.add(manifest.version);
  }
  if (installedVersions.size !== 1) {
    throw new Error(`Registry packages are not on one fixed version: ${[...installedVersions].join(", ")}.`);
  }

  const verificationPath = join(consumer, "verify.mjs");
  const importablePackageNames = packageNames.filter((packageName) => packageName !== "@mds-crate/cli");
  await writeFile(
    verificationPath,
    `const packageNames = ${JSON.stringify(importablePackageNames)};
for (const packageName of packageNames) await import(packageName);
const expectedExports = ${JSON.stringify(expectedRuntimeExports)};
for (const [packageName, exportName] of Object.entries(expectedExports)) {
  const exports = await import(packageName);
  if (!(exportName in exports)) throw new Error(packageName + " does not export " + exportName);
}
const { renderMdsResult } = await import("@mds-crate/renderer-html");
const { theme } = await import("@mds-crate/theme-default");
const result = renderMdsResult("::: hero\\n# Registry release\\n:::", { theme, mode: "fragment" });
if (!result.body.includes("Registry release") || !result.css) throw new Error("Registry renderer/default theme failed");
console.log("Imported " + packageNames.length + " registry package entry points.");
`,
    "utf8"
  );
  const { stdout: importOutput } = await run(process.execPath, [verificationPath], consumer);

  const cliPath = join(consumer, "node_modules", ".bin", process.platform === "win32" ? "mds.cmd" : "mds");
  const { stdout: helpOutput } = await run(cliPath, ["--help"], consumer);
  if (!helpOutput.includes("Open an MDS file or project directory")) {
    throw new Error("Registry CLI does not expose mds edit.");
  }

  const input = join(consumer, "page.mds");
  const output = join(consumer, "page.html");
  await writeFile(input, "::: hero\n# Registry CLI\n:::\n", "utf8");
  await run(cliPath, ["build", input, "--theme", "@mds-crate/theme-default", "--output", output], consumer);
  if (!(await readFile(output, "utf8")).includes("Registry CLI")) {
    throw new Error("Registry CLI did not render with the default package theme.");
  }

  const themeDirectory = join(consumer, "registry-theme");
  await run(cliPath, ["theme", "init", themeDirectory, "--name", "mds-theme-registry-acceptance", "--json"], consumer);
  await install(themeDirectory);
  await run("pnpm", ["run", "build"], themeDirectory);
  await run("pnpm", ["run", "inspect"], themeDirectory);

  await writeFile(join(consumer, "index.html"), '<div id="app"></div><script type="module" src="/main.js"></script>', "utf8");
  await writeFile(
    join(consumer, "main.js"),
    'import { renderMdsResult } from "@mds-crate/renderer-html";\nimport { theme } from "@mds-crate/theme-default";\ndocument.querySelector("#app").innerHTML = renderMdsResult("# Registry Vite", { theme, mode: "fragment" }).body;\n',
    "utf8"
  );
  await run("pnpm", ["exec", "vite", "build", "--outDir", "vite-dist", "--emptyOutDir"], consumer);

  const editorScript = resolve(root, "scripts/editor-browser-e2e.mjs");
  const { stdout: editorOutput } = await run(process.execPath, [editorScript, "--cli", cliPath], consumer);

  console.log(importOutput.trim());
  console.log(`Installed all packages at ${[...installedVersions][0]}.`);
  console.log("Rendered through the registry CLI and default theme package.");
  console.log("Initialized, installed, built, and inspected a registry-backed theme scaffold.");
  console.log("Bundled registry packages through Vite.");
  console.log(editorOutput.trim());
  console.log(`Registry ${tag} acceptance passed in ${relative(tmpdir(), consumer)}.`);
} finally {
  await rm(consumer, { recursive: true, force: true });
}

async function install(cwd) {
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      await run("pnpm", ["install", "--no-frozen-lockfile", "--ignore-scripts"], cwd);
      return;
    } catch (error) {
      lastError = error;
      if (attempt < 4) await delay(5_000);
    }
  }
  throw lastError;
}

async function run(command, args, cwd) {
  return execFileAsync(command, args, {
    cwd,
    maxBuffer: 20 * 1024 * 1024,
    env: { ...process.env, CI: "true" }
  });
}

function readArgument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function delay(ms) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}
