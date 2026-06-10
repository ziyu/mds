export interface ParsedFrontmatter {
  data: Record<string, unknown>;
  content: string;
  contentStartLine: number;
}

export function parseFrontmatter(source: string): ParsedFrontmatter {
  const lines = source.split("\n");
  const firstLine = lines[0] ?? "";

  if (firstLine.trim() !== "---") {
    return {
      data: {},
      content: source,
      contentStartLine: 1
    };
  }

  const closeIndex = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (closeIndex === -1) {
    return {
      data: {},
      content: source,
      contentStartLine: 1
    };
  }

  return {
    data: parseFrontmatterData(lines.slice(1, closeIndex)),
    content: lines.slice(closeIndex + 1).join("\n"),
    contentStartLine: closeIndex + 2
  };
}

function parseFrontmatterData(lines: string[]): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf(":");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    if (key.length === 0) {
      continue;
    }

    data[key] = parseScalar(trimmed.slice(separatorIndex + 1).trim());
  }

  return data;
}

function parseScalar(value: string): unknown {
  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  if (value === "null") {
    return null;
  }

  if (/^-?\d+(?:\.\d+)?$/.test(value)) {
    return Number(value);
  }

  return stripQuotes(value);
}

function stripQuotes(value: string): string {
  const first = value.at(0);
  const last = value.at(-1);

  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    return value.slice(1, -1);
  }

  return value;
}
