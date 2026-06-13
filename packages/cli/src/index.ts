#!/usr/bin/env node

import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseMds } from "@mds/parser";
import { renderHtmlResult } from "@mds/renderer-html";
import {
  createFileThemeRegistry,
  formatThemeDiagnostic,
  isThemeDiagnostic,
  ThemeValidationError,
  type ThemeCreationResult,
} from "@mds/theme-loader";
import { cac } from "cac";

if (process.argv[2] === "theme") {
  process.exitCode = await runThemeCommand(process.argv.slice(3));
} else {
  const cli = cac("mds");

  cli
    .command("build <input>", "Compile an MDS file to HTML")
    .option("-o, --output <path>", "Output HTML path")
    .option("--theme <path>", "Theme directory path")
    .option("--no-css", "Do not embed default CSS")
    .action(async (input: string, options: { output?: string; theme?: string; css?: boolean }) => {
      const source = await readFile(input, "utf8");
      const document = parseMds(source, {
        filePath: input
      });
      const themeResult = await resolveTheme(input, options.theme, document.frontmatter.theme).catch((error: unknown) => {
        printDiagnostics(diagnosticsFromThemeError(error));
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

      printDiagnostics(diagnostics);

      if (hasErrors({ diagnostics })) {
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

  cli.command("check <input>", "Check an MDS file").action(async (input: string) => {
    const source = await readFile(input, "utf8");
    const document = parseMds(source, {
      filePath: input
    });

    printDiagnostics(document.diagnostics);

    if (hasErrors(document)) {
      process.exitCode = 1;
      return;
    }

    console.log("No MDS errors found.");
  });

  cli.help();
  cli.parse();
}

function printDiagnostics(diagnostics: Array<{ code: string; message: string; severity: string }>): void {
  for (const diagnostic of diagnostics) {
    console.error(isThemeDiagnostic(diagnostic) ? formatThemeDiagnostic(diagnostic) : formatGenericDiagnostic(diagnostic));
  }
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
      args: [fileURLToPath(await import.meta.resolve("tsx/cli")), resolve(dirname(currentFile), "../../theme-builder/src/cli.ts")]
    };
  }

  return {
    command: process.execPath,
    args: [fileURLToPath(await import.meta.resolve("@mds/theme-builder/cli"))]
  };
}
