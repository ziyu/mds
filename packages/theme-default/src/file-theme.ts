import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { HtmlBlockRenderers, HtmlTheme } from "@mds/html-types";
import { createTemplateBlockRenderer, renderShellTemplate } from "./template.js";

export interface ThemeManifest {
  name?: string;
  css?: ThemeAssetReference;
  js?: ThemeAssetReference;
  head?: ThemeAssetReference;
  shell?: string;
  blocks?: Record<string, string>;
}

type ThemeAssetReference = string | string[];

export async function loadThemeDirectory(themeDirectory: string): Promise<HtmlTheme> {
  const root = resolve(themeDirectory);
  const manifest = await readThemeManifest(root);
  const [css, js, head, shellTemplate, blockRenderers] = await Promise.all([
    readAssets(root, manifest.css),
    readAssets(root, manifest.js),
    readAssets(root, manifest.head),
    readOptional(root, manifest.shell),
    loadBlockRenderers(root, manifest.blocks ?? {})
  ]);

  return {
    name: manifest.name ?? root,
    ...(css === undefined ? {} : { css }),
    ...(js === undefined ? {} : { js }),
    ...(head === undefined ? {} : { head }),
    ...(shellTemplate === undefined
      ? {}
      : {
          shell: (input) => renderShellTemplate(shellTemplate, input)
        }),
    blockRenderers
  };
}

async function readThemeManifest(root: string): Promise<ThemeManifest> {
  const raw = await readFile(join(root, "theme.json"), "utf8");
  return JSON.parse(raw) as ThemeManifest;
}

async function readOptional(root: string, path: string | undefined): Promise<string | undefined> {
  if (path === undefined || path.length === 0) {
    return undefined;
  }

  return readFile(join(root, path), "utf8");
}

async function readAssets(root: string, reference: ThemeAssetReference | undefined): Promise<string | undefined> {
  if (reference === undefined || reference.length === 0) {
    return undefined;
  }

  const paths = Array.isArray(reference) ? reference : [reference];
  const assets = await Promise.all(paths.map((path) => readFile(join(root, path), "utf8")));
  return assets.join("\n");
}

async function loadBlockRenderers(root: string, blocks: Record<string, string>): Promise<HtmlBlockRenderers> {
  const entries = await Promise.all(
    Object.entries(blocks).map(async ([blockType, templatePath]) => {
      const template = await readFile(join(root, templatePath), "utf8");
      return [blockType, createTemplateBlockRenderer(template)] as const;
    })
  );

  return Object.fromEntries(entries);
}
