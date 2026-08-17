import type { Text } from "@codemirror/state";

export interface MdsBlockLineMatch {
  kind: "container" | "leaf" | "close";
  indentLength: number;
  fence: "::" | ":::";
  type?: string;
  matchedLength: number;
}

export interface MdsContainerAutoCloseInsertion {
  text: string;
  cursorOffset: number;
}

export function matchMdsBlockLine(text: string): MdsBlockLineMatch | undefined {
  const opening = text.match(/^(\s*)(:::|::)\s+([A-Za-z][\w-]*)/);
  if (opening !== null) {
    const fence = opening[2] as "::" | ":::";
    return {
      kind: fence === "::" ? "leaf" : "container",
      indentLength: opening[1]?.length ?? 0,
      fence,
      type: opening[3] ?? "",
      matchedLength: opening[0].length
    };
  }

  const close = text.match(/^(\s*)(:::)\s*$/);
  if (close === null) {
    return undefined;
  }

  return {
    kind: "close",
    indentLength: close[1]?.length ?? 0,
    fence: ":::",
    matchedLength: close[0].length
  };
}

export function isMdsContainerOpeningLine(text: string): boolean {
  return matchMdsBlockLine(text)?.kind === "container";
}

export function isMdsClosingBlockLine(text: string): boolean {
  return matchMdsBlockLine(text)?.kind === "close";
}

export function createMdsContainerAutoCloseInsertion(
  lineText: string,
  cursorColumn: number
): MdsContainerAutoCloseInsertion | undefined {
  if (cursorColumn !== lineText.length || !isMdsContainerOpeningLine(lineText)) {
    return undefined;
  }

  const indent = lineText.match(/^\s*/)?.[0] ?? "";
  return {
    text: `\n${indent}\n${indent}:::`,
    cursorOffset: 1 + indent.length
  };
}

export function isInsideMarkdownCodeFence(document: Text, lineNumber: number): boolean {
  let activeFence: { marker: "`" | "~"; length: number } | undefined;

  for (let currentLineNumber = 1; currentLineNumber < lineNumber; currentLineNumber += 1) {
    const line = document.line(currentLineNumber).text;
    const fence = line.match(/^\s*(`{3,}|~{3,})(.*)$/);
    if (fence === null) {
      continue;
    }

    const token = fence[1] ?? "";
    const marker = token[0] as "`" | "~";
    if (activeFence === undefined) {
      activeFence = { marker, length: token.length };
      continue;
    }

    if (marker === activeFence.marker && token.length >= activeFence.length && (fence[2] ?? "").trim().length === 0) {
      activeFence = undefined;
    }
  }

  return activeFence !== undefined;
}
