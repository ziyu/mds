import type { HtmlTheme } from "@mds-crate/html-types";
import { escapeAttribute, escapeHtml } from "./escape.js";

export interface HtmlDocumentMetadata {
  title: string;
  lang: string;
  description?: string;
}

export function getDocumentMetadata(
  frontmatter: Record<string, unknown>,
  titleOverride: string | undefined
): HtmlDocumentMetadata {
  return {
    title: titleOverride ?? String(frontmatter.title ?? "MDS Document"),
    lang: String(frontmatter.lang ?? "en"),
    ...(typeof frontmatter.description === "string" ? { description: frontmatter.description } : {})
  };
}

export function renderDocumentShell(input: {
  metadata: HtmlDocumentMetadata;
  theme: HtmlTheme;
  body: string;
  head: string;
  scripts: string;
}): string {
  if (input.theme.shell !== undefined) {
    return input.theme.shell({
      ...input.metadata,
      head: input.head,
      body: input.body,
      scripts: input.scripts
    });
  }

  return [
    "<!doctype html>",
    `<html lang="${escapeAttribute(input.metadata.lang)}">`,
    "<head>",
    '  <meta charset="utf-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1">',
    `  <title>${escapeHtml(input.metadata.title)}</title>`,
    input.head,
    "</head>",
    "<body>",
    input.body,
    input.scripts,
    "</body>",
    "</html>"
  ]
    .filter((line) => line.length > 0)
    .join("\n");
}

export function renderDocumentHead(metadata: HtmlDocumentMetadata, theme: HtmlTheme, includeCss: boolean): string {
  return [
    metadata.description === undefined
      ? ""
      : `  <meta name="description" content="${escapeAttribute(metadata.description)}">`,
    theme.head ?? "",
    includeCss && theme.css !== undefined ? `  <style>${theme.css}</style>` : ""
  ]
    .filter((line) => line.length > 0)
    .join("\n");
}

export function renderThemeScripts(theme: HtmlTheme): string {
  return theme.js === undefined ? "" : `<script>${theme.js}</script>`;
}
