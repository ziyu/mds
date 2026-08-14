import type { HtmlTheme } from "@mds/html-types";
import {
  composeThemeSource,
  createThemeFromSources,
  type ThemeBlockPackSource,
  type ThemeManifest,
  type ThemeSourceInput
} from "./source-theme.js";
import { jsx as createElement, raw, renderJsxNode, type JsxChild, type RawHtml } from "./jsx-runtime.js";
import { isRecord } from "./shape.js";

export type ThemeBlockComponent = (props: ThemeTemplateProps) => JsxChild;
export type TemplateBlock = ThemeTemplateProps;

export interface ThemeTemplateProps {
  type: string;
  name: string;
  id: string;
  attrs: RawHtml;
  blockAttrs: Record<string, string | number | boolean>;
  children: RawHtml;
  slots: RawHtml;
  summary: string;
  attr: (name: string, fallback?: string) => string;
  slot: (name: string) => RawHtml;
}

export interface JsxThemeDefinition {
  name: string;
  label?: string;
  description?: string;
  author?: string;
  homepage?: string;
  preview?: string;
  tags?: string[];
  supportedBlocks?: string[];
  css?: string;
  js?: string;
  shell?: string;
  head?: string;
  actions?: string[];
  blockPacks?: readonly ThemeBlockPackSource[];
  blocks: Record<string, ThemeBlockComponent>;
}

export class JsxThemeBlockRenderError extends Error {
  readonly block: string;

  constructor(block: string, cause: unknown) {
    super(`Could not render JSX theme block "${block}": ${cause instanceof Error ? cause.message : String(cause)}`, {
      cause
    });
    this.name = "JsxThemeBlockRenderError";
    this.block = block;
  }
}

export interface RootProps {
  block: Pick<ThemeTemplateProps, "attrs">;
  as?: string;
  children?: JsxChild;
  [attribute: string]: unknown;
}

export interface ContentProps {
  block: Pick<ThemeTemplateProps, "children">;
}

export interface SlotsProps {
  block: Pick<ThemeTemplateProps, "slots">;
}

export interface SlotProps {
  block: Pick<ThemeTemplateProps, "slot">;
  name: string;
}

export function defineJsxTheme(theme: JsxThemeDefinition): JsxThemeDefinition {
  return theme;
}

export function isJsxThemeDefinition(value: unknown): value is JsxThemeDefinition {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    isRecord(value.blocks) &&
    Object.values(value.blocks).every((block) => typeof block === "function")
  );
}

export function Root({ block, as = "section", children, ...props }: RootProps): JsxChild {
  return createElement(as, {
    ...props,
    rawAttrs: block.attrs,
    children
  });
}

export function Content({ block }: ContentProps): JsxChild {
  return block.children;
}

export function Slots({ block }: SlotsProps): JsxChild {
  return block.slots;
}

export function Slot({ block, name }: SlotProps): JsxChild {
  return block.slot(name);
}

export function createThemeFromJsxTheme(theme: JsxThemeDefinition): HtmlTheme {
  return createThemeFromSources(createThemeSourceFromJsxTheme(theme));
}

export function createThemeSourceFromJsxTheme(theme: JsxThemeDefinition): ThemeSourceInput {
  if (!isJsxThemeDefinition(theme)) {
    throw new Error("JSX theme definition must include a string name and a blocks object whose values are functions.");
  }

  const files: Record<string, string> = {};
  const manifest: ThemeManifest = {
    version: 1,
    name: theme.name,
    blocks: "blocks"
  };

  copyOptionalManifestString(theme, manifest, "label");
  copyOptionalManifestString(theme, manifest, "description");
  copyOptionalManifestString(theme, manifest, "author");
  copyOptionalManifestString(theme, manifest, "homepage");
  copyOptionalManifestString(theme, manifest, "preview");
  copyOptionalManifestStringArray(theme, manifest, "tags");
  copyOptionalManifestStringArray(theme, manifest, "supportedBlocks");

  if (theme.css !== undefined) {
    manifest.css = "style.css";
    files["style.css"] = theme.css;
  }

  if (theme.js !== undefined) {
    manifest.js = "script.js";
    files["script.js"] = theme.js;
  }

  if (theme.head !== undefined) {
    manifest.head = "head.html";
    files["head.html"] = theme.head;
  }

  if (theme.shell !== undefined) {
    manifest.shell = "shell.html";
    files["shell.html"] = theme.shell;
  }

  if (theme.actions !== undefined) {
    manifest.actions = theme.actions;
  }

  for (const [blockTypes, component] of Object.entries(theme.blocks)) {
    const normalizedBlockTypes = blockTypes.split(/\s+/).filter(Boolean);
    const blockName = normalizedBlockTypes.join(" ") || blockTypes || "block";
    let template: string;
    try {
      template = renderJsxTemplate(component);
    } catch (error) {
      throw new JsxThemeBlockRenderError(blockName, error);
    }

    const fileName = `blocks/${normalizedBlockTypes[0] ?? "block"}.html`;
    files[fileName] =
      normalizedBlockTypes.length > 1
        ? `<template data-block="${normalizedBlockTypes.join(" ")}">${template}</template>`
        : template;
  }

  const source: ThemeSourceInput = {
    manifest,
    files,
    rootName: theme.name
  };

  return composeThemeSource(source, theme.blockPacks === undefined ? {} : { blockPacks: theme.blockPacks });
}

function copyOptionalManifestString(
  theme: JsxThemeDefinition,
  manifest: ThemeManifest,
  field: "label" | "description" | "author" | "homepage" | "preview"
): void {
  if (theme[field] !== undefined) {
    manifest[field] = theme[field];
  }
}

function copyOptionalManifestStringArray(
  theme: JsxThemeDefinition,
  manifest: ThemeManifest,
  field: "tags" | "supportedBlocks"
): void {
  if (theme[field] !== undefined) {
    manifest[field] = theme[field];
  }
}

export function renderJsxTemplate(component: ThemeBlockComponent): string {
  return renderJsxNode(component(createTemplateProps()));
}

function createTemplateProps(): ThemeTemplateProps {
  return {
    type: "{{ type }}",
    name: "{{ name }}",
    id: "{{ id }}",
    attrs: raw("{{ attrs }}"),
    blockAttrs: {},
    children: raw("{{ children }}"),
    slots: raw("{{ slots }}"),
    summary: "{{ summary }}",
    attr: (name: string, fallback = "") => (fallback === "" ? `{{ attr:${name} }}` : `{{ attr:${name}:${fallback} }}`),
    slot: (name: string) => raw(`{{ slot:${name} }}`)
  };
}

export { Fragment, jsx, jsxs, raw, renderJsxNode } from "./jsx-runtime.js";
export type { JsxChild, JsxComponent, JsxElement, RawHtml } from "./jsx-runtime.js";
