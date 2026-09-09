import { parseMds } from "@mds-crate/parser";
import { createMarkdownRenderCache, renderHtmlResult, type HtmlTheme } from "@mds-crate/renderer-html";
import { createThemeResultFromSources, type ThemeSource } from "@mds-crate/theme-loader/browser";
import { splitRenderDiagnostics, withDiagnosticsSource, type EditorDiagnostic } from "./editor-diagnostics.js";

export interface PreviewRequest {
  revision: number;
  source: string;
  themeId: number;
  theme?: ThemeSource;
}

export interface PreviewResult {
  revision: number;
  html: string;
  diagnostics: EditorDiagnostic[];
  duration: number;
  error?: string;
}

export function previewErrorHtml(message: string): string {
  const text = message.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  return `<!doctype html><html><body><pre>${text}</pre></body></html>`;
}

export function createPreviewCompiler() {
  let themeId = 0;
  let theme: HtmlTheme | undefined;
  const markdownCache = createMarkdownRenderCache();
  return (request: PreviewRequest): PreviewResult => {
    const started = performance.now();
    let diagnostics: EditorDiagnostic[] = [];
    try {
      if (request.themeId !== themeId) {
        theme = undefined;
        markdownCache.clear();
        if (request.themeId !== 0) {
          if (!request.theme) throw new Error('Preview theme source is missing.');
          theme = createThemeResultFromSources(request.theme).theme;
        }
        themeId = request.themeId;
      }
      const document = parseMds(request.source);
      diagnostics = withDiagnosticsSource(document.diagnostics, 'parser');
      const result = theme === undefined ? undefined : renderHtmlResult(document, { theme, markdownCache });
      return {
        revision: request.revision,
        html: result?.html ?? '<!doctype html><html><body><p>Loading theme...</p></body></html>',
        diagnostics: result ? splitRenderDiagnostics(result.diagnostics, document.diagnostics) : diagnostics,
        duration: performance.now() - started
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { revision: request.revision, html: previewErrorHtml(message), diagnostics: [
        ...diagnostics, { code: 'preview-failed', severity: 'error', source: 'renderer', message }
      ], error: message, duration: performance.now() - started };
    }
  };
}
