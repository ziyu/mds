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
  const { stdout: trustOutput } = await execFileAsync("npm", ["trust", "list", packageName, "--json"], {
    cwd: root,
    maxBuffer: 10 * 1024 * 1024
  });
  const parsedTrust = trustOutput.trim().length === 0 ? [] : JSON.parse(trustOutput);
  const trusts = Array.isArray(parsedTrust) ? parsedTrust : [parsedTrust];
  const matchingTrust = trusts.find(
    (trust) =>
      trust.type === "github" &&
      trust.repository === "ziyu/mds" &&
      trust.file === "publish.yml" &&
      trust.environment === "npm" &&
      (trust.permissions?.includes("createPackage") || trust.permissions?.includes("publish"))
  );

  if (matchingTrust) {
    console.log(`Trusted publisher already configured for ${packageName}.`);
    continue;
  }

  if (trusts.length > 0) {
    throw new Error(
      `Conflicting trusted publisher configuration exists for ${packageName}: ${JSON.stringify(trusts)}`
    );
  }

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

console.log(`Verified ${packageNames.length} packages for GitHub OIDC publishing as ${username}.`);
