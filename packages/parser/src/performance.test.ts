import { describe, expect, it } from "vitest";
import { parseMarkdownInlines } from "./inline.js";
import { parseMds } from "./index.js";

describe("bounded linear parsing", () => {
  it("preserves UTF-16 positions across Unicode, newlines, escapes and invalid tokens", () => {
    const value = '中文😀 {{ user }}\n\\{{ escaped }} [go -> /x]\n{{ bad + path }} tail';
    const result = parseMarkdownInlines(value, 7);
    let offset = 0;
    for (const node of result.inlines) {
      const start = node.position!.start;
      const end = node.position!.end;
      const point = (n: number) => {
        const lines = value.slice(0, n).split('\n');
        return { line: 7 + lines.length - 1, column: lines.at(-1)!.length + 1 };
      };
      expect(start).toEqual(point(offset));
      const endOffset = value.split('\n').slice(0, end.line - 7).reduce((n, line) => n + line.length + 1, 0) + end.column - 1;
      expect(end).toEqual(point(endOffset));
      offset = endOffset;
    }
    expect(offset).toBe(value.length);
    expect(result.diagnostics[0]?.position).toEqual(result.inlines.find(node => node.type === 'interpolation' && node.path === 'bad + path')?.position);
    expect(result.inlines.filter(node => node.type === 'interpolation')).toHaveLength(2);
  });

  it("handles dense interpolation with accurate final positions", () => {
    const result = parseMarkdownInlines('{{ item }}\n'.repeat(4000), 1);
    expect(result.inlines).toHaveLength(8000);
    expect(result.inlines.at(-1)?.position?.end).toEqual({ line: 4001, column: 1 });
  });

  it("rejects excessive nesting before exhausting the call stack", () => {
    const source = '::: card\n'.repeat(2000) + 'text\n' + ':::\n'.repeat(2000);
    expect(() => parseMds(source)).toThrow(/maxDepth/);
    expect(() => parseMds('::: card\ntext\n:::', { maxDepth: 1 })).toThrow(/maxDepth/);
    expect(() => parseMds('text', { maxDepth: NaN })).toThrow(/positive/);
  });
});

it('bounds malformed delimiter scans and still finds later valid tokens', () => {
  for (const prefix of ['['.repeat(100_000), '{{'.repeat(50_000) + '}']) {
    const result = parseMarkdownInlines(prefix + '\n[Next -> /ok] {{ name }}', 1);
    expect(result.inlines.filter(node => node.type === 'actionLink')).toHaveLength(1);
    expect(result.inlines.filter(node => node.type === 'interpolation')).toHaveLength(1);
  }
});

it('preserves action-link whitespace semantics across line breaks', () => {
  const result = parseMarkdownInlines('[label\n -> /path] [text ->\n /next]\n[broken\n[valid -> /last]', 1);
  expect(result.inlines.filter(node => node.type === 'actionLink').map(node => node.target)).toEqual(['/path', '/next', '/last']);
});
