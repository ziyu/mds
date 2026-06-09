import type {
  ActionLinkNode,
  DocumentNode,
  FormFieldNode,
  ListDeclarationNode,
  MdsBlockNode,
  MdsNode,
  SlotNode,
  StateDeclarationNode
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
}

interface RenderContext {
  states: Map<string, string>;
  lists: Map<string, string[]>;
  locals: Map<string, string>;
}

export function renderHtml(document: DocumentNode, options: RenderHtmlOptions = {}): string {
  const title = options.title ?? String(document.frontmatter.title ?? "MDS Document");
  const lang = String(document.frontmatter.lang ?? "en");
  const description =
    typeof document.frontmatter.description === "string" ? document.frontmatter.description : undefined;
  const context: RenderContext = {
    states: collectStates(document.children),
    lists: collectLists(document.children),
    locals: new Map()
  };
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
    case "markdown":
      return renderMarkdown(interpolate(node.value, context));
    case "block":
      return renderBlock(node, context);
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
  const id = block.name === undefined ? "" : ` id="${escapeAttribute(block.name)}"`;
  const className = escapeAttribute(block.blockType);
  const children = block.children.filter((child) => child.type !== "slot");
  const slots = getSlots(block);

  switch (block.blockType) {
    case "page":
      return `<main${id} class="page">${renderChildren(children, context)}</main>`;
    case "section":
    case "hero":
    case "scene":
    case "reveal":
    case "float":
    case "sticky":
    case "motion":
      return `<section${id} class="${className}">${renderChildren(children, context)}</section>`;
    case "aside":
      return `<aside${id} class="aside">${renderChildren(children, context)}</aside>`;
    case "footer":
      return `<footer${id} class="footer">${renderChildren(children, context)}</footer>`;
    case "note":
    case "info":
    case "warning":
    case "danger":
    case "success":
      return `<aside${id} class="callout ${className}" role="note">${renderChildren(children, context)}</aside>`;
    case "quote":
      return `<blockquote${id} class="quote">${renderChildren(children, context)}</blockquote>`;
    case "card":
      return `<article${id} class="card">${renderChildren(children, context)}</article>`;
    case "cards":
      return `<div${id} class="cards">${renderChildren(children, context)}</div>`;
    case "details":
      return `<details${id} class="details"><summary>${escapeHtml(block.name ?? "Details")}</summary>${renderChildren(children, context)}</details>`;
    case "tabs":
      return renderTabs(block, slots, context);
    case "accordion":
      return renderAccordion(block, slots, context);
    case "carousel":
      return renderSlottedContainer(block, slots, "carousel", context);
    case "dialog":
      return `<section${id} class="dialog" role="dialog" aria-modal="true">${renderChildren(children, context)}</section>`;
    case "drawer":
      return `<aside${id} class="drawer">${renderChildren(children, context)}</aside>`;
    case "split":
    case "grid":
    case "grid-2":
    case "grid-3":
    case "grid-auto":
      return renderSlottedContainer(block, slots, className, context);
    case "form":
      return `<form${id} class="form" method="post">${renderChildren(children, context)}</form>`;
    case "if":
      return isTruthy(resolveValue(block.name ?? "", context)) ? renderChildren(children, context) : "";
    case "unless":
      return isTruthy(resolveValue(block.name ?? "", context)) ? "" : renderChildren(children, context);
    case "each":
      return renderEach(block, children, context);
    case "data":
      return renderDataBlock(block, children);
    default:
      return `<section${id} class="block ${className}" data-block="${escapeAttribute(block.blockType)}">${renderChildren(children, context)}</section>`;
  }
}

function renderTabs(block: MdsBlockNode, slots: SlotNode[], context: RenderContext): string {
  if (slots.length === 0) {
    return renderSlottedContainer(block, slots, "tabs", context);
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
      return `<section id="${escapeAttribute(id)}" class="tab-panel"><h2>${escapeHtml(slot.name)}</h2>${renderChildren(slot.children, context)}</section>`;
    })
    .join("\n");

  return `<section class="tabs"><nav class="tab-list">${nav}</nav>${panels}</section>`;
}

function renderAccordion(block: MdsBlockNode, slots: SlotNode[], context: RenderContext): string {
  if (slots.length === 0) {
    return renderSlottedContainer(block, slots, "accordion", context);
  }

  const items = slots
    .map(
      (slot) =>
        `<details class="accordion-item"><summary>${escapeHtml(slot.name)}</summary>${renderChildren(slot.children, context)}</details>`
    )
    .join("\n");

  return `<section class="accordion">${items}</section>`;
}

function renderSlottedContainer(
  block: MdsBlockNode,
  slots: SlotNode[],
  className: string,
  context: RenderContext
): string {
  const id = block.name === undefined ? "" : ` id="${escapeAttribute(block.name)}"`;

  if (slots.length === 0) {
    const children = block.children.filter((child) => child.type !== "slot");
    return `<section${id} class="${className}">${renderChildren(children, context)}</section>`;
  }

  const renderedSlots = slots
    .map(
      (slot) =>
        `<section class="${className}-item" data-slot="${escapeAttribute(slot.name)}">${renderChildren(slot.children, context)}</section>`
    )
    .join("\n");

  return `<section${id} class="${className}">${renderedSlots}</section>`;
}

function renderEach(block: MdsBlockNode, children: MdsNode[], context: RenderContext): string {
  const listName = block.name ?? "";
  const items = context.lists.get(listName) ?? [];

  return items
    .map((item) => {
      const locals = new Map(context.locals);
      locals.set("item", item);
      return renderChildren(children, {
        ...context,
        locals
      });
    })
    .join("\n");
}

function renderDataBlock(block: MdsBlockNode, children: MdsNode[]): string {
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
    } else if (child.type === "block" || child.type === "slot" || child.type === "document") {
      collectStates(child.children, states);
    }
  }

  return states;
}

function collectLists(children: MdsNode[], lists = new Map<string, string[]>()): Map<string, string[]> {
  for (const child of children) {
    if (child.type === "listDeclaration") {
      lists.set(child.name, child.items);
    } else if (child.type === "block" || child.type === "slot" || child.type === "document") {
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
