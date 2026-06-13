import type { ThemeAssetReference, ThemeBlockReference, ThemeManifest, ThemeSourceInput } from "./source-theme.js";
import { blockTypeFromPath, collectTemplateEntries } from "./block-template.js";
import {
  THEME_MANIFEST_FILE,
  isThemeManifestPath,
  normalizeThemeArtifactPath,
  normalizeThemeFiles,
  normalizeThemeManifestReferences
} from "./artifact.js";
import { hasOptionalString, isRecord } from "./shape.js";
import { resolveThemeName } from "./theme-metadata.js";

export type ThemeDiagnosticSeverity = "error" | "warning";

export interface ThemeDiagnostic {
  severity: ThemeDiagnosticSeverity;
  code: string;
  message: string;
  field?: string;
  path?: string;
  block?: string;
}

export class ThemeValidationError extends Error {
  readonly diagnostics: ThemeDiagnostic[];

  constructor(diagnostics: ThemeDiagnostic[], themeName = "theme") {
    super(formatThemeValidationMessage(diagnostics, themeName));
    this.name = "ThemeValidationError";
    this.diagnostics = diagnostics;
  }
}

export function isThemeDiagnostic(value: unknown): value is ThemeDiagnostic {
  return (
    isRecord(value) &&
    "severity" in value &&
    (value.severity === "error" || value.severity === "warning") &&
    "code" in value &&
    typeof value.code === "string" &&
    "message" in value &&
    typeof value.message === "string" &&
    hasOptionalString(value, "field") &&
    hasOptionalString(value, "path") &&
    hasOptionalString(value, "block")
  );
}

const manifestFields = new Set([
  "version",
  "name",
  "label",
  "description",
  "author",
  "homepage",
  "preview",
  "tags",
  "supportedBlocks",
  "css",
  "js",
  "head",
  "shell",
  "blocks",
  "actions"
]);
const blockNamePattern = /^[A-Za-z][A-Za-z0-9_-]*$/;
const actionNamePattern = /^[A-Za-z][A-Za-z0-9_.:-]*$/;

export function validateThemeManifest(manifest: unknown): ThemeDiagnostic[] {
  const diagnostics: ThemeDiagnostic[] = [];

  if (!isRecord(manifest)) {
    diagnostics.push(
      createDiagnostic("error", "invalid-theme-manifest", "Theme manifest must be a JSON object.")
    );
    return diagnostics;
  }

  for (const field of Object.keys(manifest)) {
    if (!manifestFields.has(field)) {
      diagnostics.push(
        createDiagnostic("warning", "unknown-theme-manifest-field", `Unknown theme manifest field: ${field}.`, {
          field
        })
      );
    }
  }

  validateThemeName(manifest, diagnostics);
  validateThemeVersion(manifest, diagnostics);
  validateOptionalString(manifest, "label", diagnostics);
  validateOptionalString(manifest, "description", diagnostics);
  validateOptionalString(manifest, "author", diagnostics);
  validateOptionalString(manifest, "homepage", diagnostics);
  validateOptionalString(manifest, "preview", diagnostics);
  validateStringArray(manifest, "tags", diagnostics);
  validateSupportedBlocks(manifest.supportedBlocks, diagnostics);
  validateAssetReference(manifest, "css", diagnostics);
  validateAssetReference(manifest, "js", diagnostics);
  validateAssetReference(manifest, "head", diagnostics);
  validateOptionalString(manifest, "shell", diagnostics);
  validateBlocksReference(manifest.blocks, diagnostics);
  validateActions(manifest.actions, diagnostics);

  return diagnostics;
}

function validateThemeVersion(manifest: Record<string, unknown>, diagnostics: ThemeDiagnostic[]): void {
  const value = manifest.version;
  if (value === undefined) {
    return;
  }

  if (typeof value !== "number" || !Number.isInteger(value)) {
    diagnostics.push(
      createDiagnostic("error", "invalid-theme-version", "Theme manifest version must be an integer.", {
        field: "version"
      })
    );
    return;
  }

  if (value !== 1) {
    diagnostics.push(
      createDiagnostic("error", "unsupported-theme-version", `Theme manifest version is not supported: ${String(value)}.`, {
        field: "version"
      })
    );
  }
}

export function validateThemeSource(input: ThemeSourceInput): ThemeDiagnostic[] {
  const diagnostics = validateThemeManifest(input.manifest);
  validateThemeFiles(input.files, diagnostics);
  const normalizedFiles = normalizeThemeFiles(input.files);
  const normalizedManifest = normalizeThemeManifestReferences(getNormalizableManifestReferences(input.manifest));

  for (const [field, reference] of [
    ["css", normalizedManifest.css],
    ["js", normalizedManifest.js],
    ["head", normalizedManifest.head]
  ] as const) {
    validateReferencedFiles(normalizedFiles, field, assetReferenceToPaths(reference), diagnostics);
  }

  validateReferencedFiles(normalizedFiles, "shell", stringReferenceToPaths(normalizedManifest.shell), diagnostics);
  validateReferencedFiles(normalizedFiles, "preview", stringReferenceToPaths(normalizedManifest.preview), diagnostics);
  validateBlockSources(normalizedFiles, normalizedManifest.blocks, diagnostics);

  return diagnostics;
}

function getNormalizableManifestReferences(manifest: ThemeManifest): ThemeManifest {
  if (!isRecord(manifest)) {
    return {};
  }

  const normalizableManifest: ThemeManifest = {};
  copyAssetReference(manifest, normalizableManifest, "css");
  copyAssetReference(manifest, normalizableManifest, "js");
  copyAssetReference(manifest, normalizableManifest, "head");
  copyStringReference(manifest, normalizableManifest, "shell");
  copyStringReference(manifest, normalizableManifest, "preview");

  if (isThemeBlockReferenceValue(manifest.blocks)) {
    normalizableManifest.blocks = manifest.blocks;
  }

  return normalizableManifest;
}

function copyAssetReference(
  manifest: Record<string, unknown>,
  target: ThemeManifest,
  field: keyof Pick<ThemeManifest, "css" | "js" | "head">
): void {
  const value = manifest[field];
  if (!isThemeAssetReferenceValue(value)) {
    return;
  }

  if (field === "css") {
    target.css = value;
  } else if (field === "js") {
    target.js = value;
  } else {
    target.head = value;
  }
}

function copyStringReference(
  manifest: Record<string, unknown>,
  target: ThemeManifest,
  field: keyof Pick<ThemeManifest, "shell" | "preview">
): void {
  const value = manifest[field];
  if (typeof value === "string") {
    target[field] = value;
  }
}

function isThemeAssetReferenceValue(value: unknown): value is ThemeAssetReference {
  return typeof value === "string" || (Array.isArray(value) && value.every((item) => typeof item === "string"));
}

function isThemeBlockReferenceValue(value: unknown): value is ThemeBlockReference {
  return (
    typeof value === "string" ||
    (Array.isArray(value) && value.every((item) => typeof item === "string")) ||
    (isRecord(value) && Object.values(value).every((item) => typeof item === "string"))
  );
}

function validateThemeFiles(files: Record<string, string>, diagnostics: ThemeDiagnostic[]): void {
  const seenNormalizedPaths = new Map<string, string>();

  for (const [path, contents] of Object.entries(files)) {
    const normalizedPath = getValidatedThemePath(path, "files", diagnostics);
    if (normalizedPath === undefined) {
      continue;
    }

    if (isThemeManifestPath(path)) {
      diagnostics.push(
        createDiagnostic("error", "reserved-theme-file", `Theme source files must not include ${THEME_MANIFEST_FILE}.`, {
          field: "files",
          path
        })
      );
    }

    const previousPath = seenNormalizedPaths.get(normalizedPath);
    if (previousPath !== undefined && previousPath !== path) {
      diagnostics.push(
        createDiagnostic("error", "duplicate-theme-file", `Theme source file resolves to an existing path: ${normalizedPath}.`, {
          field: "files",
          path
        })
      );
    }
    seenNormalizedPaths.set(normalizedPath, path);

    if (typeof contents !== "string") {
      diagnostics.push(
        createDiagnostic("error", "invalid-theme-file-content", `Theme source file must contain text: ${path}.`, {
          field: "files",
          path
        })
      );
    }
  }
}

export function assertValidThemeSource(input: ThemeSourceInput): void {
  const diagnostics = validateThemeSource(input);
  const errors = diagnostics.filter((diagnostic) => diagnostic.severity === "error");

  if (errors.length > 0) {
    throw new ThemeValidationError(errors, resolveThemeName(input.manifest, input.rootName));
  }
}

export function formatThemeDiagnostic(diagnostic: ThemeDiagnostic): string {
  const details = [
    diagnostic.field === undefined ? undefined : `field=${diagnostic.field}`,
    diagnostic.path === undefined ? undefined : `path=${diagnostic.path}`,
    diagnostic.block === undefined ? undefined : `block=${diagnostic.block}`
  ].filter((detail): detail is string => detail !== undefined);
  const suffix = details.length === 0 ? "" : ` (${details.join(", ")})`;

  return `${diagnostic.severity.toUpperCase()} ${diagnostic.code}: ${diagnostic.message}${suffix}`;
}

function validateThemeName(manifest: Record<string, unknown>, diagnostics: ThemeDiagnostic[]): void {
  const value = manifest.name;
  if (value === undefined) {
    return;
  }

  if (typeof value !== "string") {
    diagnostics.push(
      createDiagnostic("error", "invalid-theme-field", "Theme manifest field \"name\" must be a string.", {
        field: "name"
      })
    );
    return;
  }

  if (value.trim().length === 0) {
    diagnostics.push(
      createDiagnostic("warning", "empty-theme-name", "Theme manifest name is empty; loaders will use the theme directory name instead.", {
        field: "name"
      })
    );
  }
}

function validateOptionalString(
  manifest: Record<string, unknown>,
  field: keyof Pick<ThemeManifest, "name" | "label" | "description" | "author" | "homepage" | "preview" | "shell">,
  diagnostics: ThemeDiagnostic[]
): void {
  const value = manifest[field];
  if (value !== undefined && typeof value !== "string") {
    diagnostics.push(
      createDiagnostic("error", "invalid-theme-field", `Theme manifest field "${field}" must be a string.`, {
        field
      })
    );
  }
}

function validateStringArray(
  manifest: Record<string, unknown>,
  field: keyof Pick<ThemeManifest, "tags">,
  diagnostics: ThemeDiagnostic[]
): void {
  const value = manifest[field];
  if (value === undefined) {
    return;
  }

  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    return;
  }

  diagnostics.push(
    createDiagnostic("error", "invalid-theme-field", `Theme manifest field "${field}" must be a string array.`, {
      field
    })
  );
}

function validateSupportedBlocks(value: unknown, diagnostics: ThemeDiagnostic[]): void {
  if (value === undefined) {
    return;
  }

  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    diagnostics.push(
      createDiagnostic(
        "error",
        "invalid-theme-supported-blocks",
        "Theme manifest supportedBlocks must be a string array.",
        { field: "supportedBlocks" }
      )
    );
    return;
  }

  warnDuplicateStrings(value, "duplicate-theme-supported-block", "Theme supported block is declared more than once.", {
    field: "supportedBlocks",
    diagnostics,
    metadata: (block) => ({ block })
  });

  for (const block of value) {
    if (!blockNamePattern.test(block)) {
      diagnostics.push(
        createDiagnostic("warning", "invalid-theme-block-name", `Theme supported block name is unusual: ${block}.`, {
          field: "supportedBlocks",
          block
        })
      );
    }
  }
}

function validateAssetReference(
  manifest: Record<string, unknown>,
  field: keyof Pick<ThemeManifest, "css" | "js" | "head">,
  diagnostics: ThemeDiagnostic[]
): void {
  const value = manifest[field];
  if (value === undefined) {
    return;
  }

  if (typeof value === "string") {
    return;
  }

  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    return;
  }

  diagnostics.push(
    createDiagnostic(
      "error",
      "invalid-theme-asset-reference",
      `Theme manifest field "${field}" must be a string or string array.`,
      { field }
    )
  );
}

function validateBlocksReference(value: unknown, diagnostics: ThemeDiagnostic[]): void {
  if (value === undefined || typeof value === "string") {
    return;
  }

  if (Array.isArray(value)) {
    if (value.every((item) => typeof item === "string")) {
      return;
    }

    diagnostics.push(
      createDiagnostic("error", "invalid-theme-blocks-reference", "Theme manifest blocks array must contain strings.", {
        field: "blocks"
      })
    );
    return;
  }

  if (isRecord(value) && Object.values(value).every((item) => typeof item === "string")) {
    return;
  }

  diagnostics.push(
    createDiagnostic(
      "error",
      "invalid-theme-blocks-reference",
      "Theme manifest field \"blocks\" must be a string, string array, or object map.",
      { field: "blocks" }
    )
  );
}

function validateActions(value: unknown, diagnostics: ThemeDiagnostic[]): void {
  if (value === undefined) {
    return;
  }

  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    diagnostics.push(
      createDiagnostic("error", "invalid-theme-actions", "Theme manifest actions must be a string array.", {
        field: "actions"
      })
    );
    return;
  }

  warnDuplicateStrings(value, "duplicate-theme-action", "Theme action is declared more than once.", {
    field: "actions",
    diagnostics
  });

  for (const action of value) {
    if (!actionNamePattern.test(action)) {
      diagnostics.push(
        createDiagnostic("warning", "invalid-theme-action-name", `Theme action name is unusual: ${action}.`, {
          field: "actions"
        })
      );
    }
  }
}

function validateReferencedFiles(
  files: Record<string, string>,
  field: string,
  paths: string[],
  diagnostics: ThemeDiagnostic[]
): void {
  const seen = new Set<string>();

  for (const path of paths) {
    const normalizedPath = getValidatedThemePath(path, field, diagnostics);
    if (normalizedPath === undefined) {
      continue;
    }

    if (seen.has(normalizedPath)) {
      diagnostics.push(
        createDiagnostic("warning", "duplicate-theme-asset-reference", `Theme ${field} file is referenced more than once: ${normalizedPath}.`, {
          field,
          path: normalizedPath
        })
      );
      continue;
    }
    seen.add(normalizedPath);

    if (isThemeManifestPath(normalizedPath)) {
      diagnostics.push(createReservedThemeFileReferenceDiagnostic(field, normalizedPath));
      continue;
    }

    if (!hasThemeFile(files, normalizedPath)) {
      diagnostics.push(
        createDiagnostic("error", "missing-theme-file", `Theme ${field} file is missing: ${normalizedPath}.`, {
          field,
          path: normalizedPath
        })
      );
    }
  }
}

function validateBlockSources(
  files: Record<string, string>,
  blocks: ThemeBlockReference | undefined,
  diagnostics: ThemeDiagnostic[]
): void {
  const sources = normalizeBlockSources(blocks, files, diagnostics);
  const registrations = sources.flatMap((source) => collectBlockRegistrations(files, source, diagnostics));
  const seen = new Map<string, string>();

  for (const registration of registrations) {
    if (!blockNamePattern.test(registration.block)) {
      diagnostics.push(
        createDiagnostic("warning", "invalid-theme-block-name", `Theme block name is unusual: ${registration.block}.`, {
          block: registration.block,
          path: registration.path
        })
      );
      continue;
    }

    const previousPath = seen.get(registration.block);
    if (previousPath !== undefined) {
      diagnostics.push(
        createDiagnostic(
          "warning",
          "duplicate-theme-block-template",
          `Theme block "${registration.block}" is defined more than once. Later sources override earlier templates.`,
          {
            block: registration.block,
            path: registration.path
          }
        )
      );
    }

    seen.set(registration.block, registration.path);
  }
}

function normalizeBlockSources(
  blocks: ThemeBlockReference | undefined,
  files: Record<string, string>,
  diagnostics: ThemeDiagnostic[]
): BlockSource[] {
  if (blocks === undefined) {
    if (hasBlockDirectory(files, "blocks")) {
      return [{ kind: "directory", path: "blocks" }];
    }

    diagnostics.push(
      createDiagnostic("warning", "missing-theme-block-source", "Theme does not define block templates.", {
        field: "blocks"
      })
    );
    return [];
  }

  if (typeof blocks === "string") {
    return [normalizeBlockSource(blocks, diagnostics)];
  }

  if (Array.isArray(blocks)) {
    return blocks.map((source) => normalizeBlockSource(source, diagnostics));
  }

  return Object.entries(blocks).flatMap(([block, path]) => {
    if (!blockNamePattern.test(block)) {
      diagnostics.push(
        createDiagnostic("warning", "invalid-theme-block-name", `Theme block name is unusual: ${block}.`, {
          block,
          path
        })
      );
    }

    return [{ kind: "mapped-file", path, block } satisfies BlockSource];
  });
}

function normalizeBlockSource(path: string, diagnostics: ThemeDiagnostic[]): BlockSource {
  const normalizedPath = getValidatedThemePath(path, "blocks", diagnostics) ?? path;
  return normalizedPath.endsWith(".html") ? { kind: "file", path: normalizedPath } : { kind: "directory", path: normalizedPath };
}

function collectBlockRegistrations(
  files: Record<string, string>,
  source: BlockSource,
  diagnostics: ThemeDiagnostic[]
): BlockRegistration[] {
  const normalizedPath = getValidatedThemePath(source.path, "blocks", diagnostics);
  if (normalizedPath === undefined) {
    return [];
  }

  if (isThemeManifestPath(normalizedPath)) {
    diagnostics.push(createReservedThemeFileReferenceDiagnostic("blocks", normalizedPath));
    return [];
  }

  if (source.kind === "file") {
    if (!hasThemeFile(files, normalizedPath)) {
      diagnostics.push(
        createDiagnostic("error", "missing-theme-block-source", `Theme block source file is missing: ${normalizedPath}.`, {
          field: "blocks",
          path: normalizedPath
        })
      );
      return [];
    }

    const template = readTemplateFile(files, normalizedPath);
    return template === undefined
      ? []
      : collectTemplateRegistrationsFromFile(normalizedPath, template, blockTypeFromPath(normalizedPath));
  }

  if (source.kind === "mapped-file") {
    if (!hasThemeFile(files, normalizedPath)) {
      diagnostics.push(
        createDiagnostic("error", "missing-theme-block-source", `Theme block source file is missing: ${normalizedPath}.`, {
          block: source.block,
          field: "blocks",
          path: normalizedPath
        })
      );
      return [];
    }

    const template = readTemplateFile(files, normalizedPath);
    return template === undefined ? [] : collectTemplateRegistrationsFromFile(normalizedPath, template, source.block);
  }

  const prefix = normalizedPath.endsWith("/") ? normalizedPath : `${normalizedPath}/`;
  const directoryFiles = Object.entries(files).filter(([path]) => path.startsWith(prefix) && path.endsWith(".html"));

  if (directoryFiles.length === 0) {
    diagnostics.push(
      createDiagnostic("warning", "missing-theme-block-source", `Theme block directory has no HTML templates: ${normalizedPath}.`, {
        field: "blocks",
        path: normalizedPath
      })
    );
  }

  return directoryFiles.flatMap(([path, template]) =>
    typeof template === "string" ? collectTemplateRegistrationsFromFile(path, template, blockTypeFromPath(path)) : []
  );
}

function readTemplateFile(files: Record<string, string>, path: string): string | undefined {
  const template = files[path];
  return typeof template === "string" ? template : undefined;
}

function collectTemplateRegistrationsFromFile(
  path: string,
  template: string,
  fallbackBlock: string
): BlockRegistration[] {
  return collectTemplateEntries(template, fallbackBlock).map((entry) => ({
    path,
    block: entry.blockType
  }));
}

function validateThemePath(path: string, field: string, diagnostics: ThemeDiagnostic[]): boolean {
  return getValidatedThemePath(path, field, diagnostics) !== undefined;
}

function getValidatedThemePath(path: string, field: string, diagnostics: ThemeDiagnostic[]): string | undefined {
  const result = normalizeThemeArtifactPath(path);
  if (result.error?.code === "empty") {
    diagnostics.push(
      createDiagnostic("error", "invalid-theme-path", `Theme ${field} path cannot be empty.`, {
        field
      })
    );
    return undefined;
  }

  if (
    result.error?.code === "absolute" ||
    result.error?.code === "non-posix" ||
    result.error?.code === "null-byte"
  ) {
    diagnostics.push(
      createDiagnostic("error", "invalid-theme-path", `Theme ${field} path must be a relative POSIX path: ${path}.`, {
        field,
        path
      })
    );
    return undefined;
  }

  if (result.error?.code === "escape") {
    diagnostics.push(
      createDiagnostic("error", "invalid-theme-path", `Theme ${field} path cannot escape the theme directory: ${path}.`, {
        field,
        path
      })
    );
    return undefined;
  }

  return result.normalizedPath ?? path;
}

function warnDuplicateStrings(
  values: string[],
  code: string,
  message: string,
  options: {
    field: string;
    diagnostics: ThemeDiagnostic[];
    metadata?: (value: string) => Omit<ThemeDiagnostic, "severity" | "code" | "message" | "field">;
  }
): void {
  const seen = new Set<string>();

  for (const value of values) {
    if (!seen.has(value)) {
      seen.add(value);
      continue;
    }

    options.diagnostics.push(
      createDiagnostic("warning", code, `${message}: ${value}.`, {
        field: options.field,
        ...options.metadata?.(value)
      })
    );
  }
}

function assetReferenceToPaths(reference: string | string[] | undefined): string[] {
  if (reference === undefined || reference.length === 0) {
    return [];
  }

  return Array.isArray(reference) ? reference : [reference];
}

function stringReferenceToPaths(reference: string | undefined): string[] {
  return reference === undefined || reference.length === 0 ? [] : [reference];
}

function hasThemeFile(files: Record<string, string>, path: string): boolean {
  return Object.prototype.hasOwnProperty.call(files, path);
}

function hasBlockDirectory(files: Record<string, string>, directory: string): boolean {
  const prefix = directory.endsWith("/") ? directory : `${directory}/`;
  return Object.keys(files).some((path) => path.startsWith(prefix) && path.endsWith(".html"));
}

function createDiagnostic(
  severity: ThemeDiagnosticSeverity,
  code: string,
  message: string,
  metadata: Omit<ThemeDiagnostic, "severity" | "code" | "message"> = {}
): ThemeDiagnostic {
  return {
    severity,
    code,
    message,
    ...metadata
  };
}

function createReservedThemeFileReferenceDiagnostic(field: string, path: string): ThemeDiagnostic {
  return createDiagnostic(
    "error",
    "reserved-theme-file-reference",
    `Theme ${field} must not reference reserved manifest file: ${THEME_MANIFEST_FILE}.`,
    {
      field,
      path
    }
  );
}

function formatThemeValidationMessage(diagnostics: ThemeDiagnostic[], themeName: string): string {
  const summary = diagnostics.map(formatThemeDiagnostic).join("; ");
  return `Invalid ${themeName} theme: ${summary}`;
}

interface BlockRegistration {
  path: string;
  block: string;
}

type BlockSource =
  | {
      kind: "file";
      path: string;
    }
  | {
      kind: "directory";
      path: string;
    }
  | {
      kind: "mapped-file";
      path: string;
      block: string;
    };
