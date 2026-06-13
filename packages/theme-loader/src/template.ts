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
    const namedAttrs = Object.fromEntries(
      Object.keys(block.attrs ?? {}).map((name) => [`__attr:${name}`, getBlockAttr(block, name)])
    );

    return renderTemplate(template, {
      type: context.escapeAttribute(block.blockType),
      name: context.escapeHtml(block.name ?? ""),
      id: context.escapeAttribute(block.id ?? ""),
      attrs: renderAttrs(block, context),
      children,
      slots: renderedSlots,
      summary: context.escapeHtml(block.name ?? "Details"),
      ...namedAttrs,
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
  const attrs: string[] = [];
  if (block.id !== undefined) {
    attrs.push(`id="${context.escapeAttribute(block.id)}"`);
  }

  for (const [name, value] of Object.entries(block.attrs ?? {})) {
    if (!isSafeBlockAttribute(name, value)) {
      continue;
    }
    attrs.push(`data-attr-${context.escapeAttribute(name)}="${context.escapeAttribute(String(value))}"`);
  }

  return attrs.length === 0 ? "" : ` ${attrs.join(" ")}`;
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
    if (key.startsWith("attr:")) {
      return escapeAttribute(getBlockAttrFromValues(values, key.slice("attr:".length)));
    }
    return values[key] ?? "";
  });
}

function getBlockAttrFromValues(values: Record<string, string>, name: string): string {
  const fallbackSeparator = name.indexOf(":");
  if (fallbackSeparator === -1) {
    return values[`__attr:${name}`] ?? "";
  }

  const attrName = name.slice(0, fallbackSeparator);
  const fallback = name.slice(fallbackSeparator + 1);
  const value = values[`__attr:${attrName}`];
  return value === undefined || value === "" ? fallback : value;
}

function getBlockAttr(block: MdsBlockNode, name: string): string {
  const value = block.attrs?.[name];
  return value === undefined || !isSafeBlockAttribute(name, value) ? "" : String(value);
}

function isSafeBlockAttribute(name: string, value: string | number | boolean): boolean {
  if (/^on/i.test(name)) {
    return false;
  }

  return !(typeof value === "string" && value.trim().toLowerCase().startsWith("javascript:"));
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
