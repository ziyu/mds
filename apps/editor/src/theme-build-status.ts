import type { ThemeBuildProviderResult, ThemeInspectionProviderResult } from "./theme-build-contract.js";

export interface ThemeBuildSummary {
  ref: string;
  outputDirectory: string;
  sourcePath: string;
  inputFiles: number;
  filesWritten: number;
}

export interface ThemeInspectionSummary {
  ref: string;
  artifactDirectory: string;
  runtimeFiles: number;
  developmentFiles: number;
  blocks: number;
}

export function createThemeBuildSummary(ref: string, result: ThemeBuildProviderResult): ThemeBuildSummary {
  return {
    ref,
    outputDirectory: result.outputDirectory,
    sourcePath: result.sourcePath,
    inputFiles: result.inputFiles.length,
    filesWritten: result.filesWritten.length
  };
}

export function createThemeInspectionSummary(ref: string, result: ThemeInspectionProviderResult): ThemeInspectionSummary {
  return {
    ref,
    artifactDirectory: result.artifactDirectory,
    runtimeFiles: result.runtimeFiles.length,
    developmentFiles: result.developmentFiles.length,
    blocks: result.blocks.length
  };
}

export function formatThemeBuildSummary(summary: ThemeBuildSummary): string {
  return `${summary.ref}: ${summary.filesWritten.toLocaleString()} files from ${compactPath(summary.sourcePath)}`;
}

export function formatThemeBuildOutput(summary: ThemeBuildSummary): string {
  return `output ${compactPath(summary.outputDirectory)} / ${summary.inputFiles.toLocaleString()} inputs`;
}

export function formatThemeInspectionSummary(summary: ThemeInspectionSummary): string {
  return `${summary.ref}: ${summary.runtimeFiles.toLocaleString()} runtime files / ${summary.blocks.toLocaleString()} blocks`;
}

export function formatThemeInspectionOutput(summary: ThemeInspectionSummary): string {
  const development = summary.developmentFiles === 0 ? "no development files" : `${summary.developmentFiles.toLocaleString()} development files`;
  return `artifact ${compactPath(summary.artifactDirectory)} / ${development}`;
}

export function compactPath(path: string): string {
  const parts = path.split(/[\\/]+/).filter(Boolean);
  if (parts.length <= 3) {
    return path;
  }

  return `.../${parts.slice(-3).join("/")}`;
}
