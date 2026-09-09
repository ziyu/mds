import { describe, expect, it } from 'vitest';
import { createPreviewCompiler } from './preview-compiler.js';

describe('worker compiler', () => {
  it('reuses theme versions and invalidates changed templates and state', () => {
    const compile = createPreviewCompiler();
    const theme = { manifest: { name: 'test', blocks: { card: 'card.html' } }, files: { 'card.html': '<article>{{ children }}</article>' } };
    expect(compile({ revision: 1, source: '::: card\nFirst\n:::', themeId: 1, theme }).html).toContain('<article><p>First</p></article>');
    expect(compile({ revision: 2, source: '::: card\nSecond\n:::', themeId: 1 }).html).toContain('<article><p>Second</p></article>');
    const next = { ...theme, files: { 'card.html': '<aside>{{ children }}</aside>' } };
    expect(compile({ revision: 3, source: '::: card\nSecond\n:::', themeId: 2, theme: next }).html).toContain('<aside><p>Second</p></aside>');
  });
  it('recovers after excessive nesting and preserves parser diagnostics without a theme', () => {
    const compile = createPreviewCompiler();
    expect(compile({ revision: 1, source: '::: card\n'.repeat(500), themeId: 0 }).error).toContain('maxDepth');
    const result = compile({ revision: 2, source: '{{ x + y }}', themeId: 0 });
    expect(result.error).toBeUndefined();
    expect(result.diagnostics[0]).toMatchObject({ code: 'invalid-interpolation', source: 'parser' });
  });
});
