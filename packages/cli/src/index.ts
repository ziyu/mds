#!/usr/bin/env node

import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseMds } from "@mds-crate/parser";
import { renderHtmlResult } from "@mds-crate/renderer-html";
import {
  createFileThemeRegistry,
  formatThemeDiagnostic,
  isThemeDiagnostic,
  ThemeValidationError,
  type ThemeCreationResult,
} from "@mds-crate/theme-loader";
import { cac } from "cac";
import { startEditorServer, type EditorServer } from "./editor-server.js";

if (process.argv[2] === "theme") {
  process.exitCode = await runThemeCommand(process.argv.slice(3));
} else {
  const cli = cac("mds");

  cli
    .command("build <input>", "Compile an MDS file to HTML")
    .option("-o, --output <path>", "Output HTML path")
    .option("--theme <path>", "Theme directory path")
    .option("--no-css", "Do not embed default CSS")
    .option("--json", "Print machine-readable build result and diagnostics")
    .action(async (input: string, options: { output?: string; theme?: string; css?: boolean; json?: boolean }) => {
      const source = await readFile(input, "utf8");
      const document = parseMds(source, {
        filePath: input
      });
      const themeResult = await resolveTheme(input, options.theme, document.frontmatter.theme).catch((error: unknown) => {
        const diagnostics = diagnosticsFromThemeError(error);
        if (options.json === true) {
          printJson({
            ok: false,
            diagnostics
          });
        } else {
          printDiagnostics(diagnostics);
        }
        process.exitCode = 1;
        return undefined;
      });
      if (process.exitCode === 1) {
        return;
      }

      const result = renderHtmlResult(
        document,
        {
          ...(themeResult === undefined ? {} : { theme: themeResult.theme }),
          ...(options.css === undefined ? {} : { includeCss: options.css })
        }
      );
      const html = result.html;
      const diagnostics = [...(themeResult?.diagnostics ?? []), ...result.diagnostics];
      const hasErrorDiagnostics = hasErrors({ diagnostics });

      if (options.json === true) {
        if (!hasErrorDiagnostics && options.output !== undefined) {
          await mkdir(dirname(options.output), {
            recursive: true
          });
          await writeFile(options.output, html, "utf8");
        }

        printJson({
          ok: !hasErrorDiagnostics,
          diagnostics,
          ...(options.output === undefined ? { html } : { output: options.output })
        });

        if (hasErrorDiagnostics) {
          process.exitCode = 1;
        }
        return;
      }

      printDiagnostics(diagnostics);

      if (hasErrorDiagnostics) {
        process.exitCode = 1;
        return;
      }

      if (options.output === undefined) {
        console.log(html);
        return;
      }

      await mkdir(dirname(options.output), {
        recursive: true
      });
      await writeFile(options.output, html, "utf8");
    });

  cli.command("ast <input>", "Print the MDS AST").action(async (input: string) => {
    const source = await readFile(input, "utf8");
    const document = parseMds(source, {
      filePath: input
    });

    console.log(JSON.stringify(document, null, 2));
  });

  cli.command("check <input>", "Check an MDS file").option("--json", "Print machine-readable diagnostics").action(async (input: string, options: { json?: boolean }) => {
    const source = await readFile(input, "utf8");
    const document = parseMds(source, {
      filePath: input
    });

    if (options.json === true) {
      printJson({
        ok: !hasErrors(document),
        diagnostics: document.diagnostics
      });
      if (hasErrors(document)) {
        process.exitCode = 1;
      }
      return;
    }

    printDiagnostics(document.diagnostics);

    if (hasErrors(document)) {
      process.exitCode = 1;
      return;
    }

    console.log("No MDS errors found.");
  });

  cli
    .command("edit [input]", "Open an MDS file or project directory in the local Editor")
    .option("--no-open", "Do not open the Editor in a browser")
    .option("--port <port>", "Local port (defaults to a free port)")
    .option("--json", "Print machine-readable server details")
    .action(async (
      input: string | undefined,
      options: { open?: boolean; port?: string; json?: boolean }
    ) => {
      const port = parseEditorPort(options.port);
      const editor = await startEditorServer({
        input: input ?? ".",
        ...(port === undefined ? {} : { port })
      });

      if (options.json === true) {
        printJson({
          ok: true,
          url: editor.url,
          projectRoot: editor.projectRoot,
          activeFile: editor.activeFile
        });
      } else {
        console.log(`MDS Editor: ${editor.url}`);
        console.log(`Project: ${editor.projectRoot}`);
        console.log(`File: ${editor.activeFile ?? "(create a new .mds file in the Editor)"}`);
        console.log("Press Ctrl+C to stop.");
      }

      if (options.open !== false) {
        try {
          await openEditorInBrowser(editor.url);
        } catch (error) {
          console.error(`Could not open the browser: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      await waitForEditorShutdown(editor);
    });

  cli.help();
  cli.parse();
}

function parseEditorPort(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const port = Number(value);
  if (!Number.isInteger(port) || port < 0 || port > 65_535) {
    throw new Error(`Editor port must be an integer from 0 to 65535; received ${value}.`);
  }
  return port;
}

function openEditorInBrowser(url: string): Promise<void> {
  const command = process.platform === "darwin" ? "open" : process.platform === "win32" ? "cmd" : "xdg-open";
  const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];

  return new Promise((resolveOpen, reject) => {
    const child = spawn(command, args, {
      detached: true,
      stdio: "ignore"
    });
    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolveOpen();
    });
  });
}

function waitForEditorShutdown(editor: EditorServer): Promise<void> {
  return new Promise((resolveShutdown, reject) => {
    let shuttingDown = false;
    const shutdown = () => {
      if (shuttingDown) {
        return;
      }
      shuttingDown = true;
      process.off("SIGINT", shutdown);
      process.off("SIGTERM", shutdown);
      editor.close().then(resolveShutdown, reject);
    };
    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
    editor.closed.then(() => {
      process.off("SIGINT", shutdown);
      process.off("SIGTERM", shutdown);
      resolveShutdown();
    }, reject);
  });
}

function printDiagnostics(diagnostics: Array<{ code: string; message: string; severity: string }>): void {
  for (const diagnostic of diagnostics) {
    console.error(isThemeDiagnostic(diagnostic) ? formatThemeDiagnostic(diagnostic) : formatGenericDiagnostic(diagnostic));
  }
}

function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

function hasErrors(document: { diagnostics: Array<{ severity: string }> }): boolean {
  return document.diagnostics.some((diagnostic) => diagnostic.severity === "error");
}

async function resolveTheme(
  input: string,
  optionTheme: string | undefined,
  frontmatterTheme: unknown
): Promise<ThemeCreationResult | undefined> {
  const themeRef = optionTheme ?? (typeof frontmatterTheme === "string" ? frontmatterTheme : undefined);
  if (themeRef === undefined || themeRef.length === 0) {
    return undefined;
  }

  const inputDirectory = dirname(resolve(input));
  const themes = createFileThemeRegistry({
    roots: [resolve("themes")],
    baseDirectory: inputDirectory
  });

  return themes.loadThemeWithDiagnostics(themeRef);
}

function diagnosticsFromThemeError(error: unknown): Array<{ code: string; message: string; severity: string }> {
  if (error instanceof ThemeValidationError) {
    return error.diagnostics;
  }

  return [
    {
      severity: "error",
      code: "theme-load-error",
      message: error instanceof Error ? error.message : String(error)
    }
  ];
}

function formatGenericDiagnostic(diagnostic: { code: string; message: string; severity: string }): string {
  return `${diagnostic.severity.toUpperCase()} ${diagnostic.code}: ${diagnostic.message}`;
}

async function runThemeCommand(args: string[]): Promise<number> {
  const themeCliCommand = await resolveThemeCliCommand();

  return new Promise((resolveExitCode, reject) => {
    const child = spawn(themeCliCommand.command, [...themeCliCommand.args, ...args], {
      env: {
        ...process.env,
        MDS_THEME_COMMAND_NAME: "mds theme"
      },
      stdio: "inherit"
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      resolveExitCode(code ?? 1);
    });
  });
}

async function resolveThemeCliCommand(): Promise<{ command: string; args: string[] }> {
  const currentFile = fileURLToPath(import.meta.url);
  if (currentFile.endsWith("/src/index.ts")) {
    return {
      command: process.execPath,
      args: ["--import", "tsx", resolve(dirname(currentFile), "../../theme-builder/src/cli.ts")]
    };
  }

  return {
    command: process.execPath,
    args: [fileURLToPath(await import.meta.resolve("@mds-crate/theme-builder/cli"))]
  };
}
