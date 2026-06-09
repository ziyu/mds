import { toHtml } from "hast-util-to-html";
import { toHast } from "mdast-util-to-hast";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";

export function renderMarkdown(value: string): string {
  const mdast = unified().use(remarkParse).use(remarkGfm).parse(value);
  const hast = toHast(mdast);
  return toHtml(hast ?? { type: "root", children: [] });
}
