import type { ActionLinkNode, Diagnostic, MarkdownInlineNode, Position } from "@mds/ast";
import { actionNamePattern, nativeActions, pathPattern } from "./patterns.js";
import { lineRange, splitArgs } from "./utils.js";

export interface InlineParseResult {
  inlines: MarkdownInlineNode[];
  diagnostics: Diagnostic[];
}

const inlineTokenPattern =
  /\{\{\s*([^}]+?)\s*\}\}|\[([^\]\n]+?)\s+(->|=>|>>)\s+([^\]\n]+?)\]|\[([^\]\n]+?)\s+!(\S+)(?:\s+([^\]\n]+?))?\]/g;

export function parseMarkdownInlines(value: string, startLine: number): InlineParseResult {
  const inlines: MarkdownInlineNode[] = [];
  const diagnostics: Diagnostic[] = [];
  let lastIndex = 0;

  for (const match of value.matchAll(inlineTokenPattern)) {
    if (isEscaped(value, match.index ?? 0)) {
      continue;
    }

    const index = match.index ?? 0;
    if (index > lastIndex) {
      inlines.push({
        type: "text",
        value: value.slice(lastIndex, index),
        position: offsetPosition(value, startLine, lastIndex, index)
      });
    }

    if (match[1] !== undefined) {
      const path = match[1].trim();
      const position = offsetPosition(value, startLine, index, index + match[0].length);
      if (!pathPattern.test(path)) {
        diagnostics.push({
          code: "invalid-interpolation",
          message: "MDS interpolation only supports simple names or dot paths.",
          severity: "error",
          position
        });
      }
      inlines.push({
        type: "interpolation",
        path,
        position
      });
    } else {
      const actionLink = buildInlineActionLink(match, offsetPosition(value, startLine, index, index + match[0].length));
      inlines.push(actionLink);
      diagnostics.push(...validateAction(actionLink));
    }

    lastIndex = index + match[0].length;
  }

  if (lastIndex < value.length) {
    inlines.push({
      type: "text",
      value: value.slice(lastIndex),
      position: offsetPosition(value, startLine, lastIndex, value.length)
    });
  }

  return {
    inlines,
    diagnostics
  };
}

export function parseActionLink(trimmed: string, position: Position): ActionLinkNode | undefined {
  const command = trimmed.match(/^\[(.+?)\s+!(\S+)(?:\s+(.+?))?\]$/);
  if (command !== null) {
    return {
      type: "actionLink",
      label: command[1] ?? "",
      kind: "command",
      action: command[2] ?? "",
      args: splitArgs(command[3] ?? ""),
      position
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
    position
  };
}

export function validateAction(link: ActionLinkNode): Diagnostic[] {
  if (link.kind !== "command") {
    return [];
  }

  const action = link.action ?? "";
  const diagnostics: Diagnostic[] = [];

  if (!actionNamePattern.test(action)) {
    diagnostics.push({
      code: "invalid-action-name",
      message: `Invalid MDS action name: ${action}.`,
      severity: "error",
      ...(link.position === undefined ? {} : { position: link.position })
    });
    return diagnostics;
  }

  const argCount = link.args.length;
  if (nativeActions.has(action) && argCount !== 1) {
    diagnostics.push(invalidActionArgs(link, "Native form actions expect exactly one form id argument."));
  }

  return diagnostics;
}

function buildInlineActionLink(match: RegExpMatchArray, position: Position): ActionLinkNode {
  if (match[3] !== undefined) {
    return {
      type: "actionLink",
      label: match[2] ?? "",
      kind: match[3] === "->" ? "primary" : match[3] === "=>" ? "secondary" : "external",
      target: match[4] ?? "",
      args: [],
      position
    };
  }

  return {
    type: "actionLink",
    label: match[5] ?? "",
    kind: "command",
    action: match[6] ?? "",
    args: splitArgs(match[7] ?? ""),
    position
  };
}

function invalidActionArgs(link: ActionLinkNode, message: string): Diagnostic {
  return {
    code: "invalid-action-args",
    message,
    severity: "error",
    ...(link.position === undefined ? {} : { position: link.position })
  };
}

function isEscaped(value: string, index: number): boolean {
  let slashCount = 0;
  for (let cursor = index - 1; cursor >= 0 && value[cursor] === "\\"; cursor -= 1) {
    slashCount += 1;
  }
  return slashCount % 2 === 1;
}

function offsetPosition(value: string, startLine: number, startOffset: number, endOffset: number): Position {
  const start = offsetToLineColumn(value, startLine, startOffset);
  const end = offsetToLineColumn(value, startLine, endOffset);
  return lineRange(start.line, end.line, start.column, end.column);
}

function offsetToLineColumn(value: string, startLine: number, offset: number): { line: number; column: number } {
  const before = value.slice(0, offset);
  const lines = before.split("\n");
  return {
    line: startLine + lines.length - 1,
    column: (lines.at(-1)?.length ?? 0) + 1
  };
}
