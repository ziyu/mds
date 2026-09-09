import { describe, expect, it } from 'vitest';
import { splitPreviewDocument } from './preview-document.js';

describe('preview document invalidation', () => {
  const html = (body: string, script = 'run()', title = 'Title') => `<!doctype html><html><head><title>${title}</title><meta name="mds-preview-updates" content="morph"></head><body>${body}<script>${script}</script></body></html>`;
  it('sends only body markup when a lifecycle-aware shell is unchanged', () => {
    const first = splitPreviewDocument(html('<main>A</main>'))!;
    const next = splitPreviewDocument(html('<main>B</main>'))!;
    expect(first.incremental).toBe(true);
    expect(next.signature).toBe(first.signature);
    expect(next.body).toBe('<main>B</main>');
  });
  it('invalidates scripts, shell metadata and unsupported third-party themes', () => {
    const first = splitPreviewDocument(html('A'))!;
    expect(splitPreviewDocument(html('A', 'other()'))!.signature).not.toBe(first.signature);
    expect(splitPreviewDocument(html('A', 'run()', 'New title'))!.signature).not.toBe(first.signature);
    expect(splitPreviewDocument('<body>Legacy</body>')!.incremental).toBe(false);
    expect(splitPreviewDocument('Fragment')).toBeUndefined();
  });
});
