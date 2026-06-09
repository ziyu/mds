#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { parseMds } from "@mds/parser";
import { renderHtml } from "@mds/renderer-html";
import { cac } from "cac";

const cli = cac("mds");

cli
  .command("build <input>", "Compile an MDS file to HTML")
  .option("-o, --output <path>", "Output HTML path")
  .option("--no-css", "Do not embed default CSS")
  .action(async (input: string, options: { output?: string; css?: boolean }) => {
    const source = await readFile(input, "utf8");
    const document = parseMds(source, {
      filePath: input
    });
    const html = renderHtml(
      document,
      options.css === undefined
        ? {}
        : {
            includeCss: options.css
          }
    );

    printDiagnostics(document.diagnostics);

    if (hasErrors(document)) {
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
