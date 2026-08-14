import { isThemeDiagnostic, type ThemeDiagnostic } from "@mds/theme-loader/browser";
import type {
  PackageThemeBuildResult,
  ThemeArtifactAssets,
  ThemeArtifactInspection,
  ThemeBuildDiagnostic,
  ThemeBuildMetadata,
  ThemeBuildStage
} from "@mds/theme-builder";

export interface ThemeBuildProviderDiagnostic extends ThemeDiagnostic {
  stage?: ThemeBuildStage;
}

export interface ThemeBuildProviderResult {
  packageDirectory: string;
  outputDirectory: string;
  sourcePath: string;
  inputFiles: string[];
  filesWritten: string[];
  diagnostics: ThemeDiagnostic[];
  metadataPath?: string;
}

export interface ThemeBuildProviderErrorBody {
  diagnostics: ThemeBuildProviderDiagnostic[];
  message?: unknown;
}

export interface ThemeInspectionProviderResult {
  ref: string;
  artifactDirectory: string;
  name: string;
  label?: string;
  description?: string;
  author?: string;
  homepage?: string;
  preview?: string;
  tags: string[];
  supportedBlocks: string[];
  files: string[];
  runtimeFiles: string[];
  developmentFiles: string[];
  assets: ThemeArtifactAssets;
  blocks: string[];
  actions: string[];
  blockPacks: ThemeArtifactInspection["blockPacks"];
  templateSources: ThemeArtifactInspection["templateSources"];
  diagnostics: ThemeDiagnostic[];
  metadata?: ThemeBuildMetadata;
}

export type ThemeBuildHmrPayload =
  | {
      ref: string;
      status: "success";
      result: ThemeBuildProviderResult;
    }
  | {
      ref: string;
      status: "error";
      message: string;
      diagnostics: ThemeBuildProviderDiagnostic[];
    };

const themeBuildStages = [
  "read-package",
  "read-config",
  "load-source",
  "compose-blocks",
  "merge-assets",
  "resolve-artifact",
  "read-artifact",
  "validate-artifact",
  "write-artifact"
] satisfies readonly ThemeBuildStage[];

export function serializeThemeBuildResult(result: PackageThemeBuildResult): ThemeBuildProviderResult {
  return {
    packageDirectory: result.packageDirectory,
    outputDirectory: result.outputDirectory,
    sourcePath: result.sourcePath,
    inputFiles: result.inputFiles,
    filesWritten: result.filesWritten,
    diagnostics: result.diagnostics,
    ...(result.metadataPath === undefined ? {} : { metadataPath: result.metadataPath })
  };
}

export function serializeThemeInspectionResult(result: ThemeArtifactInspection): ThemeInspectionProviderResult {
  return {
    ref: result.ref,
    artifactDirectory: result.artifactDirectory,
    name: result.name,
    ...(result.label === undefined ? {} : { label: result.label }),
    ...(result.description === undefined ? {} : { description: result.description }),
    ...(result.author === undefined ? {} : { author: result.author }),
    ...(result.homepage === undefined ? {} : { homepage: result.homepage }),
    ...(result.preview === undefined ? {} : { preview: result.preview }),
    tags: result.tags,
    supportedBlocks: result.supportedBlocks,
    files: result.files,
    runtimeFiles: result.runtimeFiles,
    developmentFiles: result.developmentFiles,
    assets: result.assets,
    blocks: result.blocks,
    actions: result.actions,
    blockPacks: result.blockPacks,
    templateSources: result.templateSources,
    diagnostics: result.diagnostics,
    ...(result.metadata === undefined ? {} : { metadata: result.metadata })
  };
}

export function serializeThemeBuildSuccessHmrPayload(ref: string, result: PackageThemeBuildResult): ThemeBuildHmrPayload {
  return {
    ref,
    status: "success",
    result: serializeThemeBuildResult(result)
  };
}

export function serializeThemeBuildErrorHmrPayload(
  ref: string,
  diagnostics: ThemeBuildDiagnostic[],
  message = diagnostics[0]?.message ?? "Theme build failed."
): ThemeBuildHmrPayload {
  return {
    ref,
    status: "error",
    message,
    diagnostics
  };
}

export function serializeThemeBuildErrorBody(
  diagnostics: ThemeBuildDiagnostic[],
  message = diagnostics[0]?.message ?? "Theme build failed."
): ThemeBuildProviderErrorBody {
  return {
    message,
    diagnostics
  };
}

export function isThemeBuildProviderResult(value: unknown): value is ThemeBuildProviderResult {
  return (
    isRecord(value) &&
    typeof value.packageDirectory === "string" &&
    typeof value.outputDirectory === "string" &&
    typeof value.sourcePath === "string" &&
    isStringArray(value.inputFiles) &&
    isStringArray(value.filesWritten) &&
    Array.isArray(value.diagnostics) &&
    value.diagnostics.every(isThemeDiagnostic) &&
    hasOptionalString(value, "metadataPath")
  );
}

export function isThemeBuildProviderErrorBody(value: unknown): value is ThemeBuildProviderErrorBody {
  return isRecord(value) && Array.isArray(value.diagnostics) && value.diagnostics.every(isThemeBuildProviderDiagnostic);
}

export function isThemeInspectionProviderResult(value: unknown): value is ThemeInspectionProviderResult {
  return (
    isRecord(value) &&
    typeof value.ref === "string" &&
    typeof value.artifactDirectory === "string" &&
    typeof value.name === "string" &&
    hasOptionalString(value, "label") &&
    hasOptionalString(value, "description") &&
    hasOptionalString(value, "author") &&
    hasOptionalString(value, "homepage") &&
    hasOptionalString(value, "preview") &&
    isStringArray(value.tags) &&
    isStringArray(value.supportedBlocks) &&
    isStringArray(value.files) &&
    isStringArray(value.runtimeFiles) &&
    isStringArray(value.developmentFiles) &&
    isThemeArtifactAssets(value.assets) &&
    isStringArray(value.blocks) &&
    isStringArray(value.actions) &&
    isThemeBlockPackMetadataArray(value.blockPacks) &&
    isThemeTemplateSourceMetadataArray(value.templateSources) &&
    Array.isArray(value.diagnostics) &&
    value.diagnostics.every(isThemeDiagnostic) &&
    hasOptionalBuildMetadata(value, "metadata")
  );
}

export function isThemeBuildProviderDiagnostic(value: unknown): value is ThemeBuildProviderDiagnostic {
  return isThemeDiagnostic(value) && isRecord(value) && hasOptionalThemeBuildStage(value, "stage");
}

export function isThemeBuildHmrPayload(value: unknown): value is ThemeBuildHmrPayload {
  if (!isRecord(value) || typeof value.ref !== "string" || typeof value.status !== "string") {
    return false;
  }

  if (value.status === "success") {
    return isThemeBuildProviderResult(value.result);
  }

  if (value.status === "error") {
    return (
      typeof value.message === "string" &&
      Array.isArray(value.diagnostics) &&
      value.diagnostics.every(isThemeBuildProviderDiagnostic)
    );
  }

  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function hasOptionalString(value: Record<string, unknown>, key: string): boolean {
  return !(key in value) || typeof value[key] === "string";
}

function hasOptionalBuildMetadata(value: Record<string, unknown>, key: string): boolean {
  return !(key in value) || isThemeBuildMetadata(value[key]);
}

function isThemeArtifactAssets(value: unknown): value is ThemeArtifactAssets {
  return (
    isRecord(value) &&
    isStringArray(value.css) &&
    isStringArray(value.js) &&
    isStringArray(value.head) &&
    hasOptionalString(value, "shell")
  );
}

function isThemeBuildMetadata(value: unknown): value is ThemeBuildMetadata {
  return (
    isRecord(value) &&
    value.version === 1 &&
    typeof value.source === "string" &&
    typeof value.output === "string" &&
    isStringArray(value.inputFiles) &&
    isStringArray(value.artifactFiles) &&
    Array.isArray(value.templates) &&
    value.templates.every(isThemeTemplateMetadata) &&
    (!("blockPacks" in value) || isThemeBlockPackMetadataArray(value.blockPacks)) &&
    (!("templateSources" in value) || isThemeTemplateSourceMetadataArray(value.templateSources))
  );
}

function isThemeTemplateMetadata(value: unknown): value is ThemeBuildMetadata["templates"][number] {
  return isRecord(value) && typeof value.file === "string" && isStringArray(value.blocks);
}

function isThemeBlockPackMetadataArray(value: unknown): value is ThemeArtifactInspection["blockPacks"] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        isRecord(item) &&
        typeof item.name === "string" &&
        isStringArray(item.profiles) &&
        isStringArray(item.supportedBlocks)
    )
  );
}

function isThemeTemplateSourceMetadataArray(value: unknown): value is ThemeArtifactInspection["templateSources"] {
  return (
    Array.isArray(value) &&
    value.every((item) => isRecord(item) && typeof item.block === "string" && typeof item.source === "string")
  );
}

function hasOptionalThemeBuildStage(value: Record<string, unknown>, key: string): boolean {
  return !(key in value) || (typeof value[key] === "string" && themeBuildStages.includes(value[key] as ThemeBuildStage));
}
