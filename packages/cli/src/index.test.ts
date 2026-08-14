import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("mds cli", () => {
  it("loads package themes by name from their built artifact", async () => {
    const project = await mkdtemp(join(tmpdir(), "mds-cli-package-theme-"));
    const themePackage = join(project, "node_modules/@acme/mds-theme-cli");
    const artifact = join(themePackage, "dist/theme");
    await mkdir(join(artifact, "blocks"), { recursive: true });
    await mkdir(join(themePackage, "src"), { recursive: true });
    await writeFile(
      join(themePackage, "package.json"),
      JSON.stringify(
        {
          name: "@acme/mds-theme-cli",
          type: "module",
          mdsTheme: {
            source: "./src/theme.tsx",
            dist: "./dist/theme"
          }
        },
        null,
        2
      ),
      "utf8"
    );
    await writeFile(join(themePackage, "src/theme.tsx"), "throw new Error('theme source must not execute');", "utf8");
    await writeFile(
      join(artifact, "theme.json"),
      JSON.stringify(
        {
          name: "cli-package-theme",
          css: "style.css",
          blocks: "blocks"
        },
        null,
        2
      ),
      "utf8"
    );
    await writeFile(join(artifact, "style.css"), ".cli-package-theme{color:red}", "utf8");
    await writeFile(
      join(artifact, "blocks/hero.html"),
      '<section class="cli-package-theme">{{ children }}</section>',
      "utf8"
    );
    const input = join(project, "index.mds");
    await writeFile(input, "::: hero\n# Package Theme\n:::\n", "utf8");

    const result = await runCli(["build", input, "--theme", "@acme/mds-theme-cli"]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(result.stdout).toContain("<style>.cli-package-theme{color:red}</style>");
    expect(result.stdout).toContain('<section class="cli-package-theme"><h1>Package Theme</h1></section>');
  });

  it("prints theme diagnostic block details when building", async () => {
    const project = await mkdtemp(join(tmpdir(), "mds-cli-theme-diagnostics-"));
    const theme = join(project, "theme");
    await mkdir(join(theme, "blocks"), { recursive: true });
    await writeFile(
      join(theme, "theme.json"),
      JSON.stringify(
        {
          name: "diagnostic-theme",
          supportedBlocks: ["hero", "hero"],
          blocks: "blocks"
        },
        null,
        2
      ),
      "utf8"
    );
    await writeFile(join(theme, "blocks/hero.html"), '<section class="hero">{{ children }}</section>', "utf8");
    const input = join(project, "index.mds");
    await writeFile(input, "::: hero\n# Diagnostic Theme\n:::\n", "utf8");

    const result = await runCli(["build", input, "--theme", theme]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain(
      "WARNING duplicate-theme-supported-block: Theme supported block is declared more than once.: hero. (field=supportedBlocks, block=hero)"
    );
    expect(result.stdout).toContain('<section class="hero"><h1>Diagnostic Theme</h1></section>');
  });

  it("prints check diagnostics as JSON", async () => {
    const project = await mkdtemp(join(tmpdir(), "mds-cli-check-json-"));
    const input = join(project, "index.mds");
    await writeFile(input, "::: note\ncontent\n", "utf8");

    const result = await runCli(["check", input, "--json"]);
    const payload = JSON.parse(result.stdout) as {
      ok: boolean;
      diagnostics: Array<{ code: string; severity: string }>;
    };

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toBe("");
    expect(payload.ok).toBe(false);
    expect(payload.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "unclosed-block",
        severity: "error"
      })
    );
  });

  it("prints build output and diagnostics as JSON", async () => {
    const project = await mkdtemp(join(tmpdir(), "mds-cli-build-json-"));
    const input = join(project, "index.mds");
    await writeFile(input, "::: custom-widget\n# Generated\n:::\n", "utf8");

    const result = await runCli(["build", input, "--json"]);
    const payload = JSON.parse(result.stdout) as {
      ok: boolean;
      html: string;
      diagnostics: Array<{ code: string; severity: string }>;
    };

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(payload.ok).toBe(true);
    expect(payload.html).toContain('data-block="custom-widget"');
    expect(payload.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "missing-block-renderer",
        severity: "warning"
      })
    );
  });

  it("delegates theme inspect JSON output to the theme builder CLI", async () => {
    const project = await mkdtemp(join(tmpdir(), "mds-cli-theme-inspect-json-"));
    const theme = join(project, "theme");
    await mkdir(join(theme, "blocks"), { recursive: true });
    await writeFile(
      join(theme, "theme.json"),
      JSON.stringify(
        {
          name: "inspect-json",
          label: "Inspect JSON",
          blocks: "blocks"
        },
        null,
        2
      ),
      "utf8"
    );
    await writeFile(join(theme, "blocks/hero.html"), '<section class="hero">{{ children }}</section>', "utf8");

    const result = await runCli(["theme", "inspect", theme, "--json"]);
    const inspection = JSON.parse(result.stdout) as {
      name: string;
      label: string;
      blocks: string[];
      diagnostics: unknown[];
    };

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(inspection.name).toBe("inspect-json");
    expect(inspection.label).toBe("Inspect JSON");
    expect(inspection.blocks).toEqual(["hero"]);
    expect(inspection.diagnostics).toEqual([]);
  });

  it("delegates theme build JSON output to the theme builder CLI", async () => {
    const project = await mkdtemp(join(tmpdir(), "mds-cli-theme-build-json-"));
    const theme = join(project, "theme");
    await mkdir(join(theme, "src"), { recursive: true });
    await writeFile(
      join(theme, "package.json"),
      JSON.stringify(
        {
          type: "module",
          mdsTheme: {
            source: "./src/theme.ts",
            dist: "./dist/theme"
          }
        },
        null,
        2
      ),
      "utf8"
    );
    await writeFile(
      join(theme, "src/theme.ts"),
      `import { Content, defineJsxTheme, jsx, Root } from "${resolve("../theme-loader/src/jsx.js")}";
export default defineJsxTheme({
  name: "build-json",
  blocks: {
    hero: (block) => jsx(Root, { block, className: "hero" }, jsx(Content, { block }))
  }
});`,
      "utf8"
    );

    const result = await runCli(["theme", "build", theme, "--json"]);
    const build = JSON.parse(result.stdout) as {
      outputDirectory: string;
      filesWritten: string[];
      diagnostics: unknown[];
      metadataPath?: string;
    };

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(build.outputDirectory).toBe(join(theme, "dist/theme"));
    expect(build.filesWritten).toEqual(expect.arrayContaining(["theme.json", "blocks/hero.html"]));
    expect(build.diagnostics).toEqual([]);
    expect(build.metadataPath).toBe(".mds-theme-build.json");
    await expect(readFile(join(theme, "dist/theme/theme.json"), "utf8")).resolves.toContain('"name": "build-json"');
  });

  it("delegates theme pack JSON output to the theme builder CLI", async () => {
    const project = await mkdtemp(join(tmpdir(), "mds-cli-theme-pack-json-"));
    const theme = join(project, "theme");
    const packed = join(project, "packed");
    await mkdir(join(theme, "blocks"), { recursive: true });
    await writeFile(
      join(theme, "theme.json"),
      JSON.stringify(
        {
          name: "pack-json",
          blocks: "blocks"
        },
        null,
        2
      ),
      "utf8"
    );
    await writeFile(join(theme, "blocks/hero.html"), '<section class="hero">{{ children }}</section>', "utf8");
    await writeFile(join(theme, ".mds-theme-build.json"), "{}", "utf8");

    const result = await runCli(["theme", "pack", theme, packed, "--json"]);
    const pack = JSON.parse(result.stdout) as {
      name: string;
      outputDirectory: string;
      filesWritten: string[];
      diagnostics: unknown[];
    };

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe("");
    expect(pack.name).toBe("pack-json");
    expect(pack.outputDirectory).toBe(packed);
    expect(pack.filesWritten).toEqual(expect.arrayContaining(["theme.json", "blocks/hero.html"]));
    expect(pack.diagnostics).toEqual([]);
    await expect(readFile(join(packed, "theme.json"), "utf8")).resolves.toContain('"name": "pack-json"');
    await expect(readFile(join(packed, ".mds-theme-build.json"), "utf8")).rejects.toThrow();
  });
});

async function runCli(args: string[]): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const cliSource = resolve("../..", "packages/cli/src/index.ts");

  return new Promise((resolveRun, reject) => {
    const child = spawn(process.execPath, ["--import", "tsx", cliSource, ...args], {
      cwd: resolve("../.."),
      env: {
        ...process.env,
        TMPDIR: process.platform === "darwin" ? "/private/tmp" : tmpdir()
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      resolveRun({
        exitCode: code ?? 1,
        stdout,
        stderr
      });
    });
  });
}
