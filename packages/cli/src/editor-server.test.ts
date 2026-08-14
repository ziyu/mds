import { mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { startEditorServer, type EditorServer } from "./editor-server.js";

const servers: EditorServer[] = [];
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("MDS Editor production server", () => {
  it("opens, creates, saves, and protects externally modified files", async () => {
    const project = await createProject();
    const input = join(project.root, "index.mds");
    await writeFile(input, "# Original\n", "utf8");
    const server = await startTestServer(project.root, input);
    const client = await createClient(server);

    const session = await client.json("/__mds/session") as {
      projectRoot: string;
      activeFile: { path: string; content: string; revision: string };
      files: string[];
    };
    expect(session.projectRoot).toBe(project.root);
    expect(session.activeFile).toMatchObject({ path: "index.mds", content: "# Original\n" });
    expect(session.files).toEqual(["index.mds"]);

    const saved = await client.json("/__mds/file", {
      method: "PUT",
      body: {
        path: "index.mds",
        content: "# Saved\n",
        revision: session.activeFile.revision
      }
    }) as { file: { revision: string } };
    await expect(readFile(input, "utf8")).resolves.toBe("# Saved\n");

    await writeFile(input, "# External\n", "utf8");
    const conflict = await client.response("/__mds/file", {
      method: "PUT",
      body: {
        path: "index.mds",
        content: "# Local\n",
        revision: saved.file.revision
      }
    });
    expect(conflict.status).toBe(409);
    await expect(conflict.json()).resolves.toMatchObject({
      code: "file-conflict",
      file: { path: "index.mds", content: "# External\n" }
    });
    await expect(readFile(input, "utf8")).resolves.toBe("# External\n");

    const overwritten = await client.response("/__mds/file", {
      method: "PUT",
      body: {
        path: "index.mds",
        content: "# Local\n",
        revision: saved.file.revision,
        overwrite: true
      }
    });
    expect(overwritten.status).toBe(200);
    await expect(readFile(input, "utf8")).resolves.toBe("# Local\n");

    const created = await client.response("/__mds/files", {
      method: "POST",
      body: { path: "notes.mds" }
    });
    expect(created.status).toBe(201);
    await expect(readFile(join(project.root, "notes.mds"), "utf8")).resolves.toBe("# Untitled\n");
  });

  it("requires the session token and rejects traversal and symlink escapes", async () => {
    const project = await createProject();
    await writeFile(join(project.root, "index.mds"), "# Safe\n", "utf8");
    const outside = await mkdtemp(join(tmpdir(), "mds-editor-outside-"));
    temporaryDirectories.push(outside);
    await writeFile(join(outside, "secret.mds"), "# Secret\n", "utf8");
    await symlink(join(outside, "secret.mds"), join(project.root, "linked.mds"));
    const server = await startTestServer(project.root, project.root);
    const client = await createClient(server);

    const missingToken = await fetch(new URL("/__mds/session", server.url));
    expect(missingToken.status).toBe(403);

    const traversal = await client.response("/__mds/file?path=../secret.mds");
    expect(traversal.status).toBe(400);
    await expect(traversal.json()).resolves.toMatchObject({ code: "invalid-file-path" });

    const symlinkResponse = await client.response("/__mds/file?path=linked.mds");
    expect(symlinkResponse.status).toBe(403);
    await expect(symlinkResponse.json()).resolves.toMatchObject({ code: "symlink-not-allowed" });
  });

  it("lists and loads project-installed theme artifacts and the bundled default", async () => {
    const project = await createProject();
    await writeFile(join(project.root, "index.mds"), "---\ntheme: @acme/mds-theme\n---\n# Theme\n", "utf8");
    const packageDirectory = join(project.root, "node_modules/@acme/mds-theme");
    await mkdir(join(packageDirectory, "dist/theme/blocks"), { recursive: true });
    await writeFile(join(project.root, "package.json"), JSON.stringify({
      dependencies: { "@acme/mds-theme": "1.0.0" }
    }), "utf8");
    await writeFile(join(packageDirectory, "package.json"), JSON.stringify({
      name: "@acme/mds-theme",
      mdsTheme: { dist: "./dist/theme" }
    }), "utf8");
    await writeFile(join(packageDirectory, "dist/theme/theme.json"), JSON.stringify({
      name: "acme",
      label: "Acme Theme",
      blocks: "blocks"
    }), "utf8");
    await writeFile(join(packageDirectory, "dist/theme/blocks/hero.html"), "<section>{{ children }}</section>", "utf8");
    const server = await startTestServer(project.root, project.root);
    const client = await createClient(server);

    const themes = await client.json("/__mds/themes") as Array<{ name: string; label: string }>;
    expect(themes).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: "default", label: "Default" }),
      expect.objectContaining({ name: "@acme/mds-theme", label: "Acme Theme" })
    ]));

    const installed = await client.json("/__mds/themes/%40acme%2Fmds-theme") as {
      manifest: { name: string };
      files: Record<string, string>;
    };
    expect(installed.manifest.name).toBe("acme");
    expect(installed.files["blocks/hero.html"]).toContain("<section>");

    const bundledResponse = await client.response("/__mds/themes/default");
    expect(bundledResponse.status, await bundledResponse.clone().text()).toBe(200);
    const bundled = await bundledResponse.json() as { manifest: { name: string } };
    expect(bundled.manifest.name).toBe("default");
  });
});

async function createProject(): Promise<{ root: string }> {
  const root = await realpath(await mkdtemp(join(tmpdir(), "mds-editor-project-")));
  temporaryDirectories.push(root);
  return { root };
}

async function startTestServer(projectRoot: string, input: string): Promise<EditorServer> {
  const assets = await mkdtemp(join(tmpdir(), "mds-editor-assets-"));
  temporaryDirectories.push(assets);
  await mkdir(join(assets, "assets"), { recursive: true });
  await writeFile(join(assets, "index.html"), "<!doctype html><html><head></head><body><div id=\"root\"></div></body></html>", "utf8");
  const server = await startEditorServer({ input, assetsDirectory: assets });
  expect(server.projectRoot).toBe(projectRoot);
  servers.push(server);
  return server;
}

async function createClient(server: EditorServer): Promise<{
  response(path: string, options?: { method?: string; body?: unknown }): Promise<Response>;
  json(path: string, options?: { method?: string; body?: unknown }): Promise<unknown>;
}> {
  const index = await fetch(server.url);
  const html = await index.text();
  const token = html.match(/name="mds-editor-token" content="([a-f0-9]+)"/)?.[1];
  expect(token).toBeDefined();

  const response = (path: string, options: { method?: string; body?: unknown } = {}) => fetch(new URL(path, server.url), {
    method: options.method ?? "GET",
    headers: {
      "X-MDS-Editor-Token": token!,
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" })
    },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) })
  });
  return {
    response,
    async json(path, options) {
      const result = await response(path, options);
      expect(result.ok).toBe(true);
      return result.json();
    }
  };
}
