import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { publicPackageDirectories } from "./public-packages.mjs";

const execFileAsync = promisify(execFile);
const root = resolve(import.meta.dirname, "..");
const skipAuth = process.argv.includes("--skip-auth");
const allowDirty = process.argv.includes("--allow-dirty");
const manifests = await Promise.all(
  publicPackageDirectories.map(async (directory) => ({
    directory,
    manifest: JSON.parse(await readFile(resolve(root, directory, "package.json"), "utf8"))
  }))
);

if (!allowDirty) {
  const { stdout } = await run("git", ["status", "--porcelain"]);
  if (stdout.trim().length > 0) {
    throw new Error("Release checkout must be clean. Commit or stash changes before publishing.");
  }
}

const versions = new Set(manifests.map(({ manifest }) => manifest.version));
if (versions.size !== 1) {
  throw new Error(`Fixed public packages do not share one version: ${[...versions].join(", ")}.`);
}
const version = [...versions][0];
if (typeof version !== "string" || !/^0\.1\.0-beta\.[1-9]\d*$/.test(version)) {
  throw new Error(
    `Target version must be a versioned beta release (expected 0.1.0-beta.1 or newer, received ${String(version)}). Merge the Changesets version PR first.`
  );
}

for (const { directory, manifest } of manifests) {
  if (typeof manifest.name !== "string" || !manifest.name.startsWith("@mds-crate/")) {
    throw new Error(`${directory} does not declare an @mds-crate package name.`);
  }
  if (manifest.publishConfig?.access !== "public") {
    throw new Error(`${manifest.name} is not configured for public scoped publication.`);
  }
}

const { stdout: npmVersionOutput } = await run("npm", ["--version"]);
const npmVersion = npmVersionOutput.trim();
if (compareVersions(npmVersion, "11.5.1") < 0) {
  throw new Error(`npm 11.5.1 or newer is required for trusted publishing; received ${npmVersion}.`);
}

const { stdout: registryOutput } = await run("npm", ["config", "get", "registry"]);
const registry = registryOutput.trim().replace(/\/+$/, "");
if (registry !== "https://registry.npmjs.org") {
  throw new Error(`Release registry must be https://registry.npmjs.org; received ${registry}.`);
}

let username = "OIDC trusted publisher";
if (!skipAuth) {
  const { stdout: whoamiOutput } = await run("npm", ["whoami"]);
  username = whoamiOutput.trim();
  const { stdout: organizationOutput } = await run("npm", ["org", "ls", "mds-crate", "--json"]);
  const organization = JSON.parse(organizationOutput || "{}");
  if (!hasOrganizationMember(organization, username)) {
    throw new Error(`npm user ${username} is not listed as a member of the mds-crate organization.`);
  }
}

const alreadyPublished = [];
for (const { manifest } of manifests) {
  const target = `${manifest.name}@${version}`;
  try {
    const { stdout } = await run("npm", ["view", target, "version", "--json"]);
    const publishedVersion = JSON.parse(stdout);
    if (publishedVersion === version || (Array.isArray(publishedVersion) && publishedVersion.includes(version))) {
      alreadyPublished.push(target);
    }
  } catch (error) {
    if (!isNpmNotFoundError(error)) throw error;
  }
}
if (alreadyPublished.length > 0) {
  throw new Error(`Target versions are already published: ${alreadyPublished.join(", ")}.`);
}

try {
  const { stdout } = await run("gh", ["repo", "view", "ziyu/mds", "--json", "visibility"]);
  const repository = JSON.parse(stdout);
  if (repository.visibility !== "PUBLIC") {
    console.warn("Warning: ziyu/mds is private, so npm public provenance will not be available for this release.");
  }
} catch {
  console.warn("Warning: GitHub repository visibility could not be checked.");
}

console.log(`Release readiness passed for ${manifests.length} packages at ${version}.`);
console.log(`Publisher: ${username}`);
console.log(`Registry: ${registry}`);
console.log("Target dist-tag: next");

async function run(command, args) {
  try {
    return await execFileAsync(command, args, { cwd: root, maxBuffer: 10 * 1024 * 1024 });
  } catch (error) {
    const message = [error?.message, error?.stdout, error?.stderr].filter(Boolean).join("\n");
    const releaseError = new Error(`${command} ${args.join(" ")} failed:\n${message}`);
    releaseError.cause = error;
    throw releaseError;
  }
}

function isNpmNotFoundError(error) {
  const values = [error?.message, error?.cause?.message, error?.cause?.stdout, error?.cause?.stderr];
  return values.some((value) => typeof value === "string" && /E404|404 Not Found|is not in this registry/i.test(value));
}

function hasOrganizationMember(value, username) {
  if (Array.isArray(value)) {
    return value.some((entry) => entry === username || entry?.user === username || entry?.name === username);
  }
  return typeof value === "object" && value !== null && Object.prototype.hasOwnProperty.call(value, username);
}

function compareVersions(left, right) {
  const leftParts = left.split(".").map(Number);
  const rightParts = right.split(".").map(Number);
  for (let index = 0; index < Math.max(leftParts.length, rightParts.length); index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}
