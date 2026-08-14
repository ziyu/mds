import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { publicPackageDirectories } from "./public-packages.mjs";

const execFileAsync = promisify(execFile);
const root = resolve(import.meta.dirname, "..");
const packageNames = await Promise.all(
  publicPackageDirectories.map(async (directory) => {
    const manifest = JSON.parse(await readFile(resolve(root, directory, "package.json"), "utf8"));
    return manifest.name;
  })
);

const { stdout: whoamiOutput } = await execFileAsync("npm", ["whoami"], { cwd: root });
const username = whoamiOutput.trim();
if (username.length === 0) {
  throw new Error("npm authentication is required before configuring trusted publishers.");
}

for (const packageName of packageNames) {
  await execFileAsync(
    "npm",
    [
      "trust",
      "github",
      packageName,
      "--repo",
      "ziyu/mds",
      "--file",
      "publish.yml",
      "--env",
      "npm",
      "--allow-publish",
      "--yes"
    ],
    {
      cwd: root,
      maxBuffer: 10 * 1024 * 1024
    }
  );
  console.log(`Configured npm trusted publisher for ${packageName}.`);
}

console.log(`Configured ${packageNames.length} packages for GitHub OIDC publishing as ${username}.`);
