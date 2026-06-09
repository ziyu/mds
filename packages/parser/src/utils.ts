import type { Position } from "@mds/ast";

export function getContentStartLine(source: string): number {
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

export function lineRange(startLine: number, endLine: number, startColumn = 1, endColumn = 1): Position {
  return {
    start: {
      line: startLine,
      column: startColumn
    },
    end: {
      line: endLine,
      column: endColumn
    }
  };
}

export function unquoteValue(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function splitArgs(value: string): string[] {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

export function updateFence(activeFence: string | undefined, line: string): string | undefined {
  if (activeFence !== undefined) {
    const fenceClosePattern = new RegExp(`^\\s*${escapeRegExp(activeFence)}{3,}\\s*$`);
    return fenceClosePattern.test(line) ? undefined : activeFence;
  }

  const match = line.match(/^\s*(`{3,}|~{3,})/);
  return match?.[1]?.[0];
}

export function unescapeSpecialSyntax(value: string): string {
  return value
    .replaceAll("\\:::", ":::")
    .replaceAll("\\[", "[")
    .replaceAll("\\!", "!")
    .replaceAll("\\@state", "@state")
    .replaceAll("\\@list", "@list")
    .replaceAll("\\?", "?")
    .replaceAll("\\{{", "{{")
    .replaceAll("\\%%", "%%");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
