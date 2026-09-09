import { describe, expect, it } from "vitest";
import { parseMds } from "@mds-crate/parser";
import { createMarkdownRenderCache, renderHtmlResult, renderMds } from "./index.js";

describe("render budgets and incremental Markdown cache", () => {
  it("bounds list expansion, custom renderer recursion and output", () => {
    expect(() => renderMds('@list items\n- a\n- b\n- c\n\n::: each items\n{{ item }}\n:::', { limits: { maxNodes: 5 } })).toThrow(/maxNodes/);
    expect(() => renderMds(':: card', { blockRenderers: { card: (block, ctx) => ctx.renderNode(block) } })).toThrow(/maxDepth/);
    expect(() => renderMds(':: card', { limits: { maxOutputLength: 100 }, blockRenderers: { card: () => 'x'.repeat(101) } })).toThrow(/maxOutputLength/);
    expect(() => renderMds('text', { limits: { maxDepth: 0 } })).toThrow(/positive/);
  });

  it("reuses unchanged nodes and invalidates resolved state and local dependencies", () => {
    const cache = createMarkdownRenderCache();
    const source = '@state name Alice\n\n::: card\nHello {{ name }}\n:::\n\n::: card\nUnchanged\n:::';
    const run = (text: string) => renderHtmlResult(parseMds(text), { markdownCache: cache });
    run(source);
    const result = run(source.replace('Alice', 'Bob'));
    expect(cache.stats).toMatchObject({ hits: 1, misses: 3 });
    expect(result.html).toContain('Hello Bob');
    expect(result).toEqual(renderHtmlResult(parseMds(source.replace('Alice', 'Bob'))));
    const each = '@list things\n- first\n- second\n\n::: each things\n{{ item }}\n:::';
    expect(run(each)).toEqual(renderHtmlResult(parseMds(each)));
  });

  it("recreates unsafe URL diagnostics at the new source position on cache hits", () => {
    const cache = createMarkdownRenderCache();
    const source = '::: card\n[x](javascript:evil)\n:::';
    renderHtmlResult(parseMds(source), { markdownCache: cache });
    const moved = renderHtmlResult(parseMds('\n\n' + source), { markdownCache: cache });
    expect(cache.stats.hits).toBe(1);
    expect(moved).toEqual(renderHtmlResult(parseMds('\n\n' + source)));
    expect(moved.diagnostics[0]?.position?.start.line).toBe(4);
  });

  it("bounds cache size, evicts old entries and can be cleared", () => {
    const cache = createMarkdownRenderCache(100, 2);
    for (let i = 0; i < 1000; i++) cache.render(String(i));
    expect(cache.stats.entries).toBe(2);
    expect(cache.stats.size).toBeLessThanOrEqual(100);
    cache.render('x'.repeat(1000));
    expect(cache.stats.entries).toBe(2);
    cache.clear();
    expect(cache.stats).toEqual({ entries: 0, hits: 0, misses: 0, size: 0 });
  });
});
