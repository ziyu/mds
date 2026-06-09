import matter from "gray-matter";
import type {
  ActionLinkNode,
  Diagnostic,
  DocumentNode,
  FormFieldNode,
  ListDeclarationNode,
  MdsBlockNode,
  MdsNode,
  Position,
  SlotNode,
  StateDeclarationNode
} from "@mds/ast";

export interface ParseOptions {
  filePath?: string;
}

interface ParseContext {
  diagnostics: Diagnostic[];
}

interface ParseResult {
  children: MdsNode[];
  nextIndex: number;
  stoppedBy?: "blockClose" | "slot";
}

interface ParseSpecialResult {
  node?: MdsNode;
  nextIndex: number;
}

interface ParseLineOptions {
  stopAtBlockClose?: boolean;
  stopAtSlot?: boolean;
  allowSlots?: boolean;
}

const blockOpenPattern = /^:::\s+(.+?)\s*$/;
const blockClosePattern = /^:::\s*$/;
const slotPattern = /^---\s+(.+?)\s*$/;
const identifierPattern = /^[A-Za-z][A-Za-z0-9_-]*$/;
const mediaDirectivePattern = /^!(video|audio|embed|model|chart|map|file|download)\s+(.+?)\s*$/;
const stateDeclarationPattern = /^@state\s+([A-Za-z][A-Za-z0-9_.-]*)\s+(.+?)\s*$/;
const listDeclarationPattern = /^@list\s+([A-Za-z][A-Za-z0-9_.-]*)\s*$/;
const formFieldPattern = /^\?\s+([A-Za-z][A-Za-z0-9_-]*)\s+(\S+)\s+(.+?)\s*$/;
const singleLineCommentPattern = /^%%(?!%).*%%\s*$/;
const multilineCommentPattern = /^%%%\s*$/;

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
  options: ParseLineOptions = {}
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
      if (options.stopAtBlockClose && blockClosePattern.test(line)) {
        flushMarkdown(index);
        return {
          children,
          nextIndex: index,
          stoppedBy: "blockClose"
        };
      }

      if (options.stopAtSlot && slotPattern.test(line)) {
        flushMarkdown(index);
        return {
          children,
          nextIndex: index,
          stoppedBy: "slot"
        };
      }

      if (options.allowSlots === true && slotPattern.test(line)) {
        flushMarkdown(index);
        const slot = parseSlot(lines, index, baseLine, context);
        children.push(slot.node);
        index = slot.nextIndex;
        markdownStart = index;
        continue;
      }

      if (blockOpenPattern.test(line)) {
        flushMarkdown(index);
        const block = parseBlock(lines, index, baseLine, context);
        children.push(block.node);
        index = block.nextIndex;
        markdownStart = index;
        continue;
      }

      const special = parseSpecialLine(lines, index, baseLine, context);
      if (special !== undefined) {
        flushMarkdown(index);
        if (special.node !== undefined) {
          children.push(special.node);
        }
        index = special.nextIndex;
        markdownStart = index;
        continue;
      }
    }

    index += 1;
  }

  flushMarkdown(index);

  if (options.stopAtBlockClose === true) {
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

  const inner = parseLines(lines, startIndex + 1, baseLine, context, {
    stopAtBlockClose: true,
    allowSlots: true
  });
  const nextIndex = inner.stoppedBy === "blockClose" ? inner.nextIndex + 1 : inner.nextIndex;
  const endLine = nextIndex > startIndex + 1 ? nextIndex : startIndex + 1;
  const slots = inner.children.filter((node): node is SlotNode => node.type === "slot");
  const node: MdsBlockNode = {
    type: "block",
    blockType,
    children: inner.children,
    position: lineRange(baseLine + startIndex, baseLine + endLine),
    ...(name === undefined ? {} : { name }),
    ...(slots.length === 0 ? {} : { slots })
  };

  return {
    node,
    nextIndex
  };
}

function parseSlot(
  lines: string[],
  startIndex: number,
  baseLine: number,
  context: ParseContext
): { node: SlotNode; nextIndex: number } {
  const name = (lines[startIndex] ?? "").match(slotPattern)?.[1]?.trim() ?? "";
  const inner = parseLines(lines, startIndex + 1, baseLine, context, {
    stopAtBlockClose: true,
    stopAtSlot: true
  });

  return {
    node: {
      type: "slot",
      name,
      children: inner.children,
      position: lineRange(baseLine + startIndex, baseLine + inner.nextIndex)
    },
    nextIndex: inner.nextIndex
  };
}

function parseSpecialLine(
  lines: string[],
  index: number,
  baseLine: number,
  context: ParseContext
): ParseSpecialResult | undefined {
  const line = lines[index] ?? "";
  const trimmed = line.trim();

  if (trimmed.length === 0) {
    return undefined;
  }

  if (singleLineCommentPattern.test(trimmed)) {
    return {
      nextIndex: index + 1
    };
  }

  if (multilineCommentPattern.test(trimmed)) {
    return parseMultilineComment(lines, index, baseLine, context);
  }

  const actionLink = parseActionLink(trimmed, baseLine + index);
  if (actionLink !== undefined) {
    return {
      node: actionLink,
      nextIndex: index + 1
    };
  }

  const media = trimmed.match(mediaDirectivePattern);
  if (media !== null) {
    return {
      node: {
        type: "mediaDirective",
        mediaType: media[1] as never,
        target: media[2] ?? "",
        position: lineRange(baseLine + index, baseLine + index + 1)
      },
      nextIndex: index + 1
    };
  }

  const state = trimmed.match(stateDeclarationPattern);
  if (state !== null) {
    const node: StateDeclarationNode = {
      type: "stateDeclaration",
      name: state[1] ?? "",
      value: unquoteValue(state[2] ?? ""),
      position: lineRange(baseLine + index, baseLine + index + 1)
    };
    return {
      node,
      nextIndex: index + 1
    };
  }

  const list = trimmed.match(listDeclarationPattern);
  if (list !== null) {
    return parseListDeclaration(lines, index, baseLine, list[1] ?? "");
  }

  const formField = trimmed.match(formFieldPattern);
  if (formField !== null) {
    return parseFormField(lines, index, baseLine, formField);
  }

  return undefined;
}

function parseActionLink(trimmed: string, line: number): ActionLinkNode | undefined {
  const command = trimmed.match(/^\[(.+?)\s+!(\S+)(?:\s+(.+?))?\]$/);
  if (command !== null) {
    return {
      type: "actionLink",
      label: command[1] ?? "",
      kind: "command",
      action: command[2] ?? "",
      args: splitArgs(command[3] ?? ""),
      position: lineRange(line, line + 1)
    };
  }

  const navigation = trimmed.match(/^\[(.+?)\s+(->|=>|>>)\s+(.+?)\]$/);
  if (navigation === null) {
    return undefined;
  }

  const operator = navigation[2];
  return {
    type: "actionLink",
    label: navigation[1] ?? "",
    kind: operator === "->" ? "primary" : operator === "=>" ? "secondary" : "external",
    target: navigation[3] ?? "",
    args: [],
    position: lineRange(line, line + 1)
  };
}

function parseMultilineComment(
  lines: string[],
  startIndex: number,
  baseLine: number,
  context: ParseContext
): ParseSpecialResult {
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    if (multilineCommentPattern.test((lines[index] ?? "").trim())) {
      return {
        nextIndex: index + 1
      };
    }
  }

  context.diagnostics.push({
    code: "unclosed-comment",
    message: "MDS multiline comment is missing a closing %%% marker.",
    severity: "error",
    position: lineRange(baseLine + startIndex, baseLine + lines.length)
  });

  return {
    nextIndex: lines.length
  };
}

function parseListDeclaration(
  lines: string[],
  startIndex: number,
  baseLine: number,
  name: string
): ParseSpecialResult {
  const items: string[] = [];
  let index = startIndex + 1;

  while (index < lines.length) {
    const item = (lines[index] ?? "").match(/^\s*-\s+(.+?)\s*$/);
    if (item === null) {
      break;
    }
    items.push(item[1] ?? "");
    index += 1;
  }

  const node: ListDeclarationNode = {
    type: "listDeclaration",
    name,
    items,
    position: lineRange(baseLine + startIndex, baseLine + index)
  };

  return {
    node,
    nextIndex: index
  };
}

function parseFormField(
  lines: string[],
  startIndex: number,
  baseLine: number,
  match: RegExpMatchArray
): ParseSpecialResult {
  const options: string[] = [];
  let index = startIndex + 1;

  while (index < lines.length) {
    const option = (lines[index] ?? "").match(/^\s*-\s+(.+?)\s*$/);
    if (option === null) {
      break;
    }
    options.push(option[1] ?? "");
    index += 1;
  }

  const node: FormFieldNode = {
    type: "formField",
    name: match[1] ?? "",
    fieldType: match[2] ?? "",
    label: match[3] ?? "",
    position: lineRange(baseLine + startIndex, baseLine + index),
    ...(options.length === 0 ? {} : { options })
  };

  return {
    node,
    nextIndex: index
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
    const fenceClosePattern = new RegExp(`^\\s*${escapeRegExp(activeFence)}{3,}\\s*$`);
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

function unquoteValue(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function splitArgs(value: string): string[] {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean);
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
