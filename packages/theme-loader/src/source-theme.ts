import type { HtmlBlockRenderers, HtmlTheme } from "@mds/html-types";
import { createTemplateBlockRenderer, renderShellTemplate } from "./template.js";

export interface ThemeManifest {
  name?: string;
  css?: ThemeAssetReference;
  js?: ThemeAssetReference;
  head?: ThemeAssetReference;
  shell?: string;
  blocks?: Record<string, string>;
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

export function createThemeFromSources(input: ThemeSourceInput): HtmlTheme {
  const css = readAssets(input.files, input.manifest.css);
  const js = readAssets(input.files, input.manifest.js);
  const head = readAssets(input.files, input.manifest.head);
  const shellTemplate = readOptional(input.files, input.manifest.shell);
  const blockRenderers = createBlockRenderers(input.files, input.manifest.blocks ?? {});

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
    ...Object.values(manifest.blocks ?? {})
  ];
}

function createBlockRenderers(files: Record<string, string>, blocks: Record<string, string>): HtmlBlockRenderers {
  return Object.fromEntries(
    Object.entries(blocks).map(([blockType, templatePath]) => [
      blockType,
      createTemplateBlockRenderer(readRequired(files, templatePath))
    ])
  );
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
