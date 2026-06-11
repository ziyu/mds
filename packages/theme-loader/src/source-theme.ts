import type { HtmlBlockRenderers, HtmlTheme } from "@mds/html-types";
import { createTemplateBlockRenderer, renderShellTemplate } from "./template.js";

export interface ThemeManifest {
  name?: string;
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
}

export interface ThemeSource {
  manifest: ThemeManifest;
  files: Record<string, string>;
  rootName?: string;
}

export type ThemeAssetReference = string | string[];
export type ThemeBlockReference = string | string[] | Record<string, string>;

export function createThemeFromSources(input: ThemeSourceInput): HtmlTheme {
  const css = readAssets(input.files, input.manifest.css);
  const js = readAssets(input.files, input.manifest.js);
  const head = readAssets(input.files, input.manifest.head);
  const shellTemplate = readOptional(input.files, input.manifest.shell);
  const blockRenderers = createBlockRenderers(input.files, input.manifest.blocks);

  return {
    name: input.manifest.name ?? input.rootName ?? "theme",
    ...(css === undefined ? {} : { css }),
    ...(js === undefined ? {} : { js }),
    ...(head === undefined ? {} : { head }),
    ...(input.manifest.actions === undefined ? {} : { actions: input.manifest.actions }),
    ...(shellTemplate === undefined
      ? {}
      : {
          shell: (shellInput) => renderShellTemplate(shellTemplate, shellInput)
        }),
    blockRenderers
  };
}

export function getThemeFilePaths(manifest: ThemeManifest): string[] {
  return [
    ...assetReferencesToPaths(manifest.css),
    ...assetReferencesToPaths(manifest.js),
    ...assetReferencesToPaths(manifest.head),
    ...(manifest.shell === undefined || manifest.shell.length === 0 ? [] : [manifest.shell]),
    ...blockReferencesToPaths(manifest.blocks)
  ];
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
  const templates = [...template.matchAll(/<template\b([^>]*)>([\s\S]*?)<\/template>/gi)]
    .flatMap((match) => {
      const blockTypes = parseTemplateBlockTypes(match[1] ?? "");
      const body = match[2] ?? "";
      return blockTypes.map((blockType) => [blockType, body] as const);
    });

  return templates.length === 0 ? { [fallbackBlockType]: template } : Object.fromEntries(templates);
}

function parseTemplateBlockTypes(attributes: string): string[] {
  const match = attributes.match(/\sdata-block=(["'])(.*?)\1/i);
  if (match === null) {
    return [];
  }

  return (match[2] ?? "").split(/\s+/).filter(Boolean);
}

function blockTypeFromPath(path: string): string {
  const fileName = path.split("/").at(-1) ?? path;
  return fileName.endsWith(".html") ? fileName.slice(0, -".html".length) : fileName;
}

function hasBlockDirectory(files: Record<string, string>, directory: string): boolean {
  const prefix = directory.endsWith("/") ? directory : `${directory}/`;
  return Object.keys(files).some((path) => path.startsWith(prefix) && path.endsWith(".html"));
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
