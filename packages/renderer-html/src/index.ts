import type { ActionLinkNode, Diagnostic, DocumentNode, MdsBlockNode, MdsNode, SlotNode } from "@mds/ast";
import type { HtmlBlockRenderer, HtmlBlockRenderers, HtmlRenderContext, HtmlTheme } from "@mds/html-types";
import {
  baseBlockRenderers,
  getContentChildren,
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
import { renderMarkdown } from "./markdown.js";
import { getDocumentMetadata, renderDocumentShell } from "./shell.js";

export interface RenderHtmlOptions {
  title?: string;
  includeCss?: boolean;
  theme?: HtmlTheme;
  blockRenderers?: HtmlBlockRenderers;
  includeDefaultBlockRenderers?: boolean;
  knownActions?: Iterable<string>;
}

export interface RenderHtmlResult {
  html: string;
  diagnostics: Diagnostic[];
}

export type { HtmlBlockRenderer, HtmlBlockRenderers, HtmlRenderContext, HtmlTheme } from "@mds/html-types";

const baseTheme: HtmlTheme = {
  name: "base"
};

interface RenderContext extends HtmlRenderContext {
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
  const theme = options.theme ?? baseTheme;
  const metadata = getDocumentMetadata(document.frontmatter, options.title);
  const diagnostics = [...document.diagnostics];
  const context = createRenderContext({
    states: collectStates(document.children),
    lists: collectLists(document.children),
    locals: new Map(),
    blockRenderers: createBlockRenderers(options),
    knownActions: createKnownActions(options),
    diagnostics,
    navigationContext: false
  });
  const body = renderDocumentBody(document.children, context);
  const html = renderDocumentShell({
    metadata,
    theme,
    body,
    includeCss: options.includeCss !== false
  });

  return {
    html,
    diagnostics
  };
}

function createRenderContext(input: {
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
  return children.map((child) => renderNode(child, context)).filter(Boolean).join("\n");
}

function renderDocumentBody(children: MdsNode[], context: RenderContext): string {
  const body = renderChildren(children, context);
  const hasPageBlock = children.some((child) => child.type === "block" && child.blockType === "page");

  return hasPageBlock ? body : `<main class="page">${body}</main>`;
}

function renderNode(node: MdsNode, context: RenderContext): string {
  switch (node.type) {
    case "document":
      return renderChildren(node.children, context);
    case "text":
      return escapeHtml(node.value);
    case "markdown":
      return renderMarkdown(interpolate(node.value, context));
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
      return renderMediaDirective(node.mediaType, node.target);
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
    return renderActionLink(node, {
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

function renderEachBlock(block: { listName: string; children: MdsNode[] }, context: HtmlRenderContext): string {
  const items = context.lists.get(block.listName) ?? [];

  return items
    .map((item) => {
      const locals = new Map<string, string>();
      locals.set("item", item);
      return context.renderChildrenWithLocals(block.children, locals);
    })
    .join("\n");
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
