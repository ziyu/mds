import type { MdsBlockNode } from "@mds-crate/ast";
import type { HtmlBlockRenderer, HtmlRenderContext } from "@mds-crate/html-types";

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
  return template.replace(/\{\{\s*([^{}]*?\S)\s*\}\}/g, (_match, rawKey: string) => {
    const key = rawKey.trim();
    if (key.startsWith("attr:")) {
      const declaration = key.slice("attr:".length);
      const separator = declaration.indexOf(":");
      const name = separator === -1 ? declaration : declaration.slice(0, separator);
      return isSafeNativeAttributeName(name)
        ? escapeAttribute(getBlockAttrFromValues(values, declaration))
        : "";
    }
    if (key.startsWith("bool:")) {
      return renderBooleanAttribute(values, key.slice("bool:".length));
    }
    if (key.startsWith("optional:")) {
      return renderOptionalAttribute(values, key.slice("optional:".length));
    }
    return /^[A-Za-z][A-Za-z0-9_:-]*$/.test(key) ? values[key] ?? "" : "";
  });
}

function renderBooleanAttribute(values: Record<string, string>, name: string): string {
  if (!isSafeNativeAttributeName(name)) {
    return "";
  }

  const value = values[`__attr:${name}`];
  return isTruthyAttributeValue(value) ? ` ${name}` : "";
}

function renderOptionalAttribute(values: Record<string, string>, declaration: string): string {
  const separator = declaration.indexOf(":");
  if (separator === -1) {
    return "";
  }

  const sourceName = declaration.slice(0, separator);
  const outputName = declaration.slice(separator + 1);
  if (!isSafeNativeAttributeName(outputName)) {
    return "";
  }

  const value = values[`__attr:${sourceName}`];
  return value === undefined || value === "" ? "" : ` ${outputName}="${escapeAttribute(value)}"`;
}

function isTruthyAttributeValue(value: string | undefined): boolean {
  if (value === undefined || value === "") {
    return false;
  }

  return !["false", "0", "off", "no"].includes(value.trim().toLowerCase());
}

function isSafeNativeAttributeName(name: string): boolean {
  return /^[A-Za-z][A-Za-z0-9-]*$/.test(name) && !/^on/i.test(name);
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
  if (/^on/i.test(name) && name.toLowerCase() !== "once") {
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
