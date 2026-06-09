import type { DocumentNode } from "@mds/ast";

export interface ParseOptions {
  filePath?: string;
}

export function parseMds(source: string, _options: ParseOptions = {}): DocumentNode {
  return {
    type: "document",
    frontmatter: {},
    children: [
      {
        type: "markdown",
        value: source
      }
    ],
    diagnostics: []
  };
}
