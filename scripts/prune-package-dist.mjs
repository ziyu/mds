import { readdir, rm } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve("dist");

async function prune(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return;
    }
    throw error;
  }

  await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        await prune(path);
        return;
      }

      if (entry.isFile() && entry.name.includes(".test.")) {
        await rm(path, { force: true });
      }
    })
  );
}

await prune(root);
