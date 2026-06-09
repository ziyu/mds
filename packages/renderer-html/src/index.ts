import type { DocumentNode } from "@mds/ast";

export interface RenderHtmlOptions {
  title?: string;
}

export function renderHtml(document: DocumentNode, options: RenderHtmlOptions = {}): string {
  const title = options.title ?? String(document.frontmatter.title ?? "MDS Document");

  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '  <meta charset="utf-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1">',
    `  <title>${escapeHtml(title)}</title>`,
    "</head>",
    "<body>",
    '  <main class="mds-page">',
    "  </main>",
    "</body>",
    "</html>"
  ].join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
