import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { MdsBlockNode } from "@mds/ast";
import type { HtmlBlockRenderer, HtmlBlockRenderers, HtmlRenderContext, HtmlTheme } from "@mds/html-types";

export interface ThemeManifest {
  name?: string;
  css?: string;
  js?: string;
  shell?: string;
  blocks?: Record<string, string>;
}

export async function loadThemeDirectory(themeDirectory: string): Promise<HtmlTheme> {
  const root = resolve(themeDirectory);
  const manifest = await readThemeManifest(root);
  const [css, js, shellTemplate, blockRenderers] = await Promise.all([
    readOptional(root, manifest.css),
    readOptional(root, manifest.js),
    readOptional(root, manifest.shell),
    loadBlockRenderers(root, manifest.blocks ?? {})
  ]);

  return {
    name: manifest.name ?? root,
    ...(css === undefined ? {} : { css }),
    ...(js === undefined ? {} : { js }),
    ...(shellTemplate === undefined
      ? {}
      : {
          shell: (input) =>
            renderTemplate(shellTemplate, {
              title: escapeHtml(input.title),
              lang: escapeAttribute(input.lang),
              description: escapeHtml(input.description ?? ""),
              head: input.head,
              body: input.body,
              scripts: input.scripts
            })
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

async function loadBlockRenderers(root: string, blocks: Record<string, string>): Promise<HtmlBlockRenderers> {
  const entries = await Promise.all(
    Object.entries(blocks).map(async ([blockType, templatePath]) => {
      const template = await readFile(join(root, templatePath), "utf8");
      return [blockType, createTemplateBlockRenderer(template)] as const;
    })
  );

  return Object.fromEntries(entries);
}

function createTemplateBlockRenderer(template: string): HtmlBlockRenderer {
  return (block, context) => {
    const children = context.renderChildren(context.getContentChildren(block));
    const slots = context
      .getSlots(block)
      .map(
        (slot) =>
          `<section class="${context.escapeAttribute(block.blockType)}-item" data-slot="${context.escapeAttribute(slot.name)}">${context.renderChildren(slot.children)}</section>`
      )
      .join("\n");

    return renderTemplate(template, {
      type: context.escapeAttribute(block.blockType),
      name: context.escapeHtml(block.name ?? ""),
      id: context.escapeAttribute(block.name ?? ""),
      attrs: renderAttrs(block, context),
      children,
      slots,
      summary: context.escapeHtml(block.name ?? "Details")
    });
  };
}

function renderAttrs(block: MdsBlockNode, context: HtmlRenderContext): string {
  return block.name === undefined ? "" : ` id="${context.escapeAttribute(block.name)}"`;
}

function renderTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{\s*([A-Za-z][A-Za-z0-9_-]*)\s*\}\}/g, (_match, key: string) => {
    return values[key] ?? "";
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value);
}
