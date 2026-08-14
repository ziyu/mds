import type { HtmlTheme } from "@mds/html-types";
import {
  composeThemeSource,
  createThemeFromSources,
  isThemeSourceInput,
  type ThemeBlockPackSource,
  type ThemeManifest,
  type ThemeSourceInput
} from "@mds/theme-loader";
import { createElement, type ComponentPropsWithoutRef, type ElementType, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

export type ReactThemeBlockComponent = (block: ReactThemeBlock) => ReactNode;

export interface ReactThemeBlock {
  type: string;
  name: string;
  id: string;
  attrs: ReactRawAttrs;
  blockAttrs: Record<string, string | number | boolean>;
  children: ReactNode;
  slots: ReactNode;
  summary: string;
  attr: (name: string, fallback?: string) => string;
  slot: (name: string) => ReactNode;
}

export interface ReactRawAttrs {
  readonly __mdsReactRawAttrs: string;
}

export interface ReactRawHtml {
  readonly __mdsReactRawHtml: string;
}

export interface ReactThemeDefinition {
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
  blocks: Record<string, ReactThemeBlockComponent>;
}

export interface RootProps<T extends ElementType = "section"> {
  block: Pick<ReactThemeBlock, "attrs">;
  as?: T;
  children?: ReactNode;
}

type RootElementProps<T extends ElementType> = RootProps<T> &
  Omit<ComponentPropsWithoutRef<T>, keyof RootProps<T> | "dangerouslySetInnerHTML">;

export interface ContentProps {
  block: Pick<ReactThemeBlock, "children">;
}

export interface SlotsProps {
  block: Pick<ReactThemeBlock, "slots">;
}

export interface SlotProps {
  block: Pick<ReactThemeBlock, "slot">;
  name: string;
}

interface RenderContext {
  nextId: number;
  rawHtml: Map<string, string>;
  rawAttrs: Map<string, string>;
}

export function defineReactTheme(theme: ReactThemeDefinition): ThemeSourceInput {
  return createThemeSourceFromReactTheme(theme);
}

export function isReactThemeDefinition(value: unknown): value is ReactThemeDefinition {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    isRecord(value.blocks) &&
    Object.values(value.blocks).every((block) => typeof block === "function")
  );
}

export function Root<T extends ElementType = "section">({
  block,
  as,
  children,
  ...props
}: RootElementProps<T>): ReactNode {
  const elementType = as ?? "section";
  return createElement(elementType, {
    ...props,
    "data-mds-raw-attrs": block.attrs.__mdsReactRawAttrs,
    children
  });
}

export function Content({ block }: ContentProps): ReactNode {
  return block.children;
}

export function Slots({ block }: SlotsProps): ReactNode {
  return block.slots;
}

export function Slot({ block, name }: SlotProps): ReactNode {
  return block.slot(name);
}

export function Raw({ html }: { html: string }): ReactNode {
  return createRawHtmlNode(html);
}

export function createThemeFromReactTheme(theme: ReactThemeDefinition): HtmlTheme {
  return createThemeFromSources(createThemeSourceFromReactTheme(theme));
}

export function createThemeSourceFromReactTheme(theme: ReactThemeDefinition): ThemeSourceInput {
  if (!isReactThemeDefinition(theme)) {
    throw new Error("React theme definition must include a string name and a blocks object whose values are functions.");
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
    const template = renderReactTemplate(component);
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

export function createThemeFromReactSource(source: ThemeSourceInput): HtmlTheme {
  if (!isThemeSourceInput(source)) {
    throw new Error("React theme source must be a valid ThemeSourceInput.");
  }

  return createThemeFromSources(source);
}

export function rawHtml(value: string): ReactRawHtml {
  return {
    __mdsReactRawHtml: value
  };
}

export function renderReactTemplate(component: ReactThemeBlockComponent): string {
  const context: RenderContext = {
    nextId: 0,
    rawHtml: new Map(),
    rawAttrs: new Map()
  };
  return replaceRawMarkers(renderToStaticMarkup(component(createTemplateBlock(context))), context);
}

function createTemplateBlock(context: RenderContext): ReactThemeBlock {
  return {
    type: "{{ type }}",
    name: "{{ name }}",
    id: "{{ id }}",
    attrs: createRawAttrs("{{ attrs }}", context),
    blockAttrs: {},
    children: createRawHtmlNode("{{ children }}", context),
    slots: createRawHtmlNode("{{ slots }}", context),
    summary: "{{ summary }}",
    attr: (name: string, fallback = "") => (fallback === "" ? `{{ attr:${name} }}` : `{{ attr:${name}:${fallback} }}`),
    slot: (name: string) => createRawHtmlNode(`{{ slot:${name} }}`, context)
  };
}

function createRawHtmlNode(value: string, context?: RenderContext): ReactNode {
  if (context === undefined) {
    return createElement("span", {
      dangerouslySetInnerHTML: {
        __html: value
      }
    });
  }

  const token = nextToken(context);
  context.rawHtml.set(token, value);
  return createElement("mds-raw", {
    "data-mds-token": token
  });
}

function createRawAttrs(value: string, context: RenderContext): ReactRawAttrs {
  const token = nextToken(context);
  context.rawAttrs.set(token, value);
  return {
    __mdsReactRawAttrs: token
  };
}

function nextToken(context: RenderContext): string {
  const token = `mds-react-raw-${context.nextId}`;
  context.nextId += 1;
  return token;
}

function replaceRawMarkers(markup: string, context: RenderContext): string {
  return markup
    .replace(/<mds-raw data-mds-token="([^"]+)"><\/mds-raw>/g, (_match, token: string) => context.rawHtml.get(token) ?? "")
    .replace(/ data-mds-raw-attrs="([^"]+)"/g, (_match, token: string) => context.rawAttrs.get(token) ?? "");
}

function copyOptionalManifestString(
  theme: ReactThemeDefinition,
  manifest: ThemeManifest,
  field: "label" | "description" | "author" | "homepage" | "preview"
): void {
  if (theme[field] !== undefined) {
    manifest[field] = theme[field];
  }
}

function copyOptionalManifestStringArray(
  theme: ReactThemeDefinition,
  manifest: ThemeManifest,
  field: "tags" | "supportedBlocks"
): void {
  if (theme[field] !== undefined) {
    manifest[field] = theme[field];
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
