import type {
  ActionLinkNode,
  DocumentNode,
  FormFieldNode,
  MdsBlockNode,
  MdsNode,
  SlotNode
} from "@mds/ast";
import { defaultThemeCss } from "@mds/theme-default";
import { toHtml } from "hast-util-to-html";
import { toHast } from "mdast-util-to-hast";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";

export interface RenderHtmlOptions {
  title?: string;
  includeCss?: boolean;
  blockRenderers?: HtmlBlockRenderers;
  includeDefaultBlockRenderers?: boolean;
}

export type HtmlBlockRenderer = (block: MdsBlockNode, context: HtmlRenderContext) => string;

export type HtmlBlockRenderers = Partial<Record<string, HtmlBlockRenderer>>;

export interface HtmlRenderContext {
  states: ReadonlyMap<string, string>;
  lists: ReadonlyMap<string, string[]>;
  locals: ReadonlyMap<string, string>;
  renderNode: (node: MdsNode) => string;
  renderChildren: (children: MdsNode[]) => string;
  renderChildrenWithLocals: (children: MdsNode[], locals: ReadonlyMap<string, string>) => string;
  renderSlottedContainer: (block: MdsBlockNode, slots: SlotNode[], className: string) => string;
  getSlots: (block: MdsBlockNode) => SlotNode[];
  resolveValue: (path: string) => string;
  escapeHtml: (value: string) => string;
  escapeAttribute: (value: string) => string;
}

interface RenderContext extends HtmlRenderContext {
  states: Map<string, string>;
  lists: Map<string, string[]>;
  locals: Map<string, string>;
  blockRenderers: HtmlBlockRenderers;
}

export function renderHtml(document: DocumentNode, options: RenderHtmlOptions = {}): string {
  const title = options.title ?? String(document.frontmatter.title ?? "MDS Document");
  const lang = String(document.frontmatter.lang ?? "en");
  const description =
    typeof document.frontmatter.description === "string" ? document.frontmatter.description : undefined;
  const context = createRenderContext({
    states: collectStates(document.children),
    lists: collectLists(document.children),
    locals: new Map(),
    blockRenderers: createBlockRenderers(options)
  });
  const body = renderDocumentBody(document.children, context);
  const css = options.includeCss === false ? "" : `\n  <style>${defaultThemeCss}</style>`;

  return [
    "<!doctype html>",
    `<html lang="${escapeAttribute(lang)}">`,
    "<head>",
    '  <meta charset="utf-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1">',
    `  <title>${escapeHtml(title)}</title>`,
    description === undefined
      ? ""
      : `  <meta name="description" content="${escapeAttribute(description)}">`,
    css,
    "</head>",
    "<body>",
    body,
    "</body>",
    "</html>"
  ]
    .filter((line) => line.length > 0)
    .join("\n");
}

function createRenderContext(input: {
  states: Map<string, string>;
  lists: Map<string, string[]>;
  locals: Map<string, string>;
  blockRenderers: HtmlBlockRenderers;
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
          blockRenderers: context.blockRenderers
        })
      );
    },
    renderSlottedContainer: (block: MdsBlockNode, slots: SlotNode[], className: string) =>
      renderSlottedContainer(block, slots, className, context),
    getSlots,
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
      return renderActionLink(node);
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

function renderBlock(block: MdsBlockNode, context: RenderContext): string {
  const renderer = context.blockRenderers[block.blockType] ?? renderFallbackBlock;
  return renderer(block, context);
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

function renderDataNode(block: { name: string; value: string }, context: HtmlRenderContext): string {
  return `<script type="application/json" data-data="${context.escapeAttribute(block.name)}">${context.escapeHtml(block.value)}</script>`;
}

const defaultBlockRenderers: HtmlBlockRenderers = {
  page: (block, context) =>
    `<main${renderId(block)} class="page">${context.renderChildren(getContentChildren(block))}</main>`,
  section: renderSectionLikeBlock,
  hero: renderSectionLikeBlock,
  scene: renderSectionLikeBlock,
  reveal: renderSectionLikeBlock,
  float: renderSectionLikeBlock,
  sticky: renderSectionLikeBlock,
  motion: renderSectionLikeBlock,
  aside: (block, context) =>
    `<aside${renderId(block)} class="aside">${context.renderChildren(getContentChildren(block))}</aside>`,
  footer: (block, context) =>
    `<footer${renderId(block)} class="footer">${context.renderChildren(getContentChildren(block))}</footer>`,
  note: renderCalloutBlock,
  info: renderCalloutBlock,
  warning: renderCalloutBlock,
  danger: renderCalloutBlock,
  success: renderCalloutBlock,
  quote: (block, context) =>
    `<blockquote${renderId(block)} class="quote">${context.renderChildren(getContentChildren(block))}</blockquote>`,
  card: (block, context) =>
    `<article${renderId(block)} class="card">${context.renderChildren(getContentChildren(block))}</article>`,
  cards: (block, context) =>
    `<div${renderId(block)} class="cards">${context.renderChildren(getContentChildren(block))}</div>`,
  details: (block, context) =>
    `<details${renderId(block)} class="details"><summary>${context.escapeHtml(block.name ?? "Details")}</summary>${context.renderChildren(getContentChildren(block))}</details>`,
  tabs: renderTabs,
  accordion: renderAccordion,
  carousel: (block, context) => context.renderSlottedContainer(block, context.getSlots(block), "carousel"),
  dialog: (block, context) =>
    `<section${renderId(block)} class="dialog" role="dialog" aria-modal="true">${context.renderChildren(getContentChildren(block))}</section>`,
  drawer: (block, context) =>
    `<aside${renderId(block)} class="drawer">${context.renderChildren(getContentChildren(block))}</aside>`,
  split: renderSlottedLayoutBlock,
  grid: renderSlottedLayoutBlock,
  "grid-2": renderSlottedLayoutBlock,
  "grid-3": renderSlottedLayoutBlock,
  "grid-auto": renderSlottedLayoutBlock,
  form: (block, context) =>
    `<form${renderId(block)} class="form" method="post">${context.renderChildren(getContentChildren(block))}</form>`,
  if: (block, context) =>
    isTruthy(context.resolveValue(block.name ?? "")) ? context.renderChildren(getContentChildren(block)) : "",
  unless: (block, context) =>
    isTruthy(context.resolveValue(block.name ?? "")) ? "" : context.renderChildren(getContentChildren(block)),
  each: renderEach,
  data: renderDataBlock
};

export function createBlockRenderers(options: RenderHtmlOptions = {}): HtmlBlockRenderers {
  const defaults = options.includeDefaultBlockRenderers === false ? {} : defaultBlockRenderers;
  return {
    ...defaults,
    ...(options.blockRenderers ?? {})
  };
}

function renderSectionLikeBlock(block: MdsBlockNode, context: HtmlRenderContext): string {
  return `<section${renderId(block)} class="${context.escapeAttribute(block.blockType)}">${context.renderChildren(getContentChildren(block))}</section>`;
}

function renderCalloutBlock(block: MdsBlockNode, context: HtmlRenderContext): string {
  return `<aside${renderId(block)} class="callout ${context.escapeAttribute(block.blockType)}" role="note">${context.renderChildren(getContentChildren(block))}</aside>`;
}

function renderSlottedLayoutBlock(block: MdsBlockNode, context: HtmlRenderContext): string {
  return context.renderSlottedContainer(block, context.getSlots(block), context.escapeAttribute(block.blockType));
}

function renderFallbackBlock(block: MdsBlockNode, context: HtmlRenderContext): string {
  return `<section${renderId(block)} class="block ${context.escapeAttribute(block.blockType)}" data-block="${context.escapeAttribute(block.blockType)}">${context.renderChildren(getContentChildren(block))}</section>`;
}

function renderId(block: MdsBlockNode): string {
  return block.name === undefined ? "" : ` id="${escapeAttribute(block.name)}"`;
}

function getContentChildren(block: MdsBlockNode): MdsNode[] {
  return block.children.filter((child) => child.type !== "slot");
}

function renderTabs(block: MdsBlockNode, context: HtmlRenderContext): string {
  const slots = context.getSlots(block);

  if (slots.length === 0) {
    return context.renderSlottedContainer(block, slots, "tabs");
  }

  const baseId = block.name ?? "tabs";
  const nav = slots
    .map((slot, index) => {
      const id = `${baseId}-${index + 1}`;
      return `<a href="#${escapeAttribute(id)}">${escapeHtml(slot.name)}</a>`;
    })
    .join("");
  const panels = slots
    .map((slot, index) => {
      const id = `${baseId}-${index + 1}`;
      return `<section id="${escapeAttribute(id)}" class="tab-panel"><h2>${escapeHtml(slot.name)}</h2>${context.renderChildren(slot.children)}</section>`;
    })
    .join("\n");

  return `<section class="tabs"><nav class="tab-list">${nav}</nav>${panels}</section>`;
}

function renderAccordion(block: MdsBlockNode, context: HtmlRenderContext): string {
  const slots = context.getSlots(block);

  if (slots.length === 0) {
    return context.renderSlottedContainer(block, slots, "accordion");
  }

  const items = slots
    .map(
      (slot) =>
        `<details class="accordion-item"><summary>${escapeHtml(slot.name)}</summary>${context.renderChildren(slot.children)}</details>`
    )
    .join("\n");

  return `<section class="accordion">${items}</section>`;
}

function renderSlottedContainer(
  block: MdsBlockNode,
  slots: SlotNode[],
  className: string,
  context: HtmlRenderContext
): string {
  const id = block.name === undefined ? "" : ` id="${escapeAttribute(block.name)}"`;

  if (slots.length === 0) {
    const children = block.children.filter((child) => child.type !== "slot");
    return `<section${id} class="${className}">${context.renderChildren(children)}</section>`;
  }

  const renderedSlots = slots
    .map(
      (slot) =>
        `<section class="${className}-item" data-slot="${escapeAttribute(slot.name)}">${context.renderChildren(slot.children)}</section>`
    )
    .join("\n");

  return `<section${id} class="${className}">${renderedSlots}</section>`;
}

function renderEach(block: MdsBlockNode, context: HtmlRenderContext): string {
  const listName = block.name ?? "";
  const items = context.lists.get(listName) ?? [];
  const children = getContentChildren(block);

  return items
    .map((item) => {
      const locals = new Map<string, string>();
      locals.set("item", item);
      return context.renderChildrenWithLocals(children, locals);
    })
    .join("\n");
}

function renderDataBlock(block: MdsBlockNode, context: HtmlRenderContext): string {
  const children = getContentChildren(block);
  const raw = children
    .filter((child): child is Extract<MdsNode, { type: "markdown" }> => child.type === "markdown")
    .map((child) => child.value)
    .join("\n");
  const name = block.name ?? "data";

  return `<script type="application/json" data-data="${escapeAttribute(name)}">${escapeHtml(raw)}</script>`;
}

function renderSlot(slot: SlotNode, context: RenderContext): string {
  return `<section class="slot" data-slot="${escapeAttribute(slot.name)}">${renderChildren(slot.children, context)}</section>`;
}

function renderActionLink(link: ActionLinkNode): string {
  const label = escapeHtml(link.label);

  if (link.kind === "command") {
    const action = link.action ?? "";
    const type = action === "submit" ? "submit" : action === "reset" ? "reset" : "button";
    const target = link.args[0];

    return `<button type="${type}" class="action command" data-action="${escapeAttribute(action)}"${
      target === undefined ? "" : ` data-target="${escapeAttribute(target)}"`
    }>${label}</button>`;
  }

  const href = link.target ?? "#";
  const rel = link.kind === "external" ? ' rel="noopener noreferrer"' : "";
  const target = link.kind === "external" ? ' target="_blank"' : "";

  return `<a class="action ${link.kind}" href="${escapeAttribute(href)}"${rel}${target}>${label}</a>`;
}

function renderMediaDirective(mediaType: string, target: string): string {
  const escapedTarget = escapeAttribute(target);

  switch (mediaType) {
    case "video":
      return `<video class="media video" src="${escapedTarget}" controls></video>`;
    case "audio":
      return `<audio class="media audio" src="${escapedTarget}" controls></audio>`;
    case "embed":
      return `<iframe class="media embed" src="${escapedTarget}" loading="lazy"></iframe>`;
    case "model":
      return `<a class="media model" href="${escapedTarget}">${escapeHtml(target)}</a>`;
    case "chart":
      return `<figure class="media chart" data-chart="${escapedTarget}"></figure>`;
    case "map":
      return `<figure class="media map" data-map="${escapedTarget}">${escapeHtml(target)}</figure>`;
    case "file":
      return `<a class="media file" href="${escapedTarget}">${escapeHtml(target)}</a>`;
    case "download":
      return `<a class="media download" href="${escapedTarget}" download>${escapeHtml(target)}</a>`;
    default:
      return "";
  }
}

function renderFormField(field: FormFieldNode): string {
  const id = `field-${field.name}`;
  const label = `<label for="${escapeAttribute(id)}">${escapeHtml(field.label)}</label>`;
  const name = escapeAttribute(field.name);

  if (field.fieldType === "选择") {
    const options = (field.options ?? [])
      .map((option) => `<option value="${escapeAttribute(option)}">${escapeHtml(option)}</option>`)
      .join("");
    return `<div class="form-field">${label}<select id="${escapeAttribute(id)}" name="${name}">${options}</select></div>`;
  }

  if (field.fieldType === "长文本") {
    return `<div class="form-field">${label}<textarea id="${escapeAttribute(id)}" name="${name}"></textarea></div>`;
  }

  if (field.fieldType === "开关") {
    return `<div class="form-field toggle"><input id="${escapeAttribute(id)}" name="${name}" type="checkbox">${label}</div>`;
  }

  const type = mapInputType(field.fieldType);
  return `<div class="form-field">${label}<input id="${escapeAttribute(id)}" name="${name}" type="${type}"></div>`;
}

function renderMarkdown(value: string): string {
  const mdast = unified().use(remarkParse).use(remarkGfm).parse(value);
  const hast = toHast(mdast);
  return toHtml(hast ?? { type: "root", children: [] });
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

function getSlots(block: MdsBlockNode): SlotNode[] {
  return block.slots ?? block.children.filter((child): child is SlotNode => child.type === "slot");
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

function mapInputType(fieldType: string): string {
  switch (fieldType) {
    case "邮箱":
      return "email";
    case "密码":
      return "password";
    case "数字":
      return "number";
    case "日期":
      return "date";
    case "时间":
      return "time";
    case "文件":
      return "file";
    default:
      return "text";
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replaceAll("'", "&#39;");
}
