import type {
  ActionLinkNode,
  Diagnostic,
  DocumentNode,
  MarkdownNode,
  MdsBlockNode,
  MdsNode,
  MediaDirectiveNode,
  Position,
  SlotNode
} from "@mds-crate/ast";
import type { HtmlBlockRenderer, HtmlBlockRenderers, HtmlRenderContext, HtmlTheme } from "@mds-crate/html-types";
import { parseMds, type ParseOptions } from "@mds-crate/parser";
import {
  baseBlockRenderers,
  getContentChildren,
  getMediaUrlPurpose,
  getSlots,
  renderActionLink,
  renderDataNode,
  renderFallbackBlock,
  renderFormField,
  renderMediaDirective,
  renderSlot,
  renderSlottedContainer
} from "./base-renderers.js";
import { escapeAttribute, escapeHtml } from "./escape.js";
import { renderMarkdownResult, type MarkdownRenderCache } from "./markdown.js";
import {
  getDocumentMetadata,
  renderDocumentHead,
  renderDocumentShell,
  renderThemeScripts
} from "./shell.js";
import { sanitizeUrl, type UrlPurpose } from "./url.js";

export interface RenderHtmlOptions {
  /** Optional bounded cache owned by the caller; keys use fully resolved Markdown. */
  markdownCache?: MarkdownRenderCache;
  limits?: Partial<RenderLimits>;
  title?: string;
  includeCss?: boolean;
  theme?: HtmlTheme;
  blockRenderers?: HtmlBlockRenderers;
  includeDefaultBlockRenderers?: boolean;
  knownActions?: Iterable<string>;
}

export { createMarkdownRenderCache } from "./markdown.js";
export type { MarkdownRenderCache } from "./markdown.js";

export interface RenderLimits {
  maxDepth: number;
  maxNodes: number;
  /** UTF-16 code units, including shell and theme assets. */
  maxOutputLength: number;
}

const defaultLimits: RenderLimits = { maxDepth: 128, maxNodes: 100_000, maxOutputLength: 8_000_000 };

interface RenderBudget {
  limits: RenderLimits;
  depth: number;
  nodes: number;
}

export interface RenderHtmlResult {
  html: string;
  diagnostics: Diagnostic[];
}

export type RenderMdsMode = "document" | "fragment";

export interface RenderMdsOptions extends RenderHtmlOptions {
  mode?: RenderMdsMode;
  parseOptions?: ParseOptions;
}

export interface RenderMdsResult extends RenderHtmlResult {
  document: DocumentNode;
  body: string;
  head: string;
  css?: string;
  js?: string;
}

export type { HtmlBlockRenderer, HtmlBlockRenderers, HtmlRenderContext, HtmlTheme } from "@mds-crate/html-types";

const baseTheme: HtmlTheme = {
  name: "base"
};

interface RenderContext extends HtmlRenderContext {
  budget: RenderBudget;
  markdownCache: MarkdownRenderCache | undefined;
  states: Map<string, string>;
  lists: Map<string, string[]>;
  locals: Map<string, string>;
  blockRenderers: HtmlBlockRenderers;
  knownActions: ReadonlySet<string>;
  diagnostics: Diagnostic[];
  navigationContext: boolean;
}

export function renderHtml(document: DocumentNode, options: RenderHtmlOptions = {}): string {
  return renderHtmlResult(document, options).html;
}

export function renderHtmlResult(document: DocumentNode, options: RenderHtmlOptions = {}): RenderHtmlResult {
  const rendered = renderHtmlParts(document, options);
  return {
    html: rendered.html,
    diagnostics: rendered.diagnostics
  };
}

export function renderMds(source: string, options: RenderMdsOptions = {}): string {
  return renderMdsResult(source, options).html;
}

export function renderMdsResult(source: string, options: RenderMdsOptions = {}): RenderMdsResult {
  const { mode = "document", parseOptions, ...renderOptions } = options;
  const document = parseMds(source, parseOptions);
  const rendered = renderHtmlParts(document, renderOptions);

  return {
    document,
    html: mode === "fragment" ? rendered.body : rendered.html,
    body: rendered.body,
    head: rendered.head,
    diagnostics: rendered.diagnostics,
    ...(rendered.css === undefined ? {} : { css: rendered.css }),
    ...(rendered.js === undefined ? {} : { js: rendered.js })
  };
}

interface RenderedHtmlParts extends RenderHtmlResult {
  body: string;
  head: string;
  css?: string;
  js?: string;
}

function renderHtmlParts(document: DocumentNode, options: RenderHtmlOptions): RenderedHtmlParts {
  const theme = options.theme ?? baseTheme;
  const metadata = getDocumentMetadata(document.frontmatter, options.title);
  const diagnostics = [...document.diagnostics];
  const limits = { ...defaultLimits, ...options.limits };
  for (const [name, value] of Object.entries(limits)) {
    if (!Number.isSafeInteger(value) || value < 1) throw new RangeError(`${name} must be a positive safe integer.`);
  }
  validateTree(document.children, limits);
  const context = createRenderContext({
    budget: { limits, depth: 0, nodes: 0 },
    markdownCache: options.markdownCache,
    states: collectStates(document.children),
    lists: collectLists(document.children),
    locals: new Map(),
    blockRenderers: createBlockRenderers(options),
    knownActions: createKnownActions(options),
    diagnostics,
    navigationContext: false
  });
  const body = renderDocumentBody(document.children, context);
  const head = renderDocumentHead(metadata, theme, options.includeCss !== false);
  const scripts = renderThemeScripts(theme);
  const html = renderDocumentShell({
    metadata,
    theme,
    body,
    head,
    scripts
  });

  checkOutput(html, context);
  return {
    html,
    body,
    head,
    diagnostics,
    ...(theme.css === undefined ? {} : { css: theme.css }),
    ...(theme.js === undefined ? {} : { js: theme.js })
  };
}

function createRenderContext(input: {
  budget: RenderBudget;
  markdownCache: MarkdownRenderCache | undefined;
  states: Map<string, string>;
  lists: Map<string, string[]>;
  locals: Map<string, string>;
  blockRenderers: HtmlBlockRenderers;
  knownActions: ReadonlySet<string>;
  diagnostics: Diagnostic[];
  navigationContext: boolean;
}): RenderContext {
  const context = {} as RenderContext;
  Object.assign(context, {
    ...input,
    renderNode: (node: MdsNode) => renderNode(node, context),
    renderChildren: (children: MdsNode[]) => renderChildren(children, context),
    renderChildrenWithLocals: (children: MdsNode[], locals: ReadonlyMap<string, string>) => {
      const nextLocals = new Map(context.locals);
      for (const [key, value] of locals) {
        nextLocals.set(key, value);
      }
      return renderChildren(
        children,
        createRenderContext({
          budget: context.budget,
          markdownCache: context.markdownCache,
          states: context.states,
          lists: context.lists,
          locals: nextLocals,
          blockRenderers: context.blockRenderers,
          knownActions: context.knownActions,
          diagnostics: context.diagnostics,
          navigationContext: context.navigationContext
        })
      );
    },
    renderSlottedContainer: (block: MdsBlockNode, slots: SlotNode[], className: string) =>
      renderSlottedContainer(block, slots, className, context),
    getSlots,
    getContentChildren,
    resolveValue: (path: string) => resolveValue(path, context),
    escapeHtml,
    escapeAttribute
  });

  return context;
}

function renderChildren(children: MdsNode[], context: RenderContext): string {
  let output = "";
  for (const child of children) {
    const html = renderNode(child, context);
    if (html) output = checkOutput(output + (output ? "\n" : "") + html, context);
  }
  return output;
}

function renderDocumentBody(children: MdsNode[], context: RenderContext): string {
  const body = renderChildren(children, context);
  const hasPageBlock = children.some((child) => child.type === "block" && child.blockType === "page");

  return hasPageBlock ? body : `<main class="page">${body}</main>`;
}

function checkOutput(html: string, context: RenderContext): string {
  if (html.length > context.budget.limits.maxOutputLength) throw new RangeError("MDS output exceeds maxOutputLength.");
  return html;
}

// Validate before recursive state/list collection, including caller-constructed ASTs.
function validateTree(children: MdsNode[], limits: RenderLimits): void {
  const stack = [{ children, depth: 1 }];
  let nodes = 0;
  while (stack.length) {
    const frame = stack.pop()!;
    if (frame.depth > limits.maxDepth) throw new RangeError("MDS tree exceeds maxDepth.");
    for (const child of frame.children) {
      if (++nodes > limits.maxNodes) throw new RangeError("MDS tree exceeds maxNodes.");
      if ("children" in child) stack.push({ children: child.children, depth: frame.depth + 1 });
    }
  }
}

function renderNode(node: MdsNode, context: RenderContext): string {
  const budget = context.budget;
  if (++budget.nodes > budget.limits.maxNodes) throw new RangeError("MDS expansion exceeds maxNodes.");
  if (++budget.depth > budget.limits.maxDepth) throw new RangeError("MDS rendering exceeds maxDepth.");
  try {
    return checkOutput(renderNodeWithinBudget(node, context), context);
  } finally {
    budget.depth -= 1;
  }
}

function renderNodeWithinBudget(node: MdsNode, context: RenderContext): string {
  switch (node.type) {
    case "document":
      return renderChildren(node.children, context);
    case "text":
      return escapeHtml(node.value);
    case "markdown":
      return renderMarkdownNode(node, context);
    case "block":
      return renderBlock(node, context);
    case "conditionBlock":
      return renderConditionBlock(node, context);
    case "eachBlock":
      return renderEachBlock(node, context);
    case "dataBlock":
      return renderDataNode(node, context);
    case "slot":
      return renderSlot(node, context);
    case "actionLink":
      return renderCommandActionLink(node, context);
    case "mediaDirective":
      return renderMediaNode(node, context);
    case "formField":
      return renderFormField(node);
    case "stateDeclaration":
    case "listDeclaration":
      return "";
    case "interpolation":
      return escapeHtml(resolveValue(node.path, context));
  }
}

function renderCommandActionLink(node: ActionLinkNode, context: RenderContext): string {
  if (node.kind !== "command") {
    const target = node.target ?? "#";
    const safeTarget = sanitizeUrl(target, "navigation");
    if (safeTarget === undefined) {
      reportUnsafeUrl(context, target, "navigation", node.position);
    }
    return renderActionLink({ ...node, target: safeTarget ?? "#" }, {
      navigationContext: context.navigationContext
    });
  }

  const action = node.action ?? "";
  const missingHandler = !isNativeAction(action) && !context.knownActions.has(action);
  if (missingHandler) {
    context.diagnostics.push({
      code: "missing-action-handler",
      message: `No handler registered for action "${action}".`,
      severity: "warning",
      ...(node.position === undefined ? {} : { position: node.position })
    });
  }

  return renderActionLink(node, {
    missingHandler
  });
}

function renderMarkdownNode(node: MarkdownNode, context: RenderContext): string {
  const value = interpolate(node.value, context);
  const rendered = context.markdownCache?.render(value) ?? renderMarkdownResult(value);
  for (const unsafeUrl of rendered.unsafeUrls) {
    reportUnsafeUrl(context, unsafeUrl.value, unsafeUrl.purpose, node.position);
  }
  return rendered.html;
}

function renderMediaNode(node: MediaDirectiveNode, context: RenderContext): string {
  const purpose = getMediaUrlPurpose(node.mediaType);
  if (purpose !== undefined && sanitizeUrl(node.target, purpose) === undefined) {
    reportUnsafeUrl(context, node.target, purpose, node.position);
  }
  return renderMediaDirective(node.mediaType, node.target);
}

function reportUnsafeUrl(
  context: RenderContext,
  value: string,
  purpose: UrlPurpose,
  position: Position | undefined
): void {
  context.diagnostics.push({
    code: "unsafe-url",
    message: `Blocked unsafe ${purpose} URL: ${value}.`,
    severity: "warning",
    ...(position === undefined ? {} : { position })
  });
}

function renderBlock(block: MdsBlockNode, context: RenderContext): string {
  const renderer = context.blockRenderers[block.blockType];
  if (renderer === undefined) {
    context.diagnostics.push({
      code: "missing-block-renderer",
      message: `No block renderer registered for "${block.blockType}".`,
      severity: "warning",
      ...(block.position === undefined ? {} : { position: block.position })
    });
    return renderFallbackBlock(block, context);
  }

  if (block.blockType !== "nav") {
    return renderer(block, context);
  }

  return renderer(
    block,
    createRenderContext({
      budget: context.budget,
      markdownCache: context.markdownCache,
      states: context.states,
      lists: context.lists,
      locals: context.locals,
      blockRenderers: context.blockRenderers,
      knownActions: context.knownActions,
      diagnostics: context.diagnostics,
      navigationContext: true
    })
  );
}

function renderConditionBlock(
  block: { condition: "if" | "unless"; name: string; children: MdsNode[] },
  context: HtmlRenderContext
): string {
  const truthy = isTruthy(context.resolveValue(block.name));
  const shouldRender = block.condition === "if" ? truthy : !truthy;
  return shouldRender ? context.renderChildren(block.children) : "";
}

function renderEachBlock(block: { listName: string; children: MdsNode[] }, context: RenderContext): string {
  const items = context.lists.get(block.listName) ?? [];

  let output = "";
  for (const [index, item] of items.entries()) {
    if (++context.budget.nodes > context.budget.limits.maxNodes) throw new RangeError("MDS expansion exceeds maxNodes.");
    const html = context.renderChildrenWithLocals(block.children, new Map([["item", item]]));
    output = checkOutput(output + (index ? "\n" : "") + html, context);
  }
  return output;
}

export function createBlockRenderers(options: RenderHtmlOptions = {}): HtmlBlockRenderers {
  const baseRenderers = options.includeDefaultBlockRenderers === false ? {} : baseBlockRenderers;
  const themeRenderers = options.theme?.blockRenderers ?? {};
  return {
    ...baseRenderers,
    ...themeRenderers,
    ...(options.blockRenderers ?? {})
  };
}

function createKnownActions(options: RenderHtmlOptions): ReadonlySet<string> {
  return new Set([...(options.theme?.actions ?? []), ...(options.knownActions ?? [])]);
}

function isNativeAction(action: string): boolean {
  return action === "submit" || action === "reset";
}

function collectStates(children: MdsNode[], states = new Map<string, string>()): Map<string, string> {
  for (const child of children) {
    if (child.type === "stateDeclaration") {
      states.set(child.name, child.value);
    } else if (
      child.type === "block" ||
      child.type === "slot" ||
      child.type === "document" ||
      child.type === "conditionBlock" ||
      child.type === "eachBlock" ||
      child.type === "dataBlock"
    ) {
      collectStates(child.children, states);
    }
  }

  return states;
}

function collectLists(children: MdsNode[], lists = new Map<string, string[]>()): Map<string, string[]> {
  for (const child of children) {
    if (child.type === "listDeclaration") {
      lists.set(child.name, child.items);
    } else if (
      child.type === "block" ||
      child.type === "slot" ||
      child.type === "document" ||
      child.type === "conditionBlock" ||
      child.type === "eachBlock" ||
      child.type === "dataBlock"
    ) {
      collectLists(child.children, lists);
    }
  }

  return lists;
}

function interpolate(value: string, context: RenderContext): string {
  return value.replace(/\{\{\s*([A-Za-z][A-Za-z0-9_.-]*)\s*\}\}/g, (_match, path: string) =>
    resolveValue(path, context)
  );
}

function resolveValue(path: string, context: RenderContext): string {
  return context.locals.get(path) ?? context.states.get(path) ?? "";
}

function isTruthy(value: string): boolean {
  return value !== "" && value !== "false" && value !== "0" && value !== "null" && value !== "undefined";
}
