import matter from "gray-matter";
import type { Diagnostic, DocumentNode, MdsBlockNode, MdsNode, Position } from "@mds/ast";

export interface ParseOptions {
  filePath?: string;
}

interface ParseContext {
  diagnostics: Diagnostic[];
}

interface ParseResult {
  children: MdsNode[];
  nextIndex: number;
}

const blockOpenPattern = /^:::\s+(.+?)\s*$/;
const blockClosePattern = /^:::\s*$/;
const identifierPattern = /^[A-Za-z][A-Za-z0-9_-]*$/;

export function parseMds(source: string, _options: ParseOptions = {}): DocumentNode {
  const normalizedSource = source.replace(/\r\n?/g, "\n");
  const parsed = matter(normalizedSource);
  const context: ParseContext = {
    diagnostics: []
  };
  const contentStartLine = getContentStartLine(normalizedSource);
  const lines = parsed.content.split("\n");
  const result = parseLines(lines, 0, contentStartLine, context);

  return {
    type: "document",
    frontmatter: parsed.data,
    children: result.children,
    diagnostics: context.diagnostics
  };
}

function parseLines(
  lines: string[],
  startIndex: number,
  baseLine: number,
  context: ParseContext,
  stopAtBlockClose = false
): ParseResult {
  const children: MdsNode[] = [];
  let markdownStart = startIndex;
  let index = startIndex;
  let activeFence: string | undefined;

  const flushMarkdown = (endIndex: number): void => {
    if (markdownStart >= endIndex) {
      return;
    }

    const value = lines.slice(markdownStart, endIndex).join("\n");
    if (value.trim().length === 0) {
      markdownStart = endIndex;
      return;
    }

    children.push({
      type: "markdown",
      value,
      position: lineRange(baseLine + markdownStart, baseLine + endIndex)
    });
    markdownStart = endIndex;
  };

  while (index < lines.length) {
    const line = lines[index] ?? "";
    activeFence = updateFence(activeFence, line);

    if (activeFence === undefined) {
      if (stopAtBlockClose && blockClosePattern.test(line)) {
        flushMarkdown(index);
        return {
          children,
          nextIndex: index + 1
        };
      }

      if (blockOpenPattern.test(line)) {
        flushMarkdown(index);
        const block = parseBlock(lines, index, baseLine, context);
        children.push(block.node);
        index = block.nextIndex;
        markdownStart = index;
        continue;
      }
    }

    index += 1;
  }

  flushMarkdown(index);

  if (stopAtBlockClose) {
    context.diagnostics.push({
      code: "unclosed-block",
      message: "MDS block is missing a closing ::: marker.",
      severity: "error",
      position: lineRange(baseLine + startIndex, baseLine + index)
    });
  }

  return {
    children,
    nextIndex: index
  };
}

function parseBlock(
  lines: string[],
  startIndex: number,
  baseLine: number,
  context: ParseContext
): { node: MdsBlockNode; nextIndex: number } {
  const header = (lines[startIndex] ?? "").match(blockOpenPattern)?.[1]?.trim() ?? "";
  const parts = header.split(/\s+/).filter(Boolean);
  const blockType = parts[0] ?? "";
  const name = parts[1];

  validateBlockHeader(header, parts, startIndex, baseLine, context);

  const inner = parseLines(lines, startIndex + 1, baseLine, context, true);
  const endLine = inner.nextIndex > startIndex + 1 ? inner.nextIndex : startIndex + 1;
  const node: MdsBlockNode = {
    type: "block",
    blockType,
    children: inner.children,
    position: lineRange(baseLine + startIndex, baseLine + endLine),
    ...(name === undefined ? {} : { name })
  };

  return {
    node,
    nextIndex: inner.nextIndex
  };
}

function validateBlockHeader(
  header: string,
  parts: string[],
  startIndex: number,
  baseLine: number,
  context: ParseContext
): void {
  const blockType = parts[0] ?? "";
  const name = parts[1];
  const hasForbiddenAttributes = /[={}]/.test(header) || parts.length > 2;

  if (!identifierPattern.test(blockType)) {
    context.diagnostics.push({
      code: "invalid-block-type",
      message: "MDS block type must be a single word.",
      severity: "error",
      position: lineRange(baseLine + startIndex, baseLine + startIndex + 1)
    });
  }

  if (name !== undefined && !identifierPattern.test(name)) {
    context.diagnostics.push({
      code: "invalid-block-name",
      message: "MDS block name must be a single word.",
      severity: "error",
      position: lineRange(baseLine + startIndex, baseLine + startIndex + 1)
    });
  }

  if (hasForbiddenAttributes) {
    context.diagnostics.push({
      code: "forbidden-block-attributes",
      message: "MDS blocks do not support attributes, key=value pairs, or extra header tokens.",
      severity: "error",
      position: lineRange(baseLine + startIndex, baseLine + startIndex + 1)
    });
  }
}

function updateFence(activeFence: string | undefined, line: string): string | undefined {
  if (activeFence !== undefined) {
    const fenceClosePattern = new RegExp(`^\\s*${escapeRegExp(activeFence)}+\\s*$`);
    return fenceClosePattern.test(line) ? undefined : activeFence;
  }

  const match = line.match(/^\s*(`{3,}|~{3,})/);
  return match?.[1]?.[0];
}

function getContentStartLine(source: string): number {
  if (!source.startsWith("---\n")) {
    return 1;
  }

  const lines = source.split("\n");
  for (let index = 1; index < lines.length; index += 1) {
    if (lines[index] === "---") {
      return index + 2;
    }
  }

  return 1;
}

function lineRange(startLine: number, endLine: number): Position {
  return {
    start: {
      line: startLine,
      column: 1
    },
    end: {
      line: endLine,
      column: 1
    }
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
