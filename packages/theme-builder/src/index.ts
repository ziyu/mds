import { unwatchFile, watchFile } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build as buildWithEsbuild } from "esbuild";
import type { AcceptedPlugin, Message } from "postcss";
import { tsImport } from "tsx/esm/api";
import { blockPacksByName, standardBlocks } from "@mds-crate/blocks";
import {
  createThemeSourceFromJsxTheme,
  isJsxThemeDefinition,
  JsxThemeBlockRenderError,
} from "@mds-crate/theme-loader/jsx";
import {
  getThemeRuntimeFiles,
  getThemeRuntimeSourceInput,
  getThemeArtifactFileLists,
  isThemeDevelopmentMetadataPath,
  isThemeManifestPath,
  isThemeSourceInput,
  blockTypeFromPath,
  collectTemplateEntries,
  composeThemeSource,
  normalizeThemeResolutionOptions,
  normalizeThemePackagePath,
  readThemeDirectory,
  resolveThemeRef,
  resolveThemeName,
  normalizeThemeArtifactOutputPath,
  normalizeThemeManifestReferences,
  normalizeThemeSourceInput,
  sortThemeArtifactFilePaths,
  THEME_BUILD_METADATA_FILE,
  THEME_MANIFEST_FILE,
  ThemeValidationError,
  uniqueThemeStrings,
  validateThemeSource,
  type ThemeBlockPackMetadata,
  type ThemeBlockPackSource,
  type ThemeBlockReference,
  type ThemeDiagnostic,
  type ThemeManifest,
  type ThemeResolutionOptions,
  type ThemeTemplateSourceMetadata,
  type ThemeSourceInput
} from "@mds-crate/theme-loader";

export {
  initializeThemePackage,
  type ThemeInitOptions,
  type ThemeInitResult,
  type ThemeInitTemplate
} from "./init.js";

type ThemeAssetReference = string | string[];
const buildMetadataPath = THEME_BUILD_METADATA_FILE;

export type ThemeBuildStage =
  | "read-package"
  | "read-config"
  | "load-source"
  | "compose-blocks"
  | "merge-assets"
  | "resolve-artifact"
  | "read-artifact"
  | "validate-artifact"
  | "write-artifact";

export interface PackageThemeConfig {
  source?: string;
  dist?: string;
  blockPacks?: string[];
  blockOverrides?: ThemeBlockReference;
  assets?: PackageThemeAssets;
  pipeline?: PackageThemePipeline;
}

export interface PackageThemePipeline {
  css?: PackageThemeCssPipeline;
}

export interface PackageThemeAssets {
  css?: string | string[];
  js?: string | string[];
  head?: string | string[];
  shell?: string;
  preview?: string;
}

export type PackageThemeCssPipeline = "esbuild" | "tailwind";

export interface PackageThemeBuildResult {
  packageDirectory: string;
  outputDirectory: string;
  sourcePath: string;
  inputFiles: string[];
  filesWritten: string[];
  diagnostics: ThemeDiagnostic[];
  metadataPath?: string;
}

export interface ThemeArtifactPackResult {
  ref: string;
  artifactDirectory: string;
  outputDirectory: string;
  name: string;
  filesWritten: string[];
  diagnostics: ThemeDiagnostic[];
}

export interface ThemeArtifactInspection {
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
  blockPacks: ThemeBlockPackMetadata[];
  templateSources: ThemeTemplateSourceMetadata[];
  diagnostics: ThemeDiagnostic[];
  metadata?: ThemeBuildMetadata;
}

export interface ThemeArtifactAssets {
  css: string[];
  js: string[];
  head: string[];
  shell?: string;
}

interface PackageThemeSourceLoadResult {
  source: ThemeSourceInput;
  inputFiles: string[];
}

interface PackageThemeBlockPackLoadResult {
  blockPacks: ThemeBlockPackSource[];
  inputFiles: string[];
}

interface PackageThemeAssetMergeResult {
  source: ThemeSourceInput;
  inputFiles: string[];
}

interface ThemeBuildMetadataReadResult {
  metadata?: ThemeBuildMetadata;
  diagnostics: ThemeDiagnostic[];
}

export interface ThemeBuildMetadata {
  version: 1;
  source: string;
  output: string;
  inputFiles: string[];
  artifactFiles: string[];
  templates: ThemeTemplateMetadata[];
  blockPacks?: ThemeBlockPackMetadata[];
  templateSources?: ThemeTemplateSourceMetadata[];
}

export interface ThemeTemplateMetadata {
  file: string;
  blocks: string[];
}

export interface WriteThemeSourceOptions {
  clean?: "blocks" | "output" | "none";
}

export interface WatchPackageThemeOptions {
  debounceMs?: number;
  onBuildStart?: () => void;
  onBuild?: (result: PackageThemeBuildResult) => void;
  onError?: (error: unknown) => void;
}

export interface PackageThemeWatchController {
  ready: Promise<PackageThemeBuildResult>;
  closed: Promise<void>;
  close: () => void;
  getLastResult: () => PackageThemeBuildResult | undefined;
}

export interface ThemeBuildErrorContext {
  field?: string;
  filePath?: string;
  block?: string;
}

export interface ThemeBuildDiagnostic {
  severity: "error" | "warning";
  code: string;
  message: string;
  stage?: ThemeBuildStage;
  field?: string;
  path?: string;
  block?: string;
}

export class ThemeBuildError extends Error {
  readonly stage: ThemeBuildStage;
  readonly field: string | undefined;
  readonly filePath: string | undefined;
  readonly block: string | undefined;

  constructor(stage: ThemeBuildStage, cause: unknown, context: ThemeBuildErrorContext = {}) {
    const message = `Theme build failed during ${stage}${formatBuildErrorContext(context)}: ${
      cause instanceof Error ? cause.message : String(cause)
    }`;
    super(message, {
      cause
    });
    this.name = "ThemeBuildError";
    this.stage = stage;
    this.field = context.field;
    this.filePath = context.filePath;
    this.block = context.block;
  }
}

export function themeBuildErrorToDiagnostics(error: unknown): ThemeBuildDiagnostic[] {
  if (error instanceof ThemeBuildError) {
    const diagnostics: ThemeBuildDiagnostic[] = [
      {
        severity: "error",
        code: "theme-build-error",
        message: error.cause instanceof Error ? error.cause.message : error.message,
        stage: error.stage,
        ...(error.field === undefined ? {} : { field: error.field }),
        ...(error.filePath === undefined ? {} : { path: error.filePath }),
        ...(error.block === undefined ? {} : { block: error.block })
      }
    ];

    if (error.cause instanceof ThemeValidationError) {
      diagnostics.push(...error.cause.diagnostics.map((diagnostic) => themeValidationDiagnosticToBuildDiagnostic(error, diagnostic)));
    }

    return diagnostics;
  }

  if (error instanceof ThemeValidationError) {
    return error.diagnostics.map((diagnostic) => ({
      severity: diagnostic.severity,
      code: diagnostic.code,
      message: diagnostic.message,
      ...(diagnostic.field === undefined ? {} : { field: diagnostic.field }),
      ...(diagnostic.path === undefined ? {} : { path: diagnostic.path }),
      ...(diagnostic.block === undefined ? {} : { block: diagnostic.block })
    }));
  }

  return [
    {
      severity: "error",
      code: "theme-build-error",
      message: error instanceof Error ? error.message : String(error)
    }
  ];
}

export function formatThemeBuildDiagnostic(diagnostic: ThemeBuildDiagnostic): string {
  const details = [
    diagnostic.stage === undefined ? undefined : `stage=${diagnostic.stage}`,
    diagnostic.field === undefined ? undefined : `field=${diagnostic.field}`,
    diagnostic.path === undefined ? undefined : `path=${diagnostic.path}`,
    diagnostic.block === undefined ? undefined : `block=${diagnostic.block}`
  ].filter((detail): detail is string => detail !== undefined);
  const suffix = details.length === 0 ? "" : ` (${details.join(", ")})`;

  return `${diagnostic.severity.toUpperCase()} ${diagnostic.code}: ${diagnostic.message}${suffix}`;
}

class ThemeBuildContextError extends Error {
  readonly buildContext: ThemeBuildErrorContext;

  constructor(cause: unknown, context: ThemeBuildErrorContext) {
    super(cause instanceof Error ? cause.message : String(cause), {
      cause
    });
    this.name = "ThemeBuildContextError";
    this.buildContext = context;
  }
}

function themeValidationDiagnosticToBuildDiagnostic(
  error: ThemeBuildError,
  diagnostic: ThemeDiagnostic
): ThemeBuildDiagnostic {
  return {
    severity: diagnostic.severity,
    code: diagnostic.code,
    message: diagnostic.message,
    stage: error.stage,
    ...(diagnostic.field === undefined ? (error.field === undefined ? {} : { field: error.field }) : { field: diagnostic.field }),
    ...(diagnostic.path === undefined ? (error.filePath === undefined ? {} : { path: error.filePath }) : { path: diagnostic.path }),
    ...(diagnostic.block === undefined ? {} : { block: diagnostic.block })
  };
}

export async function buildPackageTheme(packageDirectory: string): Promise<PackageThemeBuildResult> {
  const root = resolve(packageDirectory);
  const packageJsonPath = join(root, "package.json");
  const packageJson = await runBuildStep("read-package", () => readPackageJson(root), {
    filePath: packageJsonPath
  });
  const config = await runBuildStep("read-config", () => readPackageThemeConfig(packageJson), {
    field: "package.json#mdsTheme",
    filePath: packageJsonPath
  });
  const sourcePath = await runBuildStep(
    "read-config",
    () => resolvePackageInputPath(root, config.source ?? "src/theme.tsx", "mdsTheme.source"),
    {
      field: "mdsTheme.source",
      filePath: packageJsonPath
    }
  );
  const outputDirectory = await runBuildStep(
    "read-config",
    () => resolvePackageOutputDirectory(root, config.dist ?? "dist/theme", "mdsTheme.dist"),
    {
      field: "mdsTheme.dist",
      filePath: packageJsonPath
    }
  );
  const sourceLoad = await runBuildStep(
    "load-source",
    () => loadPackageThemeSourceWithInputs(root, sourcePath, config.blockOverrides),
    {
    field: "mdsTheme.source",
    filePath: sourcePath
    }
  );
  const blockPackLoad = await runBuildStep(
    "compose-blocks",
    () => resolvePackageBlockPacks(config.blockPacks ?? []),
    {
      field: "mdsTheme.blockPacks",
      filePath: packageJsonPath
    }
  );
  const source = composeThemeSource(
    sourceLoad.source,
    blockPackLoad.blockPacks.length === 0 ? {} : { blockPacks: blockPackLoad.blockPacks }
  );
  const assetMerge = await runBuildStep("merge-assets", () => mergePackageAssets(root, source, config.assets ?? {}, config.pipeline), {
    field: "package.json#mdsTheme.assets",
    filePath: packageJsonPath
  });
  const mergedSource = assetMerge.source;
  const diagnostics = await runBuildStep("validate-artifact", () => validatePackageThemeSource(mergedSource), {
    field: "generated theme artifact",
    filePath: sourcePath
  });
  const inputFiles = collectPackageInputFiles(
    root,
    [...sourceLoad.inputFiles, ...blockPackLoad.inputFiles],
    assetMerge.inputFiles
  );
  const outputSource = addBuildMetadata(
    mergedSource,
    createBuildMetadata(root, sourcePath, outputDirectory, inputFiles, mergedSource)
  );
  const filesWritten = await runBuildStep(
    "write-artifact",
    () =>
      writeThemeSource(outputDirectory, outputSource, {
        clean: outputDirectory === root ? "blocks" : "output"
      }),
    {
      field: "mdsTheme.dist",
      filePath: outputDirectory
    }
  );

  return {
    packageDirectory: root,
    outputDirectory,
    sourcePath,
    inputFiles,
    filesWritten,
    diagnostics,
    metadataPath: buildMetadataPath
  };
}

export async function inspectThemeArtifact(
  ref: string,
  options: ThemeResolutionOptions = {}
): Promise<ThemeArtifactInspection> {
  const resolutionOptions = normalizeThemeResolutionOptions(options);
  const artifactDirectory = await runBuildStep("resolve-artifact", () => resolveThemeRef(ref, resolutionOptions), {
    field: "theme ref"
  });
  const source = await runBuildStep("read-artifact", () => readThemeDirectory(artifactDirectory), {
    field: "theme artifact",
    filePath: artifactDirectory
  });
  const artifactSource = selectArtifactRuntimeSource(source);
  const metadataResult = readBuildMetadata(source.files[buildMetadataPath]);
  const metadataDiagnostics =
    metadataResult.metadata === undefined
      ? []
      : validateBuildMetadataAgainstArtifact(metadataResult.metadata, artifactSource);
  const validationDiagnostics = ensureThemeNameDiagnostics(
    validatePackageThemeDiagnostics(artifactSource),
    artifactSource.manifest
  );
  const inspectedFiles = {
    ...artifactSource.files,
    ...(source.files[buildMetadataPath] === undefined ? {} : { [buildMetadataPath]: source.files[buildMetadataPath] })
  };
  const fileLists = getThemeArtifactFileLists(inspectedFiles);
  const manifest = normalizeThemeManifestReferences(artifactSource.manifest);

  return {
    ref,
    artifactDirectory,
    name: resolveThemeName(manifest, source.rootName, basename(artifactDirectory)),
    ...(manifest.label === undefined ? {} : { label: manifest.label }),
    ...(manifest.description === undefined ? {} : { description: manifest.description }),
    ...(manifest.author === undefined ? {} : { author: manifest.author }),
    ...(manifest.homepage === undefined ? {} : { homepage: manifest.homepage }),
    ...(isNonEmptyString(manifest.preview) ? { preview: manifest.preview } : {}),
    tags: manifest.tags ?? [],
    supportedBlocks: uniqueThemeStrings(manifest.supportedBlocks) ?? [],
    files: fileLists.files,
    runtimeFiles: fileLists.runtimeFiles,
    developmentFiles: fileLists.developmentFiles,
    assets: collectThemeAssets(manifest),
    blocks: collectThemeBlocks(artifactSource.files),
    actions: uniqueThemeStrings(manifest.actions) ?? [],
    blockPacks: metadataResult.metadata?.blockPacks ?? [],
    templateSources: metadataResult.metadata?.templateSources ?? [],
    diagnostics: [...validationDiagnostics, ...metadataResult.diagnostics, ...metadataDiagnostics],
    ...(metadataResult.metadata === undefined ? {} : { metadata: metadataResult.metadata })
  };
}

export async function packThemeArtifact(
  ref: string,
  outputDirectory: string,
  options: ThemeResolutionOptions = {}
): Promise<ThemeArtifactPackResult> {
  const resolutionOptions = normalizeThemeResolutionOptions(options);
  const artifactDirectory = await runBuildStep("resolve-artifact", () => resolveThemeRef(ref, resolutionOptions), {
    field: "theme ref"
  });
  const resolvedOutputDirectory = resolve(outputDirectory);
  await runBuildStep("write-artifact", () => assertNonOverlappingPackOutput(artifactDirectory, resolvedOutputDirectory), {
    field: "outputDirectory",
    filePath: resolvedOutputDirectory
  });
  const source = await runBuildStep("read-artifact", () => readThemeDirectory(artifactDirectory), {
    field: "theme artifact",
    filePath: artifactDirectory
  });
  const artifactSource = selectArtifactRuntimeSource(source);
  const diagnostics = await runBuildStep("validate-artifact", () => validatePackageThemeSource(artifactSource), {
    field: "theme artifact",
    filePath: artifactDirectory
  });
  const filesWritten = await runBuildStep(
    "write-artifact",
    () =>
      writeThemeSource(
        resolvedOutputDirectory,
        artifactSource,
        {
          clean: "output"
        }
      ),
    {
      field: "outputDirectory",
      filePath: resolvedOutputDirectory
    }
  );

  return {
    ref,
    artifactDirectory,
    outputDirectory: resolvedOutputDirectory,
    name: resolveThemeName(source.manifest, source.rootName, basename(artifactDirectory)),
    filesWritten,
    diagnostics
  };
}

function selectArtifactRuntimeSource(source: ThemeSourceInput): ThemeSourceInput {
  const normalized = normalizeThemeSourceInput(source);
  return {
    ...normalized,
    files: selectArtifactThemeSourceFiles(normalized.files, normalized.manifest)
  };
}

function assertNonOverlappingPackOutput(artifactDirectory: string, outputDirectory: string): void {
  if (pathsOverlap(artifactDirectory, outputDirectory)) {
    throw new Error(
      `Pack output directory must not overlap the source artifact directory: ${relativeOutputPath(
        process.cwd(),
        outputDirectory
      )}.`
    );
  }
}

function pathsOverlap(left: string, right: string): boolean {
  return isPathInside(left, right) || isPathInside(right, left);
}

export function watchPackageTheme(
  packageDirectory: string,
  options: WatchPackageThemeOptions = {}
): PackageThemeWatchController {
  const root = resolve(packageDirectory);
  const debounceMs = options.debounceMs ?? 100;
  let closed = false;
  let timer: NodeJS.Timeout | undefined;
  let lastResult: PackageThemeBuildResult | undefined;
  let watchedInputFiles = new Set<string>();
  const closeDeferred = createDeferred<void>();

  async function rebuild(): Promise<PackageThemeBuildResult> {
    if (closed) {
      throw new Error("Theme watch is closed.");
    }

    options.onBuildStart?.();
    const result = await buildPackageTheme(root);
    lastResult = result;
    options.onBuild?.(result);
    await refreshWatchers(result);
    return result;
  }

  function schedule(): void {
    if (closed) {
      return;
    }

    if (timer !== undefined) {
      clearTimeout(timer);
    }

    timer = setTimeout(() => {
      timer = undefined;
      void rebuild().catch((error: unknown) => {
        options.onError?.(error);
      });
    }, debounceMs);
  }

  async function refreshWatchers(result: PackageThemeBuildResult): Promise<void> {
    const nextInputFiles = new Set(result.inputFiles);

    for (const path of watchedInputFiles) {
      if (!nextInputFiles.has(path)) {
        unwatchFile(path);
      }
    }

    for (const path of nextInputFiles) {
      if (!watchedInputFiles.has(path)) {
        watchFile(path, { interval: Math.max(debounceMs, 100) }, (current, previous) => {
          if (current.mtimeMs !== previous.mtimeMs || current.size !== previous.size) {
            schedule();
          }
        });
      }
    }

    watchedInputFiles = nextInputFiles;
  }

  const ready = rebuild();

  return {
    ready,
    closed: closeDeferred.promise,
    close() {
      if (closed) {
        return;
      }
      closed = true;
      if (timer !== undefined) {
        clearTimeout(timer);
      }
      for (const path of watchedInputFiles) {
        unwatchFile(path);
      }
      watchedInputFiles = new Set();
      closeDeferred.resolve();
    },
    getLastResult() {
      return lastResult;
    }
  };
}

function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
} {
  let resolveValue: (value: T) => void = () => {};
  let rejectValue: (error: unknown) => void = () => {};
  const promise = new Promise<T>((resolve, reject) => {
    resolveValue = resolve;
    rejectValue = reject;
  });

  return {
    promise,
    resolve: resolveValue,
    reject: rejectValue
  };
}

export async function loadPackageThemeSource(sourcePath: string): Promise<ThemeSourceInput> {
  return (await loadPackageThemeSourceWithInputs(dirname(sourcePath), sourcePath)).source;
}

async function loadPackageThemeSourceWithInputs(
  packageDirectory: string,
  sourcePath: string,
  blockOverrides?: ThemeBlockReference
): Promise<PackageThemeSourceLoadResult> {
  if (basename(sourcePath) === THEME_MANIFEST_FILE) {
    return loadArtifactThemeSource(sourcePath, blockOverrides);
  }

  const inputFiles = new Set([sourcePath]);
  const tsconfigPath = await findNearestTsconfig(sourcePath, packageDirectory);
  if (tsconfigPath !== undefined) {
    inputFiles.add(tsconfigPath);
  }
  const module = await importThemeSourceModule(sourcePath, tsconfigPath, (url) => {
    const path = fileUrlToPathIfLocal(url);
    if (path !== undefined && isPathInside(path, packageDirectory)) {
      inputFiles.add(path);
    }
  });
  const themeDefinition = isRecord(module) ? module.default : undefined;
  if (isThemeSourceInput(themeDefinition)) {
    return {
      source: themeDefinition,
      inputFiles: [...inputFiles].sort()
    };
  }

  if (!isJsxThemeDefinition(themeDefinition)) {
    throw new Error(`Theme source must export a default ThemeSourceInput or JSX theme definition: ${sourcePath}`);
  }

  return {
    source: createThemeSourceFromJsxTheme(themeDefinition),
    inputFiles: [...inputFiles].sort()
  };
}

async function loadArtifactThemeSource(
  sourcePath: string,
  blockOverrides: ThemeBlockReference | undefined
): Promise<PackageThemeSourceLoadResult> {
  const root = dirname(sourcePath);
  const loaded = normalizeThemeSourceInput(await readThemeDirectory(root));
  const manifest = normalizeThemeManifestReferences({
    ...loaded.manifest,
    ...(blockOverrides === undefined ? {} : { blocks: blockOverrides })
  });
  const files = selectArtifactThemeSourceFiles(loaded.files, manifest);

  return {
    source: {
      manifest,
      files,
      ...(loaded.rootName === undefined ? {} : { rootName: loaded.rootName })
    },
    inputFiles: [sourcePath, ...Object.keys(files).map((path) => join(root, path))].sort()
  };
}

function selectArtifactThemeSourceFiles(
  files: Record<string, string>,
  manifest: ThemeManifest
): Record<string, string> {
  const selected = new Set<string>([
    ...assetReferencesToPaths(manifest.css),
    ...assetReferencesToPaths(manifest.js),
    ...assetReferencesToPaths(manifest.head),
    ...(isNonEmptyString(manifest.shell) ? [manifest.shell] : []),
    ...(isNonEmptyString(manifest.preview) ? [manifest.preview] : []),
    ...collectBlockSourceFilePaths(files, manifest.blocks)
  ]);

  return Object.fromEntries(Object.entries(files).filter(([path]) => selected.has(path)));
}

function collectBlockSourceFilePaths(
  files: Record<string, string>,
  blocks: ThemeBlockReference | undefined
): string[] {
  if (blocks === undefined) {
    return collectBlockReferenceFilePaths(files, "blocks");
  }

  if (typeof blocks === "string") {
    return collectBlockReferenceFilePaths(files, blocks);
  }

  if (Array.isArray(blocks)) {
    return [...new Set(blocks.flatMap((reference) => collectBlockReferenceFilePaths(files, reference)))];
  }

  return [...new Set(Object.values(blocks).flatMap((reference) => collectBlockReferenceFilePaths(files, reference)))];
}

function collectBlockReferenceFilePaths(files: Record<string, string>, reference: string): string[] {
  if (reference.endsWith(".html")) {
    return reference in files ? [reference] : [];
  }

  const prefix = reference.endsWith("/") ? reference : `${reference}/`;
  return Object.keys(files).filter((path) => path.startsWith(prefix) && path.endsWith(".html"));
}

function resolvePackageBlockPacks(refs: string[]): PackageThemeBlockPackLoadResult {
  if (refs.length === 0) {
    return {
      blockPacks: [],
      inputFiles: []
    };
  }

  const blockPacks = refs.flatMap((ref) => {
    if (ref === "@mds-crate/blocks/standard") {
      return [...standardBlocks];
    }

    const blockPack = blockPacksByName[ref];
    if (blockPack === undefined) {
      throw new Error(
        `Unknown MDS block pack: ${ref}. Available packs: ${[
          ...Object.keys(blockPacksByName),
          "@mds-crate/blocks/standard"
        ].join(", ")}.`
      );
    }

    return [blockPack];
  });
  const modulePath = resolveImportMetaPath("@mds-crate/blocks");

  return {
    blockPacks,
    inputFiles: modulePath === undefined ? [] : [modulePath]
  };
}

function resolveImportMetaPath(specifier: string): string | undefined {
  const resolveImport = (import.meta as ImportMeta & { resolve?: (value: string) => string }).resolve;
  if (typeof resolveImport !== "function") {
    return undefined;
  }

  try {
    return fileUrlToPathIfLocal(resolveImport(specifier));
  } catch {
    return undefined;
  }
}

async function importThemeSourceModule(
  sourcePath: string,
  tsconfigPath: string | undefined,
  onImport?: (url: string) => void
): Promise<unknown> {
  const sourceUrl = pathToFileURL(sourcePath).href;
  return isTypeScriptSource(sourcePath)
    ? tsImport(sourceUrl, {
        parentURL: import.meta.url,
        ...(tsconfigPath === undefined ? {} : { tsconfig: tsconfigPath }),
        ...(onImport === undefined ? {} : { onImport })
      })
    : import(sourceUrl);
}

async function findNearestTsconfig(sourcePath: string, packageDirectory: string): Promise<string | undefined> {
  let current = dirname(sourcePath);
  const root = resolve(packageDirectory);

  while (isPathInside(current, root)) {
    const candidate = join(current, "tsconfig.json");
    try {
      await readFile(candidate, "utf8");
      return candidate;
    } catch (error) {
      if (!isNodeError(error) || error.code !== "ENOENT") {
        throw error;
      }
    }

    const parent = dirname(current);
    if (parent === current) {
      return undefined;
    }
    current = parent;
  }

  return undefined;
}

function validatePackageThemeSource(source: ThemeSourceInput): ThemeDiagnostic[] {
  const diagnostics = validatePackageThemeDiagnostics(source);
  const errors = diagnostics.filter((diagnostic) => diagnostic.severity === "error");

  if (errors.length > 0) {
    throw new ThemeValidationError(errors, resolveThemeName(source.manifest, source.rootName));
  }

  return diagnostics;
}

function validatePackageThemeDiagnostics(source: ThemeSourceInput): ThemeDiagnostic[] {
  return [...validateThemeSource(source), ...validateThemeSupportedBlockCoverage(source)];
}

function validateThemeSupportedBlockCoverage(source: ThemeSourceInput): ThemeDiagnostic[] {
  if (source.manifest.supportedBlocks === undefined) {
    return [];
  }

  const supportedBlocks = new Set(uniqueThemeStrings(source.manifest.supportedBlocks) ?? []);
  const templateBlocks = new Set(collectThemeBlocks(source.files));
  const diagnostics: ThemeDiagnostic[] = [];

  for (const block of supportedBlocks) {
    if (!templateBlocks.has(block)) {
      diagnostics.push({
        severity: "warning",
        code: "missing-supported-block-template",
        message: `Theme declares support for block "${block}" but does not provide a template.`,
        field: "supportedBlocks",
        block
      });
    }
  }

  for (const block of templateBlocks) {
    if (!supportedBlocks.has(block)) {
      diagnostics.push({
        severity: "warning",
        code: "undeclared-theme-block-template",
        message: `Theme provides a template for block "${block}" but does not declare it in supportedBlocks.`,
        field: "supportedBlocks",
        block
      });
    }
  }

  return diagnostics;
}

function addBuildMetadata(source: ThemeSourceInput, metadata: ThemeBuildMetadata): ThemeSourceInput {
  return {
    ...source,
    files: {
      ...source.files,
      [buildMetadataPath]: `${JSON.stringify(metadata, null, 2)}\n`
    }
  };
}

function readBuildMetadata(contents: string | undefined): ThemeBuildMetadataReadResult {
  if (contents === undefined) {
    return {
      diagnostics: []
    };
  }

  try {
    const metadata = JSON.parse(contents) as unknown;
    if (!isRecord(metadata)) {
      return {
        diagnostics: [invalidBuildMetadataDiagnostic("Theme build metadata must be a JSON object.")]
      };
    }

    if (metadata.version !== 1) {
      return {
        diagnostics: [
          {
            severity: "warning",
            code: "unsupported-theme-build-metadata",
            message: `Theme build metadata version is not supported: ${String(metadata.version)}.`,
            path: buildMetadataPath
          }
        ]
      };
    }

    const validationMessage = validateBuildMetadata(metadata);
    if (validationMessage !== undefined) {
      return {
        diagnostics: [invalidBuildMetadataDiagnostic(validationMessage)]
      };
    }

    return {
      metadata: metadata as unknown as ThemeBuildMetadata,
      diagnostics: []
    };
  } catch (error) {
    return {
      diagnostics: [
        invalidBuildMetadataDiagnostic(
          `Theme build metadata cannot be parsed: ${error instanceof Error ? error.message : String(error)}.`
        )
      ]
    };
  }
}

function validateBuildMetadata(metadata: Record<string, unknown>): string | undefined {
  if (typeof metadata.source !== "string") {
    return "Theme build metadata source must be a string.";
  }

  const sourceMessage = validateBuildMetadataPackagePath(metadata.source, "source");
  if (sourceMessage !== undefined) {
    return sourceMessage;
  }

  if (typeof metadata.output !== "string") {
    return "Theme build metadata output must be a string.";
  }

  const outputMessage = validateBuildMetadataPackagePath(metadata.output, "output", {
    allowCurrentDirectory: true
  });
  if (outputMessage !== undefined) {
    return outputMessage;
  }

  if (!isStringArray(metadata.inputFiles)) {
    return "Theme build metadata inputFiles must be a string array.";
  }

  for (const path of metadata.inputFiles) {
    const message = validateBuildMetadataPackagePath(path, "inputFiles");
    if (message !== undefined) {
      return message;
    }
  }
  const duplicateInputFile = firstDuplicateString(metadata.inputFiles);
  if (duplicateInputFile !== undefined) {
    return `Theme build metadata inputFiles must not contain duplicate paths: ${duplicateInputFile}.`;
  }
  if (!stringArraysEqual(metadata.inputFiles, sortedStrings(metadata.inputFiles))) {
    return "Theme build metadata inputFiles must be sorted.";
  }

  if (!isStringArray(metadata.artifactFiles)) {
    return "Theme build metadata artifactFiles must be a string array.";
  }

  for (const path of metadata.artifactFiles) {
    const message = validateBuildMetadataArtifactPath(path, "artifactFiles");
    if (message !== undefined) {
      return message;
    }
  }
  const duplicateArtifactFile = firstDuplicateString(metadata.artifactFiles);
  if (duplicateArtifactFile !== undefined) {
    return `Theme build metadata artifactFiles must not contain duplicate paths: ${duplicateArtifactFile}.`;
  }
  if (!stringArraysEqual(metadata.artifactFiles, sortThemeArtifactFilePaths(metadata.artifactFiles))) {
    return `Theme build metadata artifactFiles must be sorted with ${THEME_MANIFEST_FILE} first.`;
  }

  if (!Array.isArray(metadata.templates) || !metadata.templates.every(isTemplateMetadataRecord)) {
    return "Theme build metadata templates must be an array of template metadata.";
  }

  const templateFiles = metadata.templates.map((template) => template.file);
  const duplicateTemplateFile = firstDuplicateString(templateFiles);
  if (duplicateTemplateFile !== undefined) {
    return `Theme build metadata templates.file must not contain duplicate paths: ${duplicateTemplateFile}.`;
  }
  if (!stringArraysEqual(templateFiles, sortedStrings(templateFiles))) {
    return "Theme build metadata templates must be sorted by file.";
  }

  for (const template of metadata.templates) {
    const message = validateBuildMetadataArtifactPath(template.file, "templates.file");
    if (message !== undefined) {
      return message;
    }

    const duplicateTemplateBlock = firstDuplicateString(template.blocks);
    if (duplicateTemplateBlock !== undefined) {
      return `Theme build metadata templates.blocks must not contain duplicate blocks: ${duplicateTemplateBlock}.`;
    }

    if (!stringArraysEqual(template.blocks, sortedStrings(template.blocks))) {
      return `Theme build metadata templates.blocks must be sorted for ${template.file}.`;
    }
  }

  if (metadata.blockPacks !== undefined) {
    if (!Array.isArray(metadata.blockPacks) || !metadata.blockPacks.every(isBlockPackMetadataRecord)) {
      return "Theme build metadata blockPacks must be an array of block pack metadata.";
    }

    const duplicateBlockPack = firstDuplicateString(metadata.blockPacks.map((pack) => pack.name));
    if (duplicateBlockPack !== undefined) {
      return `Theme build metadata blockPacks must not contain duplicate packs: ${duplicateBlockPack}.`;
    }
  }

  if (metadata.templateSources !== undefined) {
    if (!Array.isArray(metadata.templateSources) || !metadata.templateSources.every(isTemplateSourceMetadataRecord)) {
      return "Theme build metadata templateSources must be an array of template source metadata.";
    }

    const sourceBlocks = metadata.templateSources.map((entry) => entry.block);
    const duplicateSourceBlock = firstDuplicateString(sourceBlocks);
    if (duplicateSourceBlock !== undefined) {
      return `Theme build metadata templateSources must not contain duplicate blocks: ${duplicateSourceBlock}.`;
    }
    if (!stringArraysEqual(sourceBlocks, sortedStrings(sourceBlocks))) {
      return "Theme build metadata templateSources must be sorted by block.";
    }
  }

  return undefined;
}

function validateBuildMetadataPackagePath(
  path: string,
  field: string,
  options: { allowCurrentDirectory?: boolean } = {}
): string | undefined {
  const result = normalizeThemePackagePath(path);

  if (result.error?.code === "empty") {
    return `Theme build metadata ${field} cannot be empty.`;
  }

  if (result.error?.code === "unsafe") {
    return `Theme build metadata ${field} must be a relative POSIX path inside the package: ${path}.`;
  }

  if (result.error?.code === "escape") {
    return `Theme build metadata ${field} cannot escape the package directory: ${path}.`;
  }

  if (result.normalizedPath === ".") {
    if (options.allowCurrentDirectory !== true) {
      return `Theme build metadata ${field} must point to a file inside the package: ${path}.`;
    }

    return path === "." ? undefined : `Theme build metadata ${field} must use a canonical package path: ${path} -> .`;
  }

  if (result.normalizedPath !== undefined && result.normalizedPath !== path) {
    return `Theme build metadata ${field} must use a canonical package path: ${path} -> ${result.normalizedPath}.`;
  }

  return undefined;
}

function validateBuildMetadataArtifactPath(path: string, field: string): string | undefined {
  const result = normalizeThemeArtifactOutputPath(path);

  if (result.error?.code === "empty") {
    return `Theme build metadata ${field} path cannot be empty.`;
  }

  if (result.error?.code === "unsafe") {
    return `Theme build metadata ${field} path must be a relative POSIX artifact path: ${path}.`;
  }

  if (result.error?.code === "escape") {
    return `Theme build metadata ${field} path cannot escape the artifact directory: ${path}.`;
  }

  if (result.normalizedPath !== undefined && result.normalizedPath !== path) {
    return `Theme build metadata ${field} path must be canonical: ${path} -> ${result.normalizedPath}.`;
  }

  if (isThemeDevelopmentMetadataPath(result.normalizedPath ?? path)) {
    return `Theme build metadata ${field} path must not reference development metadata: ${path}.`;
  }

  return undefined;
}

function isTemplateMetadataRecord(value: unknown): value is ThemeTemplateMetadata {
  return isRecord(value) && typeof value.file === "string" && isStringArray(value.blocks);
}

function isBlockPackMetadataRecord(value: unknown): value is ThemeBlockPackMetadata {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    value.name.length > 0 &&
    isStringArray(value.profiles) &&
    isStringArray(value.supportedBlocks)
  );
}

function isTemplateSourceMetadataRecord(value: unknown): value is ThemeTemplateSourceMetadata {
  return (
    isRecord(value) &&
    typeof value.block === "string" &&
    value.block.length > 0 &&
    typeof value.source === "string" &&
    value.source.length > 0
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function firstDuplicateString(values: string[]): string | undefined {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      return value;
    }
    seen.add(value);
  }

  return undefined;
}

function sortedStrings(values: string[]): string[] {
  return [...values].sort();
}

function invalidBuildMetadataDiagnostic(message: string): ThemeDiagnostic {
  return {
    severity: "warning",
    code: "invalid-theme-build-metadata",
    message,
    path: buildMetadataPath
  };
}

function validateBuildMetadataAgainstArtifact(
  metadata: ThemeBuildMetadata,
  source: ThemeSourceInput
): ThemeDiagnostic[] {
  const diagnostics: ThemeDiagnostic[] = [];
  const artifactFiles = getThemeArtifactFileLists(source.files).runtimeFiles;

  if (!stringArraysEqual(metadata.artifactFiles, artifactFiles)) {
    diagnostics.push(
      staleBuildMetadataDiagnostic("Theme build metadata artifactFiles do not match the current artifact files.")
    );
  }

  if (!templateMetadataArraysEqual(metadata.templates, collectTemplateMetadata(source.files))) {
    diagnostics.push(
      staleBuildMetadataDiagnostic("Theme build metadata templates do not match the current block templates.")
    );
  }

  if (
    metadata.templateSources !== undefined &&
    !stringArraysEqual(
      metadata.templateSources.map((entry) => entry.block),
      collectThemeBlocks(source.files)
    )
  ) {
    diagnostics.push(
      staleBuildMetadataDiagnostic("Theme build metadata templateSources do not match the current block templates.")
    );
  }

  return diagnostics;
}

function staleBuildMetadataDiagnostic(message: string): ThemeDiagnostic {
  return {
    severity: "warning",
    code: "stale-theme-build-metadata",
    message,
    path: buildMetadataPath
  };
}

function stringArraysEqual(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function templateMetadataArraysEqual(left: ThemeTemplateMetadata[], right: ThemeTemplateMetadata[]): boolean {
  return (
    left.length === right.length &&
    left.every((template, index) => {
      const candidate = right[index];
      return candidate !== undefined && template.file === candidate.file && stringArraysEqual(template.blocks, candidate.blocks);
    })
  );
}

function createBuildMetadata(
  packageDirectory: string,
  sourcePath: string,
  outputDirectory: string,
  inputFiles: string[],
  source: ThemeSourceInput
): ThemeBuildMetadata {
  return {
    version: 1,
    source: relativeOutputPath(packageDirectory, sourcePath),
    output: relativeOutputPath(packageDirectory, outputDirectory),
    inputFiles: inputFiles
      .filter((path) => isPathInside(path, packageDirectory))
      .map((path) => relativeOutputPath(packageDirectory, path))
      .sort(),
    artifactFiles: getThemeArtifactFileLists(source.files).runtimeFiles,
    templates: collectTemplateMetadata(source.files),
    ...(source.composition === undefined
      ? {}
      : {
          blockPacks: source.composition.blockPacks,
          templateSources: source.composition.templateSources
        })
  };
}

function collectTemplateMetadata(files: Record<string, string>): ThemeTemplateMetadata[] {
  return Object.entries(files)
    .filter(([path]) => path.startsWith("blocks/") && path.endsWith(".html"))
    .map(([path, contents]) => ({
      file: path,
      blocks: collectTemplateBlocks(path, contents)
    }))
    .sort((left, right) => left.file.localeCompare(right.file));
}

function collectThemeBlocks(files: Record<string, string>): string[] {
  return [...new Set(collectTemplateMetadata(files).flatMap((template) => template.blocks))].sort();
}

function collectThemeAssets(manifest: ThemeManifest): ThemeArtifactAssets {
  return {
    css: assetReferencesToPaths(manifest.css),
    js: assetReferencesToPaths(manifest.js),
    head: assetReferencesToPaths(manifest.head),
    ...(isNonEmptyString(manifest.shell) ? { shell: manifest.shell } : {})
  };
}

function collectTemplateBlocks(path: string, contents: string): string[] {
  return [...new Set(collectTemplateEntries(contents, blockTypeFromPath(path)).map((entry) => entry.blockType))].sort();
}

function collectPackageInputFiles(
  root: string,
  sourceInputFiles: string[],
  assetInputFiles: string[]
): string[] {
  return [...new Set([join(root, "package.json"), ...sourceInputFiles, ...assetInputFiles])].sort();
}

function assetReferencesToPaths(reference: string | string[] | undefined): string[] {
  if (reference === undefined) {
    return [];
  }

  return (Array.isArray(reference) ? reference : [reference]).filter(isNonEmptyString);
}

function isNonEmptyString(value: string | undefined): value is string {
  return value !== undefined && value.length > 0;
}

function fileUrlToPathIfLocal(url: string): string | undefined {
  if (!url.startsWith("file:")) {
    return undefined;
  }

  try {
    return fileURLToPath(url);
  } catch {
    return undefined;
  }
}

function isPathInside(path: string, directory: string): boolean {
  const relativePath = relative(directory, path);
  return relativePath.length === 0 || (!relativePath.startsWith("..") && !isAbsolute(relativePath));
}

export async function writeThemeSource(
  outputDirectory: string,
  source: ThemeSourceInput,
  options: WriteThemeSourceOptions = {}
): Promise<string[]> {
  assertWritableThemeSource(source);
  const normalizedManifest = normalizeThemeSourceInput({
    ...source,
    files: {}
  }).manifest;
  const files = new Map<string, string>([
    [THEME_MANIFEST_FILE, `${JSON.stringify(withThemeManifestVersion(normalizedManifest), null, 2)}\n`]
  ]);
  const clean = options.clean ?? "blocks";

  for (const [path, contents] of Object.entries(source.files)) {
    const normalized = normalizeArtifactRelativePath(path);
    if (isThemeManifestPath(normalized)) {
      throw new Error(`Theme artifact files must not include reserved file: ${THEME_MANIFEST_FILE}.`);
    }

    if (files.has(normalized)) {
      throw new Error(`Theme artifact file is defined more than once: ${normalized}.`);
    }

    files.set(normalized, ensureTrailingNewline(contents));
  }

  if (clean === "output") {
    await rm(outputDirectory, { recursive: true, force: true });
  } else if (clean === "blocks") {
    await rm(join(outputDirectory, "blocks"), { recursive: true, force: true });
  }

  const written: string[] = [];
  for (const [path, contents] of files) {
    const targetPath = join(outputDirectory, path);
    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(targetPath, contents, "utf8");
    written.push(path);
  }

  return sortThemeArtifactFilePaths(written);
}

function withThemeManifestVersion(manifest: ThemeManifest): ThemeManifest {
  return {
    version: 1,
    ...manifest
  };
}

function assertWritableThemeSource(source: ThemeSourceInput): void {
  const diagnostics = validateThemeSource(source);
  const errors = diagnostics.filter((diagnostic) => diagnostic.severity === "error");

  if (errors.length > 0) {
    throw new ThemeValidationError(errors, resolveThemeName(source.manifest, source.rootName));
  }
}

function normalizeArtifactRelativePath(path: string): string {
  const result = normalizeThemeArtifactOutputPath(path);

  if (result.error?.code === "empty") {
    throw new Error("Theme artifact file path cannot be empty.");
  }

  if (result.error?.code === "unsafe") {
    throw new Error(`Theme artifact file path must be a relative POSIX path: ${path}.`);
  }

  if (result.error?.code === "escape") {
    throw new Error(`Theme artifact file path cannot escape the output directory: ${path}.`);
  }

  return result.normalizedPath ?? path;
}

async function mergePackageAssets(
  root: string,
  source: ThemeSourceInput,
  assets: PackageThemeAssets,
  pipeline: PackageThemePipeline = {}
): Promise<PackageThemeAssetMergeResult> {
  const manifest: ThemeManifest = {
    ...source.manifest
  };
  const files = {
    ...source.files
  };
  const usedOutputPaths = new Set([THEME_MANIFEST_FILE, ...Object.keys(files)]);
  const inputFiles = new Set<string>();

  const css = await copyStyleAssetReferences(root, assets.css, usedOutputPaths, inputFiles, pipeline.css ?? "esbuild");
  if (css !== undefined) {
    manifest.css = css.reference;
    Object.assign(files, css.files);
  }

  const js = await copyScriptAssetReferences(root, assets.js, usedOutputPaths, inputFiles);
  if (js !== undefined) {
    manifest.js = js.reference;
    Object.assign(files, js.files);
  }

  const head = await copyAssetReferences(root, assets.head, "mdsTheme.assets.head", usedOutputPaths, inputFiles);
  if (head !== undefined) {
    manifest.head = head.reference;
    Object.assign(files, head.files);
  }

  if (assets.shell !== undefined) {
    const shellPath = resolvePackageInputPath(root, assets.shell, "mdsTheme.assets.shell");
    inputFiles.add(shellPath);
    const outputPath = allocateAssetOutputPath(assets.shell, usedOutputPaths);
    manifest.shell = outputPath;
    files[outputPath] = await readPackageAssetFile(shellPath, "mdsTheme.assets.shell");
  }

  if (assets.preview !== undefined) {
    const previewPath = resolvePackageInputPath(root, assets.preview, "mdsTheme.assets.preview");
    inputFiles.add(previewPath);
    const outputPath = allocateAssetOutputPath(assets.preview, usedOutputPaths);
    manifest.preview = outputPath;
    files[outputPath] = await readPackageAssetFile(previewPath, "mdsTheme.assets.preview");
  }

  return {
    source: {
      ...source,
      manifest,
      files
    },
    inputFiles: [...inputFiles].sort()
  };
}

async function copyAssetReferences(
  root: string,
  references: string | string[] | undefined,
  field: string,
  usedOutputPaths: Set<string>,
  inputFiles: Set<string>
): Promise<{ reference: ThemeAssetReference; files: Record<string, string> } | undefined> {
  if (references === undefined) {
    return undefined;
  }

  const inputPaths = Array.isArray(references) ? references : [references];
  const files: Record<string, string> = {};
  const outputPaths = await Promise.all(
    inputPaths.map(async (inputPath) => {
      const sourcePath = resolvePackageInputPath(root, inputPath, field);
      inputFiles.add(sourcePath);
      const outputPath = allocateAssetOutputPath(inputPath, usedOutputPaths);
      files[outputPath] = await readPackageAssetFile(sourcePath, field);
      return outputPath;
    })
  );

  return {
    reference: Array.isArray(references) ? outputPaths : outputPaths[0] ?? "",
    files
  };
}

async function copyStyleAssetReferences(
  root: string,
  references: string | string[] | undefined,
  usedOutputPaths: Set<string>,
  inputFiles: Set<string>,
  pipeline: PackageThemeCssPipeline
): Promise<{ reference: ThemeAssetReference; files: Record<string, string> } | undefined> {
  if (references === undefined) {
    return undefined;
  }

  const inputPaths = Array.isArray(references) ? references : [references];
  const files: Record<string, string> = {};
  const outputPaths = await Promise.all(
    inputPaths.map(async (inputPath) => {
      const sourcePath = resolvePackageInputPath(root, inputPath, "mdsTheme.assets.css");
      const outputPath = allocateAssetOutputPath(inputPath, usedOutputPaths);
      inputFiles.add(sourcePath);

      if (isCssSource(inputPath)) {
        const bundled = await withBuildContext({ field: "mdsTheme.assets.css", filePath: sourcePath }, () =>
          pipeline === "tailwind" ? bundleTailwindStyleAsset(root, sourcePath) : bundleStyleAsset(root, sourcePath)
        );
        files[outputPath] = bundled.code;
        for (const path of bundled.inputFiles) {
          inputFiles.add(path);
        }
      } else {
        files[outputPath] = await readPackageAssetFile(sourcePath, "mdsTheme.assets.css");
      }

      return outputPath;
    })
  );

  return {
    reference: Array.isArray(references) ? outputPaths : outputPaths[0] ?? "",
    files
  };
}

async function copyScriptAssetReferences(
  root: string,
  references: string | string[] | undefined,
  usedOutputPaths: Set<string>,
  inputFiles: Set<string>
): Promise<{ reference: ThemeAssetReference; files: Record<string, string> } | undefined> {
  if (references === undefined) {
    return undefined;
  }

  const inputPaths = Array.isArray(references) ? references : [references];
  const files: Record<string, string> = {};
  const outputPaths = await Promise.all(
    inputPaths.map(async (inputPath) => {
      const sourcePath = resolvePackageInputPath(root, inputPath, "mdsTheme.assets.js");
      const outputPath = allocateAssetOutputPath(scriptAssetOutputPath(inputPath), usedOutputPaths);
      inputFiles.add(sourcePath);

      if (isTypeScriptSource(inputPath)) {
        const bundled = await withBuildContext({ field: "mdsTheme.assets.js", filePath: sourcePath }, () =>
          bundleScriptAsset(root, sourcePath)
        );
        files[outputPath] = bundled.code;
        for (const path of bundled.inputFiles) {
          inputFiles.add(path);
        }
      } else {
        files[outputPath] = await readPackageAssetFile(sourcePath, "mdsTheme.assets.js");
      }

      return outputPath;
    })
  );

  return {
    reference: Array.isArray(references) ? outputPaths : outputPaths[0] ?? "",
    files
  };
}

async function readPackageAssetFile(filePath: string, field: string): Promise<string> {
  return withBuildContext({ field, filePath }, () => readFile(filePath, "utf8"));
}

async function bundleScriptAsset(root: string, sourcePath: string): Promise<{ code: string; inputFiles: string[] }> {
  const result = await buildWithEsbuild({
    entryPoints: [sourcePath],
    absWorkingDir: root,
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
    target: "es2020",
    sourcemap: false,
    metafile: true,
    logLevel: "silent"
  });
  const output = result.outputFiles[0];
  if (output === undefined) {
    throw new Error(`Script bundling produced no output: ${sourcePath}`);
  }

  return {
    code: output.text,
    inputFiles: Object.keys(result.metafile.inputs)
      .map((path) => (isAbsolute(path) ? path : resolve(root, path)))
      .filter((path) => isPathInside(path, root))
      .sort()
  };
}

async function bundleStyleAsset(root: string, sourcePath: string): Promise<{ code: string; inputFiles: string[] }> {
  const result = await buildWithEsbuild({
    entryPoints: [sourcePath],
    absWorkingDir: root,
    bundle: true,
    write: false,
    loader: {
      ".css": "css"
    },
    sourcemap: false,
    metafile: true,
    logLevel: "silent"
  });
  const output = result.outputFiles.find((file) => file.path.endsWith(".css")) ?? result.outputFiles[0];
  if (output === undefined) {
    throw new Error(`Style bundling produced no output: ${sourcePath}`);
  }

  return {
    code: output.text,
    inputFiles: Object.keys(result.metafile.inputs)
      .map((path) => (isAbsolute(path) ? path : resolve(root, path)))
      .filter((path) => isPathInside(path, root))
      .sort()
  };
}

async function bundleTailwindStyleAsset(root: string, sourcePath: string): Promise<{ code: string; inputFiles: string[] }> {
  const css = await readFile(sourcePath, "utf8");
  const [{ default: postcss }, tailwindModule] = await Promise.all([import("postcss"), import("@tailwindcss/postcss")]);
  const tailwindPlugin =
    (typeof tailwindModule.default === "function" ? tailwindModule.default : tailwindModule) as () => AcceptedPlugin;
  const result = await postcss([tailwindPlugin()]).process(css, {
    from: sourcePath,
    map: false
  });

  return {
    code: result.css,
    inputFiles: collectPostcssInputFiles(root, sourcePath, result.messages)
  };
}

function collectPostcssInputFiles(
  root: string,
  sourcePath: string,
  messages: Message[]
): string[] {
  return [
    ...new Set([
      sourcePath,
      ...messages
        .filter((message) => message.type === "dependency" && typeof message.file === "string")
        .map((message) => resolve(root, message.file as string))
        .filter((path) => isPathInside(path, root))
    ])
  ].sort();
}

function allocateAssetOutputPath(inputPath: string, usedOutputPaths: Set<string>): string {
  const candidate = assetOutputPath(inputPath);
  if (!usedOutputPaths.has(candidate)) {
    usedOutputPaths.add(candidate);
    return candidate;
  }

  const directory = dirname(candidate).split(sep).join("/");
  const name = basename(candidate);
  for (let index = 2; ; index += 1) {
    const nextName = `${index}-${name}`;
    const nextPath = directory === "." ? nextName : `${directory}/${nextName}`;
    if (!usedOutputPaths.has(nextPath)) {
      usedOutputPaths.add(nextPath);
      return nextPath;
    }
  }
}

function assetOutputPath(inputPath: string): string {
  const normalized = normalizePackageRelativePath(inputPath, "mdsTheme.assets");
  return normalized.startsWith("src/") ? normalized.slice("src/".length) : normalized;
}

function scriptAssetOutputPath(inputPath: string): string {
  const outputPath = assetOutputPath(inputPath);
  return isTypeScriptSource(inputPath) ? outputPath.replace(/\.[cm]?tsx?$/, ".js") : outputPath;
}

function isCssSource(path: string): boolean {
  return /\.css$/i.test(path);
}

function isTypeScriptSource(path: string): boolean {
  return /\.(?:[cm]?ts|tsx)$/.test(path);
}

async function readPackageJson(root: string): Promise<Record<string, unknown>> {
  let raw: string;
  try {
    raw = await readFile(join(root, "package.json"), "utf8");
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      throw new Error("Theme package must include package.json.");
    }

    throw error;
  }

  let packageJson: unknown;
  try {
    packageJson = JSON.parse(raw) as unknown;
  } catch (error) {
    throw new Error(`Theme package.json cannot be parsed: ${error instanceof Error ? error.message : String(error)}.`);
  }

  if (!isRecord(packageJson)) {
    throw new Error("Theme package.json must be a JSON object.");
  }

  return packageJson;
}

function readPackageThemeConfig(packageJson: Record<string, unknown>): PackageThemeConfig {
  const value = packageJson.mdsTheme;
  if (!isRecord(value)) {
    throw new Error("Theme package must define package.json#mdsTheme.");
  }

  const source = readOptionalStringConfig(value.source, "mdsTheme.source");
  const dist = readOptionalStringConfig(value.dist, "mdsTheme.dist");
  const blockPacks = readOptionalStringArrayConfig(value.blockPacks, "mdsTheme.blockPacks");
  const blockOverrides = readOptionalBlockReferenceConfig(value.blockOverrides, "mdsTheme.blockOverrides");
  const assets = readOptionalAssetsConfig(value.assets);
  const pipeline = readOptionalPipelineConfig(value.pipeline);

  return {
    ...(source === undefined ? {} : { source }),
    ...(dist === undefined ? {} : { dist }),
    ...(blockPacks === undefined ? {} : { blockPacks }),
    ...(blockOverrides === undefined ? {} : { blockOverrides }),
    ...(assets === undefined ? {} : { assets }),
    ...(pipeline === undefined ? {} : { pipeline })
  };
}

function readOptionalStringArrayConfig(value: unknown, field: string): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value) || !value.every((item) => typeof item === "string" && item.length > 0)) {
    invalidPackageConfig(field, `${field} must be an array of non-empty strings.`);
  }

  const duplicate = firstDuplicateString(value);
  if (duplicate !== undefined) {
    invalidPackageConfig(field, `${field} must not contain duplicate entries: ${duplicate}.`);
  }

  return value;
}

function readOptionalBlockReferenceConfig(value: unknown, field: string): ThemeBlockReference | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    return value;
  }

  if (isRecord(value) && Object.values(value).every((item) => typeof item === "string")) {
    return value as Record<string, string>;
  }

  invalidPackageConfig(field, `${field} must be a string, string array, or block-to-file map.`);
}

function readOptionalPipelineConfig(value: unknown): PackageThemePipeline | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isRecord(value)) {
    invalidPackageConfig("mdsTheme.pipeline", "mdsTheme.pipeline must be an object.");
  }

  const css = readOptionalCssPipelineConfig(value.css, "mdsTheme.pipeline.css");

  return {
    ...(css === undefined ? {} : { css })
  };
}

function readOptionalCssPipelineConfig(value: unknown, field: string): PackageThemeCssPipeline | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === "esbuild" || value === "tailwind") {
    return value;
  }

  invalidPackageConfig(field, `${field} must be "esbuild" or "tailwind".`);
}

function readOptionalAssetsConfig(value: unknown): PackageThemeAssets | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!isRecord(value)) {
    invalidPackageConfig("mdsTheme.assets", "mdsTheme.assets must be an object.");
  }

  const css = readOptionalAssetReferenceConfig(value.css, "mdsTheme.assets.css");
  const js = readOptionalAssetReferenceConfig(value.js, "mdsTheme.assets.js");
  const head = readOptionalAssetReferenceConfig(value.head, "mdsTheme.assets.head");
  const shell = readOptionalStringConfig(value.shell, "mdsTheme.assets.shell");
  const preview = readOptionalStringConfig(value.preview, "mdsTheme.assets.preview");

  return {
    ...(css === undefined ? {} : { css }),
    ...(js === undefined ? {} : { js }),
    ...(head === undefined ? {} : { head }),
    ...(shell === undefined ? {} : { shell }),
    ...(preview === undefined ? {} : { preview })
  };
}

function readOptionalAssetReferenceConfig(value: unknown, field: string): string | string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
    return value;
  }

  invalidPackageConfig(field, `${field} must be a string or string array.`);
}

function readOptionalStringConfig(value: unknown, field: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value === "string") {
    return value;
  }

  invalidPackageConfig(field, `${field} must be a string.`);
}

function invalidPackageConfig(field: string, message: string): never {
  throw new ThemeBuildContextError(new Error(message), {
    field
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

function ensureTrailingNewline(value: string): string {
  return value.endsWith("\n") ? value : `${value}\n`;
}

function ensureThemeNameDiagnostics(diagnostics: ThemeDiagnostic[], manifest: Pick<ThemeManifest, "name">): ThemeDiagnostic[] {
  if (manifest.name === undefined || manifest.name.trim().length > 0) {
    return diagnostics;
  }

  if (diagnostics.some((diagnostic) => diagnostic.code === "empty-theme-name" && diagnostic.field === "name")) {
    return diagnostics;
  }

  return [
    ...diagnostics,
    {
      severity: "warning",
      code: "empty-theme-name",
      message: "Theme manifest name is empty; loaders will use the theme directory name instead.",
      field: "name"
    }
  ];
}

export function relativeOutputPath(fromDirectory: string, outputDirectory: string): string {
  const path = relative(fromDirectory, outputDirectory).split(sep).join("/");
  return path.length === 0 ? "." : path;
}

async function runBuildStep<T>(
  stage: ThemeBuildStage,
  action: () => Promise<T> | T,
  context: ThemeBuildErrorContext = {}
): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof ThemeBuildError) {
      throw error;
    }

    throw new ThemeBuildError(stage, themeBuildCause(error), mergeBuildErrorContext(context, themeBuildContext(error)));
  }
}

async function withBuildContext<T>(context: ThemeBuildErrorContext, action: () => Promise<T> | T): Promise<T> {
  try {
    return await action();
  } catch (error) {
    throw new ThemeBuildContextError(error, context);
  }
}

function themeBuildCause(error: unknown): unknown {
  return error instanceof ThemeBuildContextError && error.cause !== undefined ? error.cause : error;
}

function themeBuildContext(error: unknown): ThemeBuildErrorContext {
  if (error instanceof ThemeBuildContextError) {
    return error.buildContext;
  }

  if (error instanceof JsxThemeBlockRenderError) {
    return {
      block: error.block
    };
  }

  return {};
}

function mergeBuildErrorContext(
  fallback: ThemeBuildErrorContext,
  preferred: ThemeBuildErrorContext
): ThemeBuildErrorContext {
  const field = preferred.field ?? fallback.field;
  const filePath = preferred.filePath ?? fallback.filePath;
  const block = preferred.block ?? fallback.block;

  return {
    ...(field === undefined ? {} : { field }),
    ...(filePath === undefined ? {} : { filePath }),
    ...(block === undefined ? {} : { block })
  };
}

function formatBuildErrorContext(context: ThemeBuildErrorContext): string {
  const details = [
    context.field === undefined ? undefined : `field ${context.field}`,
    context.filePath === undefined ? undefined : `file ${context.filePath}`
  ].filter((detail): detail is string => detail !== undefined);

  return details.length === 0 ? "" : ` (${details.join(", ")})`;
}

function resolvePackageInputPath(root: string, inputPath: string, field: string): string {
  const normalized = normalizePackageRelativePath(inputPath, field, { allowCurrentDirectory: false });
  return resolve(root, normalized);
}

function resolvePackageOutputDirectory(root: string, outputPath: string, field: string): string {
  const normalized = normalizePackageRelativePath(outputPath, field, { allowCurrentDirectory: true });
  return resolve(root, normalized);
}

function normalizePackageRelativePath(
  path: string,
  field: string,
  options: { allowCurrentDirectory?: boolean } = {}
): string {
  const result = normalizeThemePackagePath(path);

  if (result.error?.code === "empty") {
    invalidPackagePath(field, `${field} cannot be empty.`);
  }

  if (result.error?.code === "unsafe") {
    invalidPackagePath(field, `${field} must be a relative POSIX path: ${path}.`);
  }

  if (result.error?.code === "escape") {
    invalidPackagePath(field, `${field} cannot escape the theme package directory: ${path}.`);
  }

  const normalizedPath = result.normalizedPath ?? path;
  if (normalizedPath === "." && options.allowCurrentDirectory !== true) {
    invalidPackagePath(field, `${field} must point to a file inside the theme package: ${path}.`);
  }

  return normalizedPath;
}

function invalidPackagePath(field: string, message: string): never {
  throw new ThemeBuildContextError(new Error(message), {
    field
  });
}
