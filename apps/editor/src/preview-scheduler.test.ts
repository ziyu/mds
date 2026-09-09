import { afterEach, describe, expect, it, vi } from 'vitest';
import { PreviewScheduler, type PreviewWorker } from './preview-scheduler.js';
import type { PreviewResult } from './preview-compiler.js';

function harness() {
  const workers: PreviewWorker[] = [];
  const results = vi.fn();
  const errors = vi.fn();
  const scheduler = new PreviewScheduler(() => {
    const worker = { postMessage: vi.fn(), terminate: vi.fn(), onmessage: null, onerror: null };
    workers.push(worker);
    return worker;
  }, results, errors);
  const reply = (revision: number) => workers.at(-1)!.onmessage?.({ data: { revision, html: String(revision), diagnostics: [], duration: 1 } } as unknown as MessageEvent<PreviewResult>);
  return { scheduler, workers, results, errors, reply };
}

afterEach(() => vi.useRealTimers());
describe('preview scheduling', () => {
  it('coalesces rapid edits into the latest pending revision and drops stale results', () => {
    vi.useFakeTimers();
    const h = harness();
    const theme = { manifest: {}, files: {} };
    h.scheduler.schedule({ source: 'first', themeId: 1, theme });
    for (let i = 0; i < 100; i++) h.scheduler.schedule({ source: String(i), themeId: 1, theme });
    vi.advanceTimersByTime(120);
    expect(h.workers[0]!.postMessage).toHaveBeenCalledTimes(1);
    h.reply(1);
    expect(h.results).not.toHaveBeenCalled();
    expect(h.workers[0]!.postMessage).toHaveBeenLastCalledWith({ source: '99', themeId: 1, revision: 101 });
    h.reply(101);
    expect(h.results).toHaveBeenCalledTimes(1);
    h.scheduler.dispose();
  });

  it('sends changed themes, terminates on timeout and retries with the full theme source', () => {
    vi.useFakeTimers();
    const h = harness();
    const theme = { manifest: {}, files: {} };
    h.scheduler.schedule({ source: 'first', themeId: 1, theme });
    vi.advanceTimersByTime(10000);
    expect(h.errors).toHaveBeenCalledTimes(1);
    expect(h.workers[0]!.terminate).toHaveBeenCalled();
    h.scheduler.schedule({ source: 'fixed', themeId: 1, theme });
    expect(h.workers[1]!.postMessage).toHaveBeenCalledWith({ source: 'fixed', themeId: 1, theme, revision: 2 });
    h.reply(2);
    h.scheduler.schedule({ source: 'other theme', themeId: 2, theme });
    expect(h.workers[1]!.postMessage).toHaveBeenLastCalledWith({ source: 'other theme', themeId: 2, theme, revision: 3 });
    h.scheduler.dispose();
  });

  it('reports startup failures, and ignores messages after disposal', () => {
    vi.useFakeTimers();
    const failed = vi.fn();
    const scheduler = new PreviewScheduler(() => { throw new Error('unsupported'); }, vi.fn(), failed);
    scheduler.schedule({ source: 'a', themeId: 0 });
    expect(failed).toHaveBeenCalledWith('unsupported', 1);
    scheduler.dispose();
    const h = harness();
    h.scheduler.schedule({ source: 'first', themeId: 0 });
    h.scheduler.dispose();
    h.reply(1);
    expect(h.results).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});

it('ignores late failures from a terminated worker after recovery', () => {
  vi.useFakeTimers();
  const h = harness();
  h.scheduler.schedule({ source: 'first', themeId: 0 });
  const staleError = h.workers[0]!.onerror!;
  vi.advanceTimersByTime(10000);
  h.scheduler.schedule({ source: 'new', themeId: 0 });
  staleError({ message: 'late failure' } as ErrorEvent);
  expect(h.workers[1]!.terminate).not.toHaveBeenCalled();
  h.reply(2);
  expect(h.results).toHaveBeenCalledTimes(1);
  h.scheduler.dispose();
});
