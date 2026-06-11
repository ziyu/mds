import { useCallback, useEffect, useMemo, useState } from "react";
import type { Diagnostic } from "@mds/ast";
import { parseMds } from "@mds/parser";
import { renderHtmlResult, type HtmlTheme } from "@mds/renderer-html";
import type { ThemeSummary } from "@mds/theme-loader/browser";
import { DiagnosticsPane } from "./diagnostics-pane.js";
import { EditorPane } from "./editor-pane.js";
import { examples } from "./examples.js";
import { PreviewPane, type PreviewSize } from "./preview-pane.js";
import { themeProvider } from "./theme-provider.js";

const initialExample = examples[0]!;

interface RenderState {
  html: string;
  diagnostics: Diagnostic[];
  error?: string;
}

export function App() {
  const [source, setSource] = useState(initialExample.source);
  const [exampleId, setExampleId] = useState(initialExample.id);
  const [previewSize, setPreviewSize] = useState<PreviewSize>("desktop");
  const [themes, setThemes] = useState<ThemeSummary[]>([]);
  const [previewThemeRef, setPreviewThemeRef] = useState("default");
  const [theme, setTheme] = useState<HtmlTheme | undefined>();
  const [themeError, setThemeError] = useState<string | undefined>();
  const [previewNotice, setPreviewNotice] = useState<string | undefined>();

  const frontmatterThemeRef = useMemo(() => readThemeRef(source), [source]);
  const effectiveThemeRef = frontmatterThemeRef ?? previewThemeRef;
  const hasThemeList = themes.length > 0;
  const knownThemeRefs = useMemo(() => new Set(themes.map((availableTheme) => availableTheme.name)), [themes]);

  useEffect(() => {
    let cancelled = false;

    themeProvider
      .listThemes()
      .then((availableThemes) => {
        if (!cancelled) {
          setThemes(availableThemes);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setThemeError(error instanceof Error ? error.message : String(error));
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handlePreviewMessage = (event: MessageEvent) => {
      if (isPreviewNavigationMessage(event.data)) {
        setPreviewNotice(`Preview only: ${event.data.href}`);
        return;
      }

      if (isPreviewMissingActionMessage(event.data)) {
        setPreviewNotice(`No handler: ${event.data.action}`);
      }
    };

    window.addEventListener("message", handlePreviewMessage);
    return () => window.removeEventListener("message", handlePreviewMessage);
  }, []);

  useEffect(() => {
    if (previewNotice === undefined) {
      return;
    }

    const timeout = window.setTimeout(() => setPreviewNotice(undefined), 2400);
    return () => window.clearTimeout(timeout);
  }, [previewNotice]);

  useEffect(() => {
    let cancelled = false;
    const shouldValidateThemeRef = hasThemeList;

    if (shouldValidateThemeRef && !knownThemeRefs.has(effectiveThemeRef)) {
      setThemeError(`Unknown theme: ${effectiveThemeRef}`);
      return () => {
        cancelled = true;
      };
    }

    setThemeError(undefined);

    themeProvider
      .loadTheme(effectiveThemeRef)
      .then((loadedTheme) => {
        if (!cancelled) {
          setTheme(loadedTheme);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setThemeError(error instanceof Error ? error.message : String(error));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [effectiveThemeRef, hasThemeList, knownThemeRefs]);

  const document = useMemo(() => parseMds(source), [source]);
  const renderState = useMemo<RenderState>(() => {
    try {
      if (theme === undefined) {
        return {
          html: renderLoadingDocument(),
          diagnostics: document.diagnostics
        };
      }

      return renderHtmlResult(document, {
        theme
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        html: renderErrorDocument(message),
        diagnostics: document.diagnostics,
        error: message
      };
    }
  }, [document, theme]);

  const selectedExample = examples.find((example) => example.id === exampleId) ?? initialExample;

  const handleExampleChange = useCallback((nextId: string) => {
    const nextExample = examples.find((example) => example.id === nextId);
    if (nextExample === undefined) {
      return;
    }

    setExampleId(nextExample.id);
    setSource(nextExample.source);
  }, []);

  const handleThemeChange = useCallback((nextThemeRef: string) => {
    setPreviewThemeRef(nextThemeRef);
  }, []);

  const handleCopyHtml = useCallback(async () => {
    await navigator.clipboard.writeText(renderState.html);
  }, [renderState.html]);

  const handleDownloadHtml = useCallback(() => {
    const blob = new Blob([renderState.html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = documentCreateDownloadLink(url, `${selectedExample.id}.html`);
    link.click();
    URL.revokeObjectURL(url);
  }, [renderState.html, selectedExample.id]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span>MDS</span>
          <strong>Editor</strong>
        </div>
        <label className="toolbar-field">
          <span>Example</span>
          <select value={exampleId} onChange={(event) => handleExampleChange(event.target.value)}>
            {examples.map((example) => (
              <option key={example.id} value={example.id}>
                {example.label}
              </option>
            ))}
          </select>
        </label>
        <label className="toolbar-field">
          <span>Theme</span>
          <select value={previewThemeRef} onChange={(event) => handleThemeChange(event.target.value)}>
            {themeOptions(themes, previewThemeRef).map((availableTheme) => (
              <option key={availableTheme.name} value={availableTheme.name}>
                {availableTheme.label}
              </option>
            ))}
          </select>
        </label>
        <div className="segmented" role="group" aria-label="Preview size">
          {(["desktop", "tablet", "mobile"] satisfies PreviewSize[]).map((size) => (
            <button
              key={size}
              type="button"
              className={previewSize === size ? "active" : ""}
              onClick={() => setPreviewSize(size)}
            >
              {size}
            </button>
          ))}
        </div>
        <div className="toolbar-actions">
          <button type="button" onClick={handleCopyHtml}>
            Copy HTML
          </button>
          <button type="button" onClick={handleDownloadHtml}>
            Download
          </button>
        </div>
      </header>

      {themeError === undefined ? null : <div className="theme-error">{themeError}</div>}
      {renderState.error === undefined ? null : <div className="theme-error">{renderState.error}</div>}

      <section className="workspace">
        <div className="panel editor-panel">
          <div className="panel-title">
            <span>Source</span>
            <code>{source.length.toLocaleString()} chars</code>
          </div>
          <EditorPane value={source} onChange={setSource} />
        </div>
        <div className="panel preview-panel">
          <div className="panel-title">
            <span>Preview</span>
            <code>{previewSize} / {effectiveThemeRef}</code>
          </div>
          {previewNotice === undefined ? null : (
            <div className="preview-toast" role="status">
              {previewNotice}
            </div>
          )}
          <PreviewPane html={renderState.html} size={previewSize} />
        </div>
      </section>

      <DiagnosticsPane diagnostics={renderState.diagnostics} />
    </main>
  );
}

function themeOptions(themes: ThemeSummary[], themeRef: string): ThemeSummary[] {
  if (themes.some((theme) => theme.name === themeRef)) {
    return themes;
  }

  return [
    {
      name: themeRef,
      label: themeRef
    },
    ...themes
  ];
}

function isPreviewNavigationMessage(value: unknown): value is { type: "mds-preview-navigation"; href: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    value.type === "mds-preview-navigation" &&
    "href" in value &&
    typeof value.href === "string"
  );
}

function isPreviewMissingActionMessage(value: unknown): value is { type: "mds-preview-missing-action"; action: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    value.type === "mds-preview-missing-action" &&
    "action" in value &&
    typeof value.action === "string"
  );
}

function readThemeRef(source: string): string | undefined {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  if (lines[0]?.trim() !== "---") {
    return undefined;
  }

  const closeIndex = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
  if (closeIndex === -1) {
    return undefined;
  }

  for (const line of lines.slice(1, closeIndex)) {
    const match = line.match(/^\s*theme\s*:\s*(.*?)\s*$/);
    if (match?.[1] !== undefined && match[1].length > 0) {
      return stripFrontmatterQuotes(match[1]);
    }
  }

  return undefined;
}

function stripFrontmatterQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function renderLoadingDocument(): string {
  return "<!doctype html><html><body><p>Loading theme...</p></body></html>";
}

function renderErrorDocument(message: string): string {
  return `<!doctype html><html><body><pre>${escapeHtml(message)}</pre></body></html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function documentCreateDownloadLink(url: string, filename: string): HTMLAnchorElement {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  return link;
}
