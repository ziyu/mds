import type { PreviewRequest, PreviewResult } from "./preview-compiler.js";

export interface PreviewWorker {
  postMessage(request: PreviewRequest): void;
  terminate(): void;
  onmessage: ((event: MessageEvent<PreviewResult>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
}

/** One running compilation and one replaceable pending revision, even during long renders. */
export class PreviewScheduler {
  private worker: PreviewWorker | undefined;
  private pending: PreviewRequest | undefined;
  private active: PreviewRequest | undefined;
  private revision = 0;
  private sentThemeId = -1;
  private debounce: ReturnType<typeof setTimeout> | undefined;
  private watchdog: ReturnType<typeof setTimeout> | undefined;
  private disposed = false;

  constructor(
    private readonly createWorker: () => PreviewWorker,
    private readonly onResult: (result: PreviewResult) => void,
    private readonly onError: (message: string, revision: number) => void,
    private readonly delay = 100,
    private readonly timeout = 10_000
  ) {}

  schedule(input: Omit<PreviewRequest, 'revision'>): number {
    if (this.disposed) throw new Error('Preview scheduler is disposed.');
    this.pending = { ...input, revision: ++this.revision };
    clearTimeout(this.debounce);
    // Open/theme changes are immediate. Subsequent edits are coalesced.
    if (this.revision === 1 || input.themeId !== this.sentThemeId) {
      this.debounce = undefined;
      this.flush();
    } else {
      this.debounce = setTimeout(() => { this.debounce = undefined; this.flush(); }, this.delay);
    }
    return this.revision;
  }

  dispose(): void {
    this.disposed = true;
    clearTimeout(this.debounce);
    clearTimeout(this.watchdog);
    this.pending = this.active = undefined;
    this.worker?.terminate();
    this.worker = undefined;
  }

  private flush(): void {
    if (this.disposed || this.active || !this.pending || this.debounce) return;
    this.active = this.pending;
    this.pending = undefined;
    try {
      if (!this.worker) {
        const worker = this.createWorker();
        this.worker = worker;
        worker.onmessage = (event) => { if (this.worker === worker) this.complete(event.data); };
        worker.onerror = (event) => { if (this.worker === worker) this.fail(event.message || 'Preview worker failed.'); };
      }
      const request = { ...this.active };
      if (request.themeId === this.sentThemeId) delete request.theme;
      this.worker.postMessage(request);
      this.sentThemeId = request.themeId;
      this.watchdog = setTimeout(() => this.fail('Preview exceeded the 10 second time limit. Edit the document to retry.'), this.timeout);
    } catch (error) {
      this.fail(error instanceof Error ? error.message : String(error));
    }
  }

  private complete(result: PreviewResult): void {
    if (this.disposed || result.revision !== this.active?.revision) return;
    clearTimeout(this.watchdog);
    this.active = undefined;
    if (result.revision === this.revision) this.onResult(result);
    this.flush();
  }

  private fail(message: string): void {
    if (this.disposed) return;
    clearTimeout(this.watchdog);
    this.worker?.terminate();
    this.worker = undefined;
    this.sentThemeId = -1;
    const revision = this.active?.revision;
    this.active = undefined;
    if (revision === this.revision) this.onError(message, revision);
    this.flush();
  }
}
