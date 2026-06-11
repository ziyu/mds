import type { ActionLinkNode, FormFieldNode, MdsBlockNode, MdsNode, SlotNode } from "@mds/ast";
import type { HtmlBlockRenderers, HtmlRenderContext } from "@mds/html-types";
import { escapeAttribute, escapeHtml } from "./escape.js";

export const baseBlockRenderers: HtmlBlockRenderers = {
  page: (block, context) =>
    `<main${renderId(block)} class="page">${context.renderChildren(context.getContentChildren(block))}</main>`,
  section: renderSectionLikeBlock,
  hero: renderSectionLikeBlock,
  scene: renderSectionLikeBlock,
  reveal: renderSectionLikeBlock,
  float: renderSectionLikeBlock,
  sticky: renderSectionLikeBlock,
  motion: renderSectionLikeBlock,
  aside: (block, context) =>
    `<aside${renderId(block)} class="aside">${context.renderChildren(context.getContentChildren(block))}</aside>`,
  footer: (block, context) =>
    `<footer${renderId(block)} class="footer">${context.renderChildren(context.getContentChildren(block))}</footer>`,
  nav: (block, context) =>
    `<nav${renderId(block)} class="nav" aria-label="${escapeAttribute(block.name ?? "Navigation")}">${context.renderChildren(context.getContentChildren(block))}</nav>`,
  note: renderCalloutBlock,
  info: renderCalloutBlock,
  warning: renderCalloutBlock,
  danger: renderCalloutBlock,
  success: renderCalloutBlock,
  quote: (block, context) =>
    `<blockquote${renderId(block)} class="quote">${context.renderChildren(context.getContentChildren(block))}</blockquote>`,
  card: (block, context) =>
    `<article${renderId(block)} class="card">${context.renderChildren(context.getContentChildren(block))}</article>`,
  cards: (block, context) =>
    `<section${renderId(block)} class="cards">${context.renderChildren(context.getContentChildren(block))}</section>`,
  details: (block, context) =>
    `<details${renderId(block)} class="details"><summary>${context.escapeHtml(block.name ?? "Details")}</summary>${context.renderChildren(context.getContentChildren(block))}</details>`,
  tabs: (block, context) => renderSlottedContainer(block, context.getSlots(block), "tabs", context),
  accordion: (block, context) => renderSlottedContainer(block, context.getSlots(block), "accordion", context),
  carousel: (block, context) => renderSlottedContainer(block, context.getSlots(block), "carousel", context),
  split: renderSlottedLayoutBlock,
  grid: renderSlottedLayoutBlock,
  "grid-2": renderSlottedLayoutBlock,
  "grid-3": renderSlottedLayoutBlock,
  "grid-auto": renderSlottedLayoutBlock,
  dialog: (block, context) =>
    `<section${renderId(block)} class="dialog" role="dialog" aria-modal="true">${context.renderChildren(context.getContentChildren(block))}</section>`,
  drawer: (block, context) =>
    `<aside${renderId(block)} class="drawer">${context.renderChildren(context.getContentChildren(block))}</aside>`,
  form: (block, context) =>
    `<form${renderId(block)} class="form" method="post">${context.renderChildren(context.getContentChildren(block))}</form>`
};

export function renderFallbackBlock(block: MdsBlockNode, context: HtmlRenderContext): string {
  return `<section${renderId(block)} class="block ${context.escapeAttribute(block.blockType)}" data-block="${context.escapeAttribute(block.blockType)}">${context.renderChildren(getContentChildren(block))}</section>`;
}

export function renderDataNode(block: { name: string; value: string }, context: HtmlRenderContext): string {
  return `<script type="application/json" data-data="${context.escapeAttribute(block.name)}">${context.escapeHtml(block.value)}</script>`;
}

export function renderSlot(slot: SlotNode, context: HtmlRenderContext): string {
  return `<section class="slot" data-slot="${escapeAttribute(slot.name)}">${context.renderChildren(slot.children)}</section>`;
}

export interface RenderActionLinkOptions {
  missingHandler?: boolean;
  navigationContext?: boolean;
}

export function renderActionLink(link: ActionLinkNode, options: RenderActionLinkOptions = {}): string {
  const label = escapeHtml(link.label);

  if (link.kind === "command") {
    const action = link.action ?? "";
    const type = action === "submit" ? "submit" : action === "reset" ? "reset" : "button";
    const target = link.args[0];
    const form = (action === "submit" || action === "reset") && target !== undefined ? ` form="${escapeAttribute(target)}"` : "";
    const args = link.args.length === 0 ? "" : ` data-args="${escapeAttribute(JSON.stringify(link.args))}"`;
    const missing = options.missingHandler === true ? ' data-action-missing="true"' : "";

    return `<button type="${type}" class="action command" data-action="${escapeAttribute(action)}"${args}${missing}${
      target === undefined ? "" : ` data-target="${escapeAttribute(target)}"`
    }${form}>${label}</button>`;
  }

  const href = link.target ?? "#";
  const rel = link.kind === "external" ? ' rel="noopener noreferrer"' : "";
  const target = link.kind === "external" ? ' target="_blank"' : "";
  const blockTarget = options.navigationContext === true ? getBlockNavigationTarget(href) : undefined;

  if (blockTarget !== undefined) {
    return `<a class="action ${link.kind} block-link" href="${escapeAttribute(href)}" data-nav-target="${escapeAttribute(
      blockTarget
    )}"><span class="action-label">${label}</span><span class="nav-target">#${escapeHtml(
      blockTarget
    )}</span></a>`;
  }

  return `<a class="action ${link.kind}" href="${escapeAttribute(href)}"${rel}${target}>${label}</a>`;
}

export function renderMediaDirective(mediaType: string, target: string): string {
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

export function renderFormField(field: FormFieldNode): string {
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

export function getSlots(block: MdsBlockNode): SlotNode[] {
  return block.slots ?? block.children.filter((child): child is SlotNode => child.type === "slot");
}

export function getContentChildren(block: MdsBlockNode): MdsNode[] {
  return block.children.filter((child) => child.type !== "slot");
}

export function renderSlottedContainer(
  block: MdsBlockNode,
  slots: SlotNode[],
  className: string,
  context: HtmlRenderContext
): string {
  const id = renderId(block);

  if (slots.length === 0) {
    return `<section${id} class="${className}">${context.renderChildren(getContentChildren(block))}</section>`;
  }

  const renderedSlots = slots
    .map(
      (slot) =>
        `<section class="${className}-item" data-slot="${escapeAttribute(slot.name)}">${context.renderChildren(slot.children)}</section>`
    )
    .join("\n");

  return `<section${id} class="${className}">${renderedSlots}</section>`;
}

function renderSectionLikeBlock(block: MdsBlockNode, context: HtmlRenderContext): string {
  return `<section${renderId(block)} class="${context.escapeAttribute(block.blockType)}">${context.renderChildren(context.getContentChildren(block))}</section>`;
}

function renderCalloutBlock(block: MdsBlockNode, context: HtmlRenderContext): string {
  return `<aside${renderId(block)} class="callout ${context.escapeAttribute(block.blockType)}" role="note">${context.renderChildren(context.getContentChildren(block))}</aside>`;
}

function renderSlottedLayoutBlock(block: MdsBlockNode, context: HtmlRenderContext): string {
  return renderSlottedContainer(block, context.getSlots(block), context.escapeAttribute(block.blockType), context);
}

function renderId(block: MdsBlockNode): string {
  return block.name === undefined ? "" : ` id="${escapeAttribute(block.name)}"`;
}

function getBlockNavigationTarget(href: string): string | undefined {
  if (!href.startsWith("#") || href.length <= 1) {
    return undefined;
  }

  return href.slice(1);
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
