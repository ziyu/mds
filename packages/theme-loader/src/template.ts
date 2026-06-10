import type { MdsBlockNode } from "@mds/ast";
import type { HtmlBlockRenderer, HtmlRenderContext } from "@mds/html-types";

export function createTemplateBlockRenderer(template: string): HtmlBlockRenderer {
  return (block, context) => {
    const children = context.renderChildren(context.getContentChildren(block));
    const slotNodes = context.getSlots(block);
    const renderedSlots = renderSlots(block, slotNodes, context);
    const namedSlots = Object.fromEntries(
      slotNodes.map((slot) => [`slot:${slot.name}`, context.renderChildren(slot.children)])
    );

    return renderTemplate(template, {
      type: context.escapeAttribute(block.blockType),
      name: context.escapeHtml(block.name ?? ""),
      id: context.escapeAttribute(block.name ?? ""),
      attrs: renderAttrs(block, context),
      children,
      slots: renderedSlots,
      summary: context.escapeHtml(block.name ?? "Details"),
      ...namedSlots
    });
  };
}

export function renderShellTemplate(
  template: string,
  input: {
    title: string;
    lang: string;
    description?: string;
    head: string;
    body: string;
    scripts: string;
  }
): string {
  return renderTemplate(template, {
    title: escapeHtml(input.title),
    lang: escapeAttribute(input.lang),
    description: escapeHtml(input.description ?? ""),
    head: input.head,
    body: input.body,
    scripts: input.scripts
  });
}

function renderAttrs(block: MdsBlockNode, context: HtmlRenderContext): string {
  return block.name === undefined ? "" : ` id="${context.escapeAttribute(block.name)}"`;
}

function renderSlots(
  block: MdsBlockNode,
  slots: ReturnType<HtmlRenderContext["getSlots"]>,
  context: HtmlRenderContext
): string {
  return slots
    .map(
      (slot) =>
        `<section class="${context.escapeAttribute(block.blockType)}-item" data-slot="${context.escapeAttribute(slot.name)}">${context.renderChildren(slot.children)}</section>`
    )
    .join("\n");
}

function renderTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{\s*([A-Za-z][A-Za-z0-9_:-]*)\s*\}\}/g, (_match, key: string) => {
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
