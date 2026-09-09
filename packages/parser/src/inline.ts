import type { ActionLinkNode, Diagnostic, MarkdownInlineNode, Position } from "@mds-crate/ast";
import { actionNamePattern, nativeActions, pathPattern } from "./patterns.js";
import { lineRange, splitArgs } from "./utils.js";

export interface InlineParseResult {
  inlines: MarkdownInlineNode[];
  diagnostics: Diagnostic[];
}

const inlineTokenPattern =
  /\{\{\s*([^}]+?)\s*\}\}|\[([^\]\n]+?)\s+(->|=>|>>)\s+([^\]\n]+?)\]|\[([^\]\n]+?)\s+!(\S+)(?:\s+([^\]\n]+?))?\]/y;

// Bound failed candidates too: an unclosed run of '[' or '{{' must not
// rescan the remaining document once for every opening delimiter.
function* matchInlineTokens(value: string): Generator<RegExpExecArray> {
  let consumed = 0;
  let blockedBraces = -1;
  let blockedBrackets = -1;
  let bracketClose = -1;
  let newline = -1;
  for (const opening of value.matchAll(/\{\{|\[/g)) {
    const index = opening.index!;
    if (index < consumed) continue;
    if (opening[0] === "{{") {
      if (index <= blockedBraces) continue;
      const close = value.indexOf("}", index + 2);
      if (close === -1 || value[close + 1] !== "}") {
        blockedBraces = close === -1 ? value.length : close;
        continue;
      }
    } else {
      if (index <= blockedBrackets) continue;
      if (bracketClose < index) {
        bracketClose = value.indexOf("]", index + 1);
        if (bracketClose === -1) bracketClose = value.length;
      }
      if (newline < index) {
        newline = value.indexOf("\n", index + 1);
        if (newline === -1) newline = value.length;
      }
      if (bracketClose === value.length) {
        blockedBrackets = value.length;
        continue;
      }
    }
    inlineTokenPattern.lastIndex = index;
    const match = inlineTokenPattern.exec(value);
    if (match) {
      consumed = index + match[0].length;
      yield match;
    } else if (opening[0] === "[") {
      blockedBrackets = Math.min(newline, bracketClose);
    }
  }
}

export function parseMarkdownInlines(value: string, startLine: number): InlineParseResult {
  const inlines: MarkdownInlineNode[] = [];
  const diagnostics: Diagnostic[] = [];
  let lastIndex = 0;
  const positionAt = createPositionCursor(value, startLine);

  for (const match of matchInlineTokens(value)) {
    if (isEscaped(value, match.index ?? 0)) {
      continue;
    }

    const index = match.index ?? 0;
    if (index > lastIndex) {
      inlines.push({
        type: "text",
        value: value.slice(lastIndex, index),
        position: positionAt(lastIndex, index)
      });
    }

    if (match[1] !== undefined) {
      const path = match[1].trim();
      const position = positionAt(index, index + match[0].length);
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
      const actionLink = buildInlineActionLink(match, positionAt(index, index + match[0].length));
      inlines.push(actionLink);
      diagnostics.push(...validateAction(actionLink));
    }

    lastIndex = index + match[0].length;
  }

  if (lastIndex < value.length) {
    inlines.push({
      type: "text",
      value: value.slice(lastIndex),
      position: positionAt(lastIndex, value.length)
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

// Tokens are consumed in source order. Scan each UTF-16 code unit at most once.
function createPositionCursor(value: string, startLine: number) {
  let offset = 0;
  let line = startLine;
  let column = 1;
  const advance = (target: number) => {
    while (offset < target) {
      if (value.charCodeAt(offset++) === 10) {
        line += 1;
        column = 1;
      } else {
        column += 1;
      }
    }
    return { line, column };
  };
  return (startOffset: number, endOffset: number): Position => {
    const start = advance(startOffset);
    const end = advance(endOffset);
    return lineRange(start.line, end.line, start.column, end.column);
  };
}
