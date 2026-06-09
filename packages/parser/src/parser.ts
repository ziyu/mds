import matter from "gray-matter";
import type {
  ConditionBlockNode,
  DataBlockNode,
  Diagnostic,
  DocumentNode,
  EachBlockNode,
  FormFieldNode,
  ListDeclarationNode,
  MdsBlockNode,
  MdsNode,
  Position,
  SlotNode,
  StateDeclarationNode
} from "@mds/ast";
import { parseActionLink, parseMarkdownInlines, validateAction } from "./inline.js";
import {
  blockClosePattern,
  blockOpenPattern,
  formFieldPattern,
  identifierPattern,
  listDeclarationPattern,
  mediaDirectivePattern,
  multilineCommentPattern,
  singleLineCommentPattern,
  slotPattern,
  stateDeclarationPattern
} from "./patterns.js";
import {
  getContentStartLine,
  lineRange,
  unescapeSpecialSyntax,
  unquoteValue,
  updateFence
} from "./utils.js";

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

    const rawValue = lines.slice(markdownStart, endIndex).join("\n");
    if (rawValue.trim().length === 0) {
      markdownStart = endIndex;
      return;
    }

    const value = unescapeSpecialSyntax(rawValue);
    const inlineResult = parseMarkdownInlines(value, baseLine + markdownStart);
    context.diagnostics.push(...inlineResult.diagnostics);
    children.push({
      type: "markdown",
      value,
      inlines: inlineResult.inlines,
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

      if (!options.stopAtBlockClose && blockClosePattern.test(line)) {
        flushMarkdown(index);
        context.diagnostics.push({
          code: "unmatched-block-close",
          message: "Found a closing ::: marker without an open MDS block.",
          severity: "error",
          position: lineRange(baseLine + index, baseLine + index + 1)
        });
        index += 1;
        markdownStart = index;
        continue;
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
): { node: MdsNode; nextIndex: number } {
  const header = (lines[startIndex] ?? "").match(blockOpenPattern)?.[1]?.trim() ?? "";
  const parts = header.split(/\s+/).filter(Boolean);
  const blockType = parts[0] ?? "";
  const name = parts[1];

  validateBlockHeader(header, parts, startIndex, baseLine, context);

  if (blockType === "data") {
    return parseDataBlock(lines, startIndex, baseLine, name ?? "", context);
  }

  const inner = parseLines(lines, startIndex + 1, baseLine, context, {
    stopAtBlockClose: true,
    allowSlots: true
  });
  const nextIndex = inner.stoppedBy === "blockClose" ? inner.nextIndex + 1 : inner.nextIndex;
  const endLine = nextIndex > startIndex + 1 ? nextIndex : startIndex + 1;
  const slots = inner.children.filter((node): node is SlotNode => node.type === "slot");
  const position = lineRange(baseLine + startIndex, baseLine + endLine);

  if (blockType === "if" || blockType === "unless") {
    const node: ConditionBlockNode = {
      type: "conditionBlock",
      condition: blockType,
      name: name ?? "",
      children: inner.children,
      position,
      ...(slots.length === 0 ? {} : { slots })
    };
    return {
      node,
      nextIndex
    };
  }

  if (blockType === "each") {
    const node: EachBlockNode = {
      type: "eachBlock",
      listName: name ?? "",
      children: inner.children,
      position,
      ...(slots.length === 0 ? {} : { slots })
    };
    return {
      node,
      nextIndex
    };
  }

  const node: MdsBlockNode = {
    type: "block",
    blockType,
    children: inner.children,
    position,
    ...(name === undefined ? {} : { name }),
    ...(slots.length === 0 ? {} : { slots })
  };

  return {
    node,
    nextIndex
  };
}

function parseDataBlock(
  lines: string[],
  startIndex: number,
  baseLine: number,
  name: string,
  context: ParseContext
): { node: DataBlockNode; nextIndex: number } {
  const contentStart = startIndex + 1;
  let index = contentStart;
  let activeFence: string | undefined;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    activeFence = updateFence(activeFence, line);
    if (activeFence === undefined && blockClosePattern.test(line)) {
      break;
    }
    index += 1;
  }

  const value = lines.slice(contentStart, index).join("\n");
  if (index >= lines.length) {
    context.diagnostics.push({
      code: "unclosed-block",
      message: "MDS data block is missing a closing ::: marker.",
      severity: "error",
      position: lineRange(baseLine + startIndex, baseLine + index)
    });
  }

  return {
    node: {
      type: "dataBlock",
      name,
      value,
      children:
        value.trim().length === 0
          ? []
          : [
              {
                type: "markdown",
                value,
                inlines: [],
                position: lineRange(baseLine + contentStart, baseLine + index)
              }
            ],
      position: lineRange(baseLine + startIndex, baseLine + Math.min(index + 1, lines.length))
    },
    nextIndex: index < lines.length ? index + 1 : index
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

  const actionLink = parseActionLink(trimmed, lineRange(baseLine + index, baseLine + index + 1));
  if (actionLink !== undefined) {
    context.diagnostics.push(...validateAction(actionLink));
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

  if (["if", "unless", "each", "data"].includes(blockType) && name === undefined) {
    context.diagnostics.push({
      code: "missing-block-name",
      message: `${blockType} blocks require a name.`,
      severity: "error",
      position: lineRange(baseLine + startIndex, baseLine + startIndex + 1)
    });
  }
}
