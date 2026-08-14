import { execFile } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = resolve(import.meta.dirname, "..");
const outputDirectory = resolve(root, "packages/cli/dist/editor");

await mkdir(outputDirectory, { recursive: true });
await execFileAsync(
  "pnpm",
  [
    "--filter",
    "@mds-crate/editor",
    "exec",
    "vite",
    "build",
    "--outDir",
    outputDirectory,
    "--emptyOutDir"
  ],
  {
    cwd: root,
    maxBuffer: 10 * 1024 * 1024
  }
);
