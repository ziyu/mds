import type { HtmlBlockRenderers, HtmlRenderContext, HtmlTheme } from "@mds/html-types";

export interface ThemeDefaultOptions {
  includeCss?: boolean;
}

export const defaultThemeName = "default";

export const defaultThemeCss = `
:root {
  color-scheme: light dark;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.page {
  max-width: 72rem;
  margin: 0 auto;
  padding: 2rem;
}
`;

export const defaultBlockRenderers: HtmlBlockRenderers = {
  page: (block, context) =>
    `<main${renderId(block, context)} class="page">${context.renderChildren(context.getContentChildren(block))}</main>`,
  section: renderSectionLikeBlock,
  hero: renderSectionLikeBlock,
  scene: renderSectionLikeBlock,
  reveal: renderSectionLikeBlock,
  float: renderSectionLikeBlock,
  sticky: renderSectionLikeBlock,
  motion: renderSectionLikeBlock,
  aside: (block, context) =>
    `<aside${renderId(block, context)} class="aside">${context.renderChildren(context.getContentChildren(block))}</aside>`,
  footer: (block, context) =>
    `<footer${renderId(block, context)} class="footer">${context.renderChildren(context.getContentChildren(block))}</footer>`,
  note: renderCalloutBlock,
  info: renderCalloutBlock,
  warning: renderCalloutBlock,
  danger: renderCalloutBlock,
  success: renderCalloutBlock,
  quote: (block, context) =>
    `<blockquote${renderId(block, context)} class="quote">${context.renderChildren(context.getContentChildren(block))}</blockquote>`,
  card: (block, context) =>
    `<article${renderId(block, context)} class="card">${context.renderChildren(context.getContentChildren(block))}</article>`,
  cards: (block, context) =>
    `<div${renderId(block, context)} class="cards">${context.renderChildren(context.getContentChildren(block))}</div>`,
  details: (block, context) =>
    `<details${renderId(block, context)} class="details"><summary>${context.escapeHtml(block.name ?? "Details")}</summary>${context.renderChildren(context.getContentChildren(block))}</details>`,
  tabs: renderTabs,
  accordion: renderAccordion,
  carousel: (block, context) => context.renderSlottedContainer(block, context.getSlots(block), "carousel"),
  dialog: (block, context) =>
    `<section${renderId(block, context)} class="dialog" role="dialog" aria-modal="true">${context.renderChildren(context.getContentChildren(block))}</section>`,
  drawer: (block, context) =>
    `<aside${renderId(block, context)} class="drawer">${context.renderChildren(context.getContentChildren(block))}</aside>`,
  split: renderSlottedLayoutBlock,
  grid: renderSlottedLayoutBlock,
  "grid-2": renderSlottedLayoutBlock,
  "grid-3": renderSlottedLayoutBlock,
  "grid-auto": renderSlottedLayoutBlock,
  form: (block, context) =>
    `<form${renderId(block, context)} class="form" method="post">${context.renderChildren(context.getContentChildren(block))}</form>`
};

export const defaultTheme: HtmlTheme = {
  name: defaultThemeName,
  css: defaultThemeCss,
  blockRenderers: defaultBlockRenderers
};

function renderSectionLikeBlock(
  block: Parameters<NonNullable<HtmlBlockRenderers["section"]>>[0],
  context: HtmlRenderContext
): string {
  return `<section${renderId(block, context)} class="${context.escapeAttribute(block.blockType)}">${context.renderChildren(context.getContentChildren(block))}</section>`;
}

function renderCalloutBlock(
  block: Parameters<NonNullable<HtmlBlockRenderers["warning"]>>[0],
  context: HtmlRenderContext
): string {
  return `<aside${renderId(block, context)} class="callout ${context.escapeAttribute(block.blockType)}" role="note">${context.renderChildren(context.getContentChildren(block))}</aside>`;
}

function renderSlottedLayoutBlock(
  block: Parameters<NonNullable<HtmlBlockRenderers["grid"]>>[0],
  context: HtmlRenderContext
): string {
  return context.renderSlottedContainer(block, context.getSlots(block), context.escapeAttribute(block.blockType));
}

function renderTabs(
  block: Parameters<NonNullable<HtmlBlockRenderers["tabs"]>>[0],
  context: HtmlRenderContext
): string {
  const slots = context.getSlots(block);

  if (slots.length === 0) {
    return context.renderSlottedContainer(block, slots, "tabs");
  }

  const baseId = block.name ?? "tabs";
  const nav = slots
    .map((slot, index) => {
      const id = `${baseId}-${index + 1}`;
      return `<a href="#${context.escapeAttribute(id)}">${context.escapeHtml(slot.name)}</a>`;
    })
    .join("");
  const panels = slots
    .map((slot, index) => {
      const id = `${baseId}-${index + 1}`;
      return `<section id="${context.escapeAttribute(id)}" class="tab-panel"><h2>${context.escapeHtml(slot.name)}</h2>${context.renderChildren(slot.children)}</section>`;
    })
    .join("\n");

  return `<section class="tabs"><nav class="tab-list">${nav}</nav>${panels}</section>`;
}

function renderAccordion(
  block: Parameters<NonNullable<HtmlBlockRenderers["accordion"]>>[0],
  context: HtmlRenderContext
): string {
  const slots = context.getSlots(block);

  if (slots.length === 0) {
    return context.renderSlottedContainer(block, slots, "accordion");
  }

  const items = slots
    .map(
      (slot) =>
        `<details class="accordion-item"><summary>${context.escapeHtml(slot.name)}</summary>${context.renderChildren(slot.children)}</details>`
    )
    .join("\n");

  return `<section class="accordion">${items}</section>`;
}

function renderId(
  block: Parameters<NonNullable<HtmlBlockRenderers["section"]>>[0],
  context: HtmlRenderContext
): string {
  return block.name === undefined ? "" : ` id="${context.escapeAttribute(block.name)}"`;
}
