#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { parseMds } from "@mds/parser";
import { renderHtmlResult, type HtmlTheme } from "@mds/renderer-html";
import { createFileThemeRegistry } from "@mds/theme-loader";
import { cac } from "cac";

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
    const theme = await resolveTheme(input, options.theme, document.frontmatter.theme);
    const result = renderHtmlResult(
      document,
      {
        ...(theme === undefined ? {} : { theme }),
        ...(options.css === undefined ? {} : { includeCss: options.css })
      }
    );
    const html = result.html;

    printDiagnostics(result.diagnostics);

    if (hasErrors(result)) {
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

function printDiagnostics(diagnostics: Array<{ code: string; message: string; severity: string }>): void {
  for (const diagnostic of diagnostics) {
    console.error(`${diagnostic.severity.toUpperCase()} ${diagnostic.code}: ${diagnostic.message}`);
  }
}

function hasErrors(document: { diagnostics: Array<{ severity: string }> }): boolean {
  return document.diagnostics.some((diagnostic) => diagnostic.severity === "error");
}

async function resolveTheme(
  input: string,
  optionTheme: string | undefined,
  frontmatterTheme: unknown
): Promise<HtmlTheme | undefined> {
  const themeRef = optionTheme ?? (typeof frontmatterTheme === "string" ? frontmatterTheme : undefined);
  if (themeRef === undefined || themeRef.length === 0) {
    return undefined;
  }

  const inputDirectory = dirname(resolve(input));
  const themes = createFileThemeRegistry({
    roots: [resolve("themes")],
    baseDirectory: inputDirectory
  });

  return themes.loadTheme(themeRef);
}
