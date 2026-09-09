import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { writeFile } from 'node:fs/promises';
import { parseMds } from '../packages/parser/dist/index.js';
import { createMarkdownRenderCache, renderHtmlResult } from '../packages/renderer-html/dist/index.js';
import { loadThemeDirectory } from '../packages/theme-loader/dist/index.js';

const theme = await loadThemeDirectory(fileURLToPath(new URL('../themes/default/dist/theme', import.meta.url)));
const measure = (run) => {
  for (let i = 0; i < 4; i++) run();
  const samples = Array.from({ length: 9 }, () => { const start = performance.now(); run(); return performance.now() - start; }).sort((a, b) => a - b);
  return { p50: samples[4], p95: samples[8] };
};
const rows = [];
const paragraph = '## Heading\n\n中英文 paragraph **bold** and [link](https://example.com).\n\n';
for (const size of [1000, 10000, 100000, 500000]) {
  const source = paragraph.repeat(Math.ceil(size / paragraph.length));
  rows.push({ kind: 'markdown', size: Buffer.byteLength(source), ...measure(() => renderHtmlResult(parseMds(source), { theme })) });
}
const tokens = [];
for (const count of [500, 1000, 2000, 4000]) {
  const source = 'Hello {{ name }}\n'.repeat(count);
  const result = { kind: 'interpolation-parse', count, ...measure(() => parseMds(source)) };
  tokens.push(result);
  rows.push(result);
}
for (const depth of [3, 6, 9, 12, 24]) {
  let source = 'Leaf\n';
  for (let i = 0; i < depth; i++) source = `::: card\n--- body\n${source}:::\n`;
  const document = parseMds(source);
  const renderer = theme.blockRenderers.card;
  let calls = 0;
  const options = { theme, blockRenderers: { card: (block, context) => { calls++; return renderer(block, context); } } };
  renderHtmlResult(document, options);
  assert.equal(calls, depth, 'slot renderer calls must grow linearly with depth');
  rows.push({ kind: 'slots', depth, calls, ...measure(() => renderHtmlResult(document, options)) });
}
const cache = createMarkdownRenderCache();
const blocks = Array.from({ length: 500 }, (_, i) => `::: card\nBlock ${i}\n:::`).join('\n');
renderHtmlResult(parseMds(blocks), { theme, markdownCache: cache });
const before = cache.stats;
const changed = blocks.replace('Block 250', 'Edited 250');
const actual = renderHtmlResult(parseMds(changed), { theme, markdownCache: cache });
assert.deepEqual(actual, renderHtmlResult(parseMds(changed), { theme }));
assert.equal(cache.stats.misses - before.misses, 1, 'editing a block reparses only changed Markdown');
assert.equal(cache.stats.hits - before.hits, 499);
rows.push({ kind: '500-cards-incremental', ...measure(() => renderHtmlResult(parseMds(changed), { theme, markdownCache: cache })), cache: cache.stats });
if (process.argv.includes('--check')) {
  // Broad relative guard catches quadratic work without tight shared-CI timing limits.
  assert(tokens[3].p50 < Math.max(tokens[1].p50 * 10, 20), `interpolation growth regressed: ${JSON.stringify(tokens)}`);
}
console.table(rows);
if (process.env.MDS_PERF_OUTPUT) await writeFile(process.env.MDS_PERF_OUTPUT, JSON.stringify({ node: process.version, measuredAt: new Date().toISOString(), rows }, null, 2));
