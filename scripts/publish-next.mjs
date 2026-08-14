import { execFile, spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { promisify } from "node:util";
import { publicPackageDirectories } from "./public-packages.mjs";

const execFileAsync = promisify(execFile);
const root = resolve(import.meta.dirname, "..");
const dryRun = process.argv.includes("--dry-run");
const tag = "next";
const packDirectory = await mkdtemp(join(tmpdir(), "mds-npm-release-"));

const { stdout: statusOutput } = await run("git", ["status", "--porcelain"], root);
if (!dryRun && statusOutput.trim().length > 0) {
  throw new Error("Release checkout must be clean before packing and publishing.");
}
if (dryRun && statusOutput.trim().length > 0) {
  console.warn("Dry run is using a dirty checkout; npm publishing and Git tag creation remain disabled.");
}

const releases = await Promise.all(
  publicPackageDirectories.map(async (directory) => {
    const manifest = JSON.parse(await readFile(resolve(root, directory, "package.json"), "utf8"));
    return { directory, manifest };
  })
);
const versions = new Set(releases.map(({ manifest }) => manifest.version));
if (versions.size !== 1) {
  throw new Error(`Fixed public packages do not share one version: ${[...versions].join(", ")}.`);
}
const version = [...versions][0];
if (typeof version !== "string" || !/^0\.1\.0-beta\.[1-9]\d*$/.test(version)) {
  throw new Error(`Refusing to publish non-beta package version ${String(version)} to ${tag}.`);
}

try {
  const packedReleases = [];
  for (const release of releases) {
    const { directory, manifest } = release;
    if (typeof manifest.name !== "string" || !manifest.name.startsWith("@mds-crate/")) {
      throw new Error(`${directory} does not declare an @mds-crate package name.`);
    }
    if (manifest.publishConfig?.access !== "public") {
      throw new Error(`${manifest.name} is not configured for public publication.`);
    }

    const cwd = resolve(root, directory);
    const { stdout } = await run(
      "pnpm",
      ["--reporter=silent", "pack", "--json", "--pack-destination", packDirectory],
      cwd
    );
    const jsonStart = stdout.indexOf("{");
    if (jsonStart === -1) {
      throw new Error(`pnpm pack did not return package metadata for ${manifest.name}.`);
    }
    const packed = JSON.parse(stdout.slice(jsonStart));
    const tarballPath = isAbsolute(packed.filename) ? packed.filename : resolve(packDirectory, packed.filename);
    const { stdout: packedManifestText } = await run(
      "tar",
      ["-xOf", tarballPath, "package/package.json"],
      root
    );
    const packedManifest = JSON.parse(packedManifestText);
    if (packedManifest.name !== manifest.name || packedManifest.version !== version) {
      throw new Error(`${manifest.name} tarball identity does not match the release manifest.`);
    }
    if (JSON.stringify(packedManifest).includes("workspace:")) {
      throw new Error(`${manifest.name} tarball still contains workspace protocol dependencies.`);
    }

    packedReleases.push({ name: manifest.name, version, tarballPath });
    console.log(`Packed ${manifest.name}@${version}.`);
  }

  if (dryRun) {
    console.log(`Dry run packed ${packedReleases.length} packages in dependency order; npm was not changed.`);
  } else {
    for (const release of packedReleases) {
      console.log(`Publishing ${release.name}@${release.version} with the ${tag} dist-tag...`);
      await runInteractive("npm", [
        "publish",
        release.tarballPath,
        "--access",
        "public",
        "--tag",
        tag,
        "--registry",
        "https://registry.npmjs.org"
      ]);
    }
    for (const release of packedReleases) {
      await createReleaseTag(`${release.name}@${release.version}`);
    }
    console.log(`Published ${packedReleases.length} packages at ${version} with the ${tag} dist-tag.`);
  }
} finally {
  await rm(packDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}

async function createReleaseTag(tagName) {
  const { stdout: existingTagOutput } = await run("git", ["tag", "--list", tagName], root);
  if (existingTagOutput.trim() === tagName) {
    const [{ stdout: taggedCommitOutput }, { stdout: headOutput }] = await Promise.all([
      run("git", ["rev-list", "-n", "1", tagName], root),
      run("git", ["rev-parse", "HEAD"], root)
    ]);
    if (taggedCommitOutput.trim() !== headOutput.trim()) {
      throw new Error(`Release tag ${tagName} already points to another commit.`);
    }
    return;
  }
  await run("git", ["tag", tagName], root);
  console.log(`Created git tag ${tagName}.`);
}

async function run(command, args, cwd) {
  return execFileAsync(command, args, { cwd, maxBuffer: 20 * 1024 * 1024 });
}

async function runInteractive(command, args) {
  await new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, { cwd: root, stdio: "inherit", env: process.env });
    child.once("error", rejectRun);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolveRun();
        return;
      }
      rejectRun(
        new Error(`${command} ${args.join(" ")} failed with ${signal === null ? `exit ${String(code)}` : `signal ${signal}`}.`)
      );
    });
  });
}
