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

const markdownProcessor = unified().use(remarkParse).use(remarkGfm).freeze();

export function renderMarkdown(value: string): string {
  return renderMarkdownResult(value).html;
}

export function renderMarkdownResult(value: string): RenderMarkdownResult {
  const mdast = markdownProcessor.parse(value);
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

export interface MarkdownRenderCache {
  render(value: string): RenderMarkdownResult;
  clear(): void;
  readonly stats: { hits: number; misses: number; entries: number; size: number };
}

/** Cache only pure, sanitized Markdown output. Positions and diagnostics stay per render.
 * Size counts UTF-16 units of keys, HTML and unsafe URL records, not heap bytes.
 */
export function createMarkdownRenderCache(maxSize = 2_000_000, maxEntries = 512): MarkdownRenderCache {
  if (!Number.isSafeInteger(maxSize) || maxSize < 0 || !Number.isSafeInteger(maxEntries) || maxEntries < 0) {
    throw new RangeError("Markdown cache limits must be non-negative safe integers.");
  }
  const entries = new Map<string, { result: RenderMarkdownResult; size: number }>();
  let size = 0;
  let hits = 0;
  let misses = 0;
  return {
    get stats() { return { hits, misses, entries: entries.size, size }; },
    clear() { entries.clear(); size = hits = misses = 0; },
    render(value) {
      const cached = entries.get(value);
      if (cached) {
        hits += 1;
        entries.delete(value);
        entries.set(value, cached);
        return cached.result;
      }
      misses += 1;
      const result = renderMarkdownResult(value);
      result.unsafeUrls.forEach(Object.freeze);
      Object.freeze(result.unsafeUrls);
      Object.freeze(result);
      const cost = value.length + result.html.length + result.unsafeUrls.reduce((sum, url) => sum + url.value.length + url.purpose.length, 0);
      if (cost <= maxSize && maxEntries > 0) {
        while (entries.size && (size + cost > maxSize || entries.size >= maxEntries)) {
          const key = entries.keys().next().value!;
          size -= entries.get(key)!.size;
          entries.delete(key);
        }
        entries.set(value, { result, size: cost });
        size += cost;
      }
      return result;
    }
  };
}
