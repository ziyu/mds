import { resolve } from "node:path";
import { formatThemeDiagnostic, isThemeDiagnostic } from "@mds/theme-loader";
import {
  buildPackageTheme,
  formatThemeBuildDiagnostic,
  inspectThemeArtifact,
  packThemeArtifact,
  relativeOutputPath,
  themeBuildErrorToDiagnostics,
  watchPackageTheme,
  type ThemeArtifactInspection,
  type ThemeArtifactPackResult
} from "./index.js";

export interface ThemeCliRunnerOptions {
  cwd?: string;
  commandName?: string;
  stdout?: Pick<typeof console, "log">;
  stderr?: Pick<typeof console, "error">;
  watchSignals?: NodeJS.Process;
}

export interface ThemeCliRunnerResult {
  exitCode: number;
}

export interface ThemeCliJsonDiagnosticResult {
  diagnostics: ReturnType<typeof themeBuildErrorToDiagnostics>;
}

export async function runThemeCli(
  args: string[],
  options: ThemeCliRunnerOptions = {}
): Promise<ThemeCliRunnerResult> {
  const cwd = options.cwd ?? process.cwd();
  const commandName = options.commandName ?? "mds-theme";
  const stdout = options.stdout ?? console;
  const stderr = options.stderr ?? console;
  const { positional, json } = parseThemeCliArgs(args);
  const [command, target = "."] = positional;

  if (command !== "build" && command !== "watch" && command !== "inspect" && command !== "pack") {
    stderr.error(`Usage: ${commandName} <build|watch|inspect|pack> [theme-package-or-artifact] [output-directory]`);
    return { exitCode: 1 };
  }

  if (command === "build") {
    const root = resolve(cwd, target);
    try {
      const result = await buildPackageTheme(root);
      if (json) {
        stdout.log(JSON.stringify(result, null, 2));
      } else {
        printBuildResult(root, result, cwd, stdout, stderr);
      }
      return { exitCode: 0 };
    } catch (error) {
      if (json) {
        printJsonDiagnostics(error, stdout);
      } else {
        printBuildError(error, stderr);
      }
      return { exitCode: 1 };
    }
  }

  if (command === "inspect") {
    try {
      const result = await inspectThemeArtifact(target, {
        baseDirectory: cwd
      });
      if (json) {
        stdout.log(JSON.stringify(result, null, 2));
      } else {
        printInspectionResult(result, cwd, stdout, stderr);
      }
      return {
        exitCode: result.diagnostics.some((diagnostic) => diagnostic.severity === "error") ? 1 : 0
      };
    } catch (error) {
      if (json) {
        printJsonDiagnostics(error, stdout);
      } else {
        printBuildError(error, stderr);
      }
      return { exitCode: 1 };
    }
  }

  if (command === "pack") {
    const output = positional[2];
    if (output === undefined) {
      stderr.error(`Usage: ${commandName} pack <theme-package-or-artifact> <output-directory>`);
      return { exitCode: 1 };
    }

    try {
      const result = await packThemeArtifact(target, resolve(cwd, output), {
        baseDirectory: cwd
      });
      if (json) {
        stdout.log(JSON.stringify(result, null, 2));
      } else {
        printPackResult(result, cwd, stdout, stderr);
      }
      return { exitCode: 0 };
    } catch (error) {
      if (json) {
        printJsonDiagnostics(error, stdout);
      } else {
        printBuildError(error, stderr);
      }
      return { exitCode: 1 };
    }
  }

  return runThemeWatch(target, cwd, options, stdout, stderr);
}

function parseThemeCliArgs(args: string[]): { positional: string[]; json: boolean } {
  return {
    positional: args.filter((arg) => arg !== "--json"),
    json: args.includes("--json")
  };
}

async function runThemeWatch(
  target: string,
  cwd: string,
  options: ThemeCliRunnerOptions,
  stdout: Pick<typeof console, "log">,
  stderr: Pick<typeof console, "error">
): Promise<ThemeCliRunnerResult> {
  const root = resolve(cwd, target);
  const watcher = watchPackageTheme(root, {
    onBuildStart() {
      stdout.log("Building MDS theme...");
    },
    onBuild(result) {
      printBuildResult(root, result, cwd, stdout, stderr);
    },
    onError(error) {
      printBuildError(error, stderr);
    }
  });

  const signals = options.watchSignals ?? process;
  signals.once("SIGINT", () => {
    watcher.close();
  });
  signals.once("SIGTERM", () => {
    watcher.close();
  });

  try {
    await watcher.ready;
    await watcher.closed;
    return { exitCode: 0 };
  } catch (error: unknown) {
    watcher.close();
    printBuildError(error, stderr);
    return { exitCode: 1 };
  }
}

function printBuildResult(
  root: string,
  result: Awaited<ReturnType<typeof buildPackageTheme>>,
  cwd: string,
  stdout: Pick<typeof console, "log">,
  stderr: Pick<typeof console, "error">
): void {
  stdout.log(
    `Built MDS theme package ${relativeOutputPath(cwd, root)} -> ${relativeOutputPath(
      cwd,
      result.outputDirectory
    )} (${result.filesWritten.length} files)`
  );
  if (result.metadataPath !== undefined) {
    stdout.log(`Wrote theme build metadata: ${result.metadataPath}`);
  }
  printDiagnostics(result.diagnostics, stderr);
}

function printInspectionResult(
  result: ThemeArtifactInspection,
  cwd: string,
  stdout: Pick<typeof console, "log">,
  stderr: Pick<typeof console, "error">
): void {
  stdout.log(`MDS theme: ${result.name}`);
  if (result.label !== undefined) {
    stdout.log(`Label: ${result.label}`);
  }
  if (result.description !== undefined) {
    stdout.log(`Description: ${result.description}`);
  }
  if (result.author !== undefined) {
    stdout.log(`Author: ${result.author}`);
  }
  if (result.homepage !== undefined) {
    stdout.log(`Homepage: ${result.homepage}`);
  }
  stdout.log(`Artifact: ${relativeOutputPath(cwd, result.artifactDirectory)}`);
  stdout.log(`Files: ${result.files.length}`);
  stdout.log(`Runtime files: ${result.runtimeFiles.length}`);
  printList("Development files", result.developmentFiles, stdout);
  printList("Blocks", result.blocks, stdout);
  printList("Supported blocks", result.supportedBlocks, stdout);
  printList(
    "Block packs",
    result.blockPacks.map((pack) =>
      pack.profiles.length === 0 ? pack.name : `${pack.name} (${pack.profiles.join("+")})`
    ),
    stdout
  );
  printList(
    "Template sources",
    result.templateSources.map((entry) => `${entry.block}=${entry.source}`),
    stdout
  );
  printList("Actions", result.actions, stdout);
  printList("Tags", result.tags, stdout);
  printList("CSS", result.assets.css, stdout);
  printList("JS", result.assets.js, stdout);
  printList("Head", result.assets.head, stdout);
  if (result.assets.shell !== undefined) {
    stdout.log(`Shell: ${result.assets.shell}`);
  }
  if (result.preview !== undefined) {
    stdout.log(`Preview: ${result.preview}`);
  }
  if (result.metadata !== undefined) {
    stdout.log(`Build metadata: ${result.metadata.source} -> ${result.metadata.output}`);
    printList("Build inputs", result.metadata.inputFiles, stdout);
  }
  printDiagnostics(result.diagnostics, stderr);
}

function printPackResult(
  result: ThemeArtifactPackResult,
  cwd: string,
  stdout: Pick<typeof console, "log">,
  stderr: Pick<typeof console, "error">
): void {
  stdout.log(
    `Packed MDS theme ${result.name} from ${relativeOutputPath(
      cwd,
      result.artifactDirectory
    )} -> ${relativeOutputPath(cwd, result.outputDirectory)} (${result.filesWritten.length} files)`
  );
  printDiagnostics(result.diagnostics, stderr);
}

function printBuildError(error: unknown, stderr: Pick<typeof console, "error">): void {
  for (const diagnostic of themeBuildErrorToDiagnostics(error)) {
    stderr.error(formatThemeBuildDiagnostic(diagnostic));
  }
}

function printJsonDiagnostics(error: unknown, stdout: Pick<typeof console, "log">): void {
  const result: ThemeCliJsonDiagnosticResult = {
    diagnostics: themeBuildErrorToDiagnostics(error)
  };
  stdout.log(JSON.stringify(result, null, 2));
}

function printDiagnostics(
  diagnostics: Array<{ code: string; message: string; severity: string }>,
  stderr: Pick<typeof console, "error">
): void {
  for (const diagnostic of diagnostics) {
    stderr.error(isThemeDiagnostic(diagnostic) ? formatThemeDiagnostic(diagnostic) : formatGenericDiagnostic(diagnostic));
  }
}

function formatGenericDiagnostic(diagnostic: { code: string; message: string; severity: string }): string {
  return `${diagnostic.severity.toUpperCase()} ${diagnostic.code}: ${diagnostic.message}`;
}

function printList(label: string, values: string[], stdout: Pick<typeof console, "log">): void {
  if (values.length === 0) {
    stdout.log(`${label}: none`);
    return;
  }

  stdout.log(`${label}: ${values.join(", ")}`);
}
