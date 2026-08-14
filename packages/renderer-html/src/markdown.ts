import { toHtml } from "hast-util-to-html";
import { toHast } from "mdast-util-to-hast";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { sanitizeUrl, type UrlPurpose } from "./url.js";

export interface UnsafeMarkdownUrl {
  value: string;
  purpose: UrlPurpose;
}

export interface RenderMarkdownResult {
  html: string;
  unsafeUrls: UnsafeMarkdownUrl[];
}

interface HastNode {
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

export function renderMarkdown(value: string): string {
  return renderMarkdownResult(value).html;
}

export function renderMarkdownResult(value: string): RenderMarkdownResult {
  const mdast = unified().use(remarkParse).use(remarkGfm).parse(value);
  const hast = toHast(mdast) ?? { type: "root", children: [] };
  const unsafeUrls: UnsafeMarkdownUrl[] = [];
  sanitizeHastUrls(hast as unknown as HastNode, unsafeUrls);

  return {
    html: toHtml(hast),
    unsafeUrls
  };
}

function sanitizeHastUrls(node: HastNode, unsafeUrls: UnsafeMarkdownUrl[]): void {
  if (node.tagName === "a") {
    sanitizeProperty(node, "href", "navigation", "#", unsafeUrls);
  } else if (node.tagName === "img") {
    sanitizeProperty(node, "src", "media", undefined, unsafeUrls);
  }

  for (const child of node.children ?? []) {
    sanitizeHastUrls(child, unsafeUrls);
  }
}

function sanitizeProperty(
  node: HastNode,
  property: string,
  purpose: UrlPurpose,
  fallback: string | undefined,
  unsafeUrls: UnsafeMarkdownUrl[]
): void {
  const value = node.properties?.[property];
  if (typeof value !== "string" || sanitizeUrl(value, purpose) !== undefined) {
    return;
  }

  unsafeUrls.push({ value, purpose });
  if (fallback === undefined) {
    delete node.properties?.[property];
  } else if (node.properties !== undefined) {
    node.properties[property] = fallback;
  }
}
