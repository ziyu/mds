import type { HtmlBlockRenderers, HtmlTheme } from "@mds-crate/html-types";
import { getThemeRuntimeSourceInput, normalizeThemeManifestReferences, normalizeThemeSourceInput } from "./artifact.js";
import { blockTypeFromPath, collectTemplateEntries } from "./block-template.js";
import { isRecord, isStringRecord } from "./shape.js";
import { createTemplateBlockRenderer, renderShellTemplate } from "./template.js";
import { resolveThemeName, uniqueThemeStrings } from "./theme-metadata.js";
import { ThemeValidationError, validateThemeSource, type ThemeDiagnostic } from "./validation.js";

export { resolveThemeLabel, resolveThemeName, uniqueThemeStrings } from "./theme-metadata.js";

export interface ThemeManifest {
  version?: 1;
  name?: string;
  label?: string;
  description?: string;
  author?: string;
  homepage?: string;
  preview?: string;
  tags?: string[];
  supportedBlocks?: string[];
  css?: ThemeAssetReference;
  js?: ThemeAssetReference;
  head?: ThemeAssetReference;
  shell?: string;
  blocks?: ThemeBlockReference;
  actions?: string[];
}

export interface ThemeSourceInput {
  manifest: ThemeManifest;
  files: Record<string, string>;
  rootName?: string;
  composition?: ThemeSourceComposition;
}

export interface ThemeSource {
  manifest: ThemeManifest;
  files: Record<string, string>;
  rootName?: string;
  composition?: ThemeSourceComposition;
}

export interface ThemeBlockPackSource {
  name: string;
  profiles?: string[];
  supportedBlocks?: string[];
  actions?: string[];
  files: Record<string, string>;
  blocks?: ThemeBlockReference;
}

export interface ThemeBlockPackMetadata {
  name: string;
  profiles: string[];
  supportedBlocks: string[];
}

export interface ThemeTemplateSourceMetadata {
  block: string;
  source: string;
}

export interface ThemeSourceComposition {
  blockPacks: ThemeBlockPackMetadata[];
  templateSources: ThemeTemplateSourceMetadata[];
}

export interface ComposeThemeSourceOptions {
  blockPacks?: readonly ThemeBlockPackSource[];
}

export type ThemeAssetReference = string | string[];
export type ThemeBlockReference = string | string[] | Record<string, string>;

export interface ThemeCreationResult {
  theme: HtmlTheme;
  diagnostics: ThemeDiagnostic[];
}

export function createThemeFromSources(input: ThemeSourceInput): HtmlTheme {
  return createThemeResultFromSources(input).theme;
}

export function isThemeSourceInput(value: unknown): value is ThemeSourceInput {
  return (
    isRecord(value) &&
    isRecord(value.manifest) &&
    isStringRecord(value.files) &&
    (!("rootName" in value) || typeof value.rootName === "string") &&
    (!("composition" in value) || isThemeSourceComposition(value.composition))
  );
}

export function composeThemeSource(input: ThemeSourceInput, options: ComposeThemeSourceOptions = {}): ThemeSourceInput {
  const blockPacks = options.blockPacks ?? [];
  if (blockPacks.length === 0) {
    return input;
  }

  const normalizedInput = normalizeThemeSourceInput(input);
  const templates: Record<string, string> = {};
  const templateSources = new Map<string, string>();
  const supportedBlocks: string[] = [];
  const actions: string[] = [];

  for (const pack of blockPacks) {
    const normalizedPack = normalizeThemeSourceInput({
      manifest: {
        ...(pack.blocks === undefined ? {} : { blocks: pack.blocks })
      },
      files: pack.files,
      rootName: pack.name
    });
    for (const [blockType, template] of Object.entries(
      collectBlockTemplates(normalizedPack.files, normalizedPack.manifest.blocks)
    )) {
      templates[blockType] = template;
      templateSources.set(blockType, pack.name);
    }
    supportedBlocks.push(...(pack.supportedBlocks ?? []));
    actions.push(...(pack.actions ?? []));
  }

  const previousTemplateSources = new Map(
    normalizedInput.composition?.templateSources.map((entry) => [entry.block, entry.source]) ?? []
  );
  for (const [blockType, template] of Object.entries(
    collectBlockTemplates(normalizedInput.files, normalizedInput.manifest.blocks)
  )) {
    templates[blockType] = template;
    templateSources.set(blockType, previousTemplateSources.get(blockType) ?? "theme");
  }
  supportedBlocks.push(...(normalizedInput.manifest.supportedBlocks ?? []));
  actions.push(...(normalizedInput.manifest.actions ?? []));

  const files = removeComposedBlockFiles(normalizedInput.files);
  Object.assign(files, writeComposedBlockTemplates(templates));

  return {
    ...normalizedInput,
    manifest: {
      ...normalizedInput.manifest,
      blocks: "blocks",
      ...(supportedBlocks.length === 0 ? {} : { supportedBlocks: uniqueStrings(supportedBlocks) }),
      ...(actions.length === 0 ? {} : { actions: uniqueStrings(actions) })
    },
    files,
    composition: {
      blockPacks: uniqueBlockPackMetadata([
        ...blockPacks.map((pack) => ({
          name: pack.name,
          profiles: [...(pack.profiles ?? [])],
          supportedBlocks: [...(pack.supportedBlocks ?? [])]
        })),
        ...(normalizedInput.composition?.blockPacks ?? [])
      ]),
      templateSources: [...templateSources]
        .map(([block, source]) => ({ block, source }))
        .sort((left, right) => left.block.localeCompare(right.block))
    }
  };
}

function isThemeSourceComposition(value: unknown): value is ThemeSourceComposition {
  return (
    isRecord(value) &&
    Array.isArray(value.blockPacks) &&
    value.blockPacks.every(
      (pack) =>
        isRecord(pack) &&
        typeof pack.name === "string" &&
        Array.isArray(pack.profiles) &&
        pack.profiles.every((profile) => typeof profile === "string") &&
        Array.isArray(pack.supportedBlocks) &&
        pack.supportedBlocks.every((block) => typeof block === "string")
    ) &&
    Array.isArray(value.templateSources) &&
    value.templateSources.every(
      (entry) => isRecord(entry) && typeof entry.block === "string" && typeof entry.source === "string"
    )
  );
}

function uniqueBlockPackMetadata(blockPacks: ThemeBlockPackMetadata[]): ThemeBlockPackMetadata[] {
  const seen = new Set<string>();
  return blockPacks.filter((pack) => {
    if (seen.has(pack.name)) {
      return false;
    }
    seen.add(pack.name);
    return true;
  });
}

export function createThemeResultFromSources(input: ThemeSourceInput): ThemeCreationResult {
  const runtimeInput = getThemeRuntimeSourceInput(input);
  const diagnostics = validateThemeSource(runtimeInput);
  const errors = diagnostics.filter((diagnostic) => diagnostic.severity === "error");

  if (errors.length > 0) {
    throw new ThemeValidationError(errors, resolveThemeName(runtimeInput.manifest, runtimeInput.rootName));
  }

  const normalizedInput = normalizeThemeSourceInput(runtimeInput);
  return {
    theme: createThemeFromValidatedSources(normalizedInput),
    diagnostics
  };
}

function createThemeFromValidatedSources(input: ThemeSourceInput): HtmlTheme {
  const css = readAssets(input.files, input.manifest.css);
  const js = readAssets(input.files, input.manifest.js);
  const head = readAssets(input.files, input.manifest.head);
  const shellTemplate = readOptional(input.files, input.manifest.shell);
  const blockRenderers = createBlockRenderers(input.files, input.manifest.blocks);
  const actions = uniqueThemeStrings(input.manifest.actions);

  return {
    name: resolveThemeName(input.manifest, input.rootName),
    ...(css === undefined ? {} : { css }),
    ...(js === undefined ? {} : { js }),
    ...(head === undefined ? {} : { head }),
    ...(actions === undefined ? {} : { actions }),
    ...(shellTemplate === undefined
      ? {}
      : {
          shell: (shellInput) => renderShellTemplate(shellTemplate, shellInput)
        }),
    blockRenderers
  };
}

export function getThemeFilePaths(manifest: ThemeManifest): string[] {
  const normalizedManifest = normalizeThemeManifestReferences(manifest);
  return uniqueStrings([
    ...assetReferencesToPaths(normalizedManifest.css),
    ...assetReferencesToPaths(normalizedManifest.js),
    ...assetReferencesToPaths(normalizedManifest.head),
    ...(normalizedManifest.shell === undefined || normalizedManifest.shell.length === 0 ? [] : [normalizedManifest.shell]),
    ...(normalizedManifest.preview === undefined || normalizedManifest.preview.length === 0 ? [] : [normalizedManifest.preview]),
    ...blockReferencesToPaths(normalizedManifest.blocks)
  ]);
}

function createBlockRenderers(files: Record<string, string>, blocks: ThemeBlockReference | undefined): HtmlBlockRenderers {
  const templates = collectBlockTemplates(files, blocks);

  return Object.fromEntries(
    Object.entries(templates).map(([blockType, template]) => [blockType, createTemplateBlockRenderer(template)])
  );
}

function collectBlockTemplates(
  files: Record<string, string>,
  blocks: ThemeBlockReference | undefined
): Record<string, string> {
  if (blocks === undefined) {
    return hasBlockDirectory(files, "blocks") ? collectBlockTemplates(files, "blocks") : {};
  }

  if (typeof blocks === "string") {
    return collectBlockSource(files, blocks);
  }

  if (Array.isArray(blocks)) {
    return blocks.reduce<Record<string, string>>(
      (templates, source) => ({
        ...templates,
        ...collectBlockSource(files, source)
      }),
      {}
    );
  }

  return Object.fromEntries(
    Object.entries(blocks).flatMap(([blockType, templatePath]) =>
      Object.entries(collectTemplatesFromFile(readRequired(files, templatePath), blockType))
    )
  );
}

function collectBlockSource(files: Record<string, string>, source: string): Record<string, string> {
  if (source.endsWith(".html")) {
    return collectTemplatesFromFile(readRequired(files, source), blockTypeFromPath(source));
  }

  const prefix = source.endsWith("/") ? source : `${source}/`;
  return Object.fromEntries(
    Object.entries(files)
      .filter(([path]) => path.startsWith(prefix) && path.endsWith(".html"))
      .flatMap(([path, template]) => Object.entries(collectTemplatesFromFile(template, blockTypeFromPath(path))))
  );
}

function collectTemplatesFromFile(template: string, fallbackBlockType: string): Record<string, string> {
  return Object.fromEntries(
    collectTemplateEntries(template, fallbackBlockType).map((entry) => [entry.blockType, entry.template])
  );
}

function hasBlockDirectory(files: Record<string, string>, directory: string): boolean {
  const prefix = directory.endsWith("/") ? directory : `${directory}/`;
  return Object.keys(files).some((path) => path.startsWith(prefix) && path.endsWith(".html"));
}

function removeComposedBlockFiles(files: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(files).filter(([path]) => !(path.startsWith("blocks/") && path.endsWith(".html")))
  );
}

function writeComposedBlockTemplates(templates: Record<string, string>): Record<string, string> {
  const usedFileNames = new Set<string>();
  return Object.fromEntries(
    Object.entries(templates).map(([blockType, template]) => [
      `blocks/${createBlockTemplateFileName(blockType, usedFileNames)}.html`,
      `<template data-block="${blockType}">${template}</template>`
    ])
  );
}

function createBlockTemplateFileName(blockType: string, usedFileNames: Set<string>): string {
  const baseName = blockType.replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "block";
  let fileName = baseName;
  let suffix = 2;

  while (usedFileNames.has(fileName)) {
    fileName = `${baseName}-${suffix}`;
    suffix += 1;
  }

  usedFileNames.add(fileName);
  return fileName;
}

function readAssets(files: Record<string, string>, reference: ThemeAssetReference | undefined): string | undefined {
  if (reference === undefined || reference.length === 0) {
    return undefined;
  }

  const paths = Array.isArray(reference) ? reference : [reference];
  return paths.map((path) => readRequired(files, path)).join("\n");
}

function readOptional(files: Record<string, string>, path: string | undefined): string | undefined {
  return path === undefined || path.length === 0 ? undefined : readRequired(files, path);
}

function readRequired(files: Record<string, string>, path: string): string {
  const value = files[path];
  if (value === undefined) {
    throw new Error(`Theme source is missing file: ${path}`);
  }

  return value;
}

function assetReferencesToPaths(reference: ThemeAssetReference | undefined): string[] {
  if (reference === undefined || reference.length === 0) {
    return [];
  }

  return Array.isArray(reference) ? reference : [reference];
}

function blockReferencesToPaths(reference: ThemeBlockReference | undefined): string[] {
  if (reference === undefined) {
    return [];
  }

  if (typeof reference === "string") {
    return reference.endsWith(".html") ? [reference] : [];
  }

  return Array.isArray(reference) ? reference.filter((path) => path.endsWith(".html")) : Object.values(reference);
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}
