import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { parseMds } from "@mds-crate/parser";
import { renderHtmlResult, type HtmlTheme } from "@mds-crate/renderer-html";
import { ThemeValidationError, type ThemeSummary } from "@mds-crate/theme-loader/browser";
import { DiagnosticsPane } from "./diagnostics-pane.js";
import {
  editorDocumentLabel,
  editorDocumentRef,
  parseEditorDocumentRef,
  serializeEditorDocumentRef,
  type EditorDocument
} from "./editor-document.js";
import {
  splitRenderDiagnostics,
  withDiagnosticsSource,
  type EditorDiagnostic
} from "./editor-diagnostics.js";
import { EditorPane, type EditorPaneHandle } from "./editor-pane.js";
import { examples } from "./examples.js";
import { PreviewPane, type PreviewSize } from "./preview-pane.js";
import { PreviewToolbar } from "./preview-toolbar.js";
import {
  themeDiagnosticToDiagnostic,
  themeErrorToDiagnostic,
  unknownThemeRefMessage,
  unknownThemeRefToDiagnostic
} from "./theme-diagnostics.js";
import {
  createThemeBuildSummary,
  createThemeInspectionSummary,
  type ThemeBuildSummary,
  type ThemeInspectionSummary
} from "./theme-build-status.js";
import {
  buildThemePackageWithDiagnostics,
  inspectThemeWithDiagnostics,
  themeProvider
} from "./theme-provider.js";
import { isThemeBuildHmrPayload, type ThemeBuildHmrPayload } from "./theme-build-contract.js";
import {
  themeBuildErrorToEditorDiagnostics,
  themeBuildProviderDiagnosticsToEditorDiagnostics
} from "./theme-build-diagnostics.js";
import {
  createEditorFile,
  EditorSessionError,
  loadEditorFile,
  loadEditorSession,
  saveEditorFile,
  type EditorFileRecord,
  type EditorSessionPayload
} from "./editor-session.js";
import {
  createLocalDraft,
  openLocalDocument,
  saveLocalDocument,
  type LocalEditorDocument
} from "./local-document.js";
import { WorkspaceHeader } from "./workspace-header.js";

const initialExample = examples[0]!;

interface RenderState {
  html: string;
  diagnostics: EditorDiagnostic[];
  error?: string;
}

interface ThemeBuildProgress {
  ref: string;
}

interface ThemeInspectionProgress {
  ref: string;
}

export function App() {
  const [source, setSource] = useState(initialExample.source);
  const [activeDocument, setActiveDocument] = useState<EditorDocument>({ kind: "example", example: initialExample });
  const [previewSize, setPreviewSize] = useState<PreviewSize>("desktop");
  const [themes, setThemes] = useState<ThemeSummary[]>([]);
  const [previewThemeRef, setPreviewThemeRef] = useState("default");
  const [theme, setTheme] = useState<HtmlTheme | undefined>();
  const [themeError, setThemeError] = useState<string | undefined>();
  const [themeDiagnostics, setThemeDiagnostics] = useState<EditorDiagnostic[]>([]);
  const [themeReloadToken, setThemeReloadToken] = useState(0);
  const [themeBuildProgress, setThemeBuildProgress] = useState<ThemeBuildProgress | undefined>();
  const [themeBuildSummary, setThemeBuildSummary] = useState<ThemeBuildSummary | undefined>();
  const [themeInspectionProgress, setThemeInspectionProgress] = useState<ThemeInspectionProgress | undefined>();
  const [themeInspectionSummary, setThemeInspectionSummary] = useState<ThemeInspectionSummary | undefined>();
  const [previewNotice, setPreviewNotice] = useState<string | undefined>();
  const [editorSession, setEditorSession] = useState<EditorSessionPayload | null>(null);
  const [baselineSource, setBaselineSource] = useState(initialExample.source);
  const [fileOperation, setFileOperation] = useState<"idle" | "opening" | "saving" | "creating">("idle");
  const [fileError, setFileError] = useState<string | undefined>();
  const [fileConflict, setFileConflict] = useState<EditorFileRecord | null | undefined>();
  const [newFilePath, setNewFilePath] = useState("");
  const [showCreateFile, setShowCreateFile] = useState(false);
  const [localDocuments, setLocalDocuments] = useState<LocalEditorDocument[]>([]);

  const hasProjectSession = editorSession?.mode === "document";
  const activeFile = activeDocument.kind === "file" ? activeDocument.file : null;
  const activeLocalDocument = activeDocument.kind === "local" ? activeDocument.document : null;
  const isDirty = source !== baselineSource;
  const hasPendingChanges = isDirty || (activeLocalDocument !== null && !activeLocalDocument.persisted);
  const [isPreviewFullscreen, setIsPreviewFullscreen] = useState(false);
  const editorPaneRef = useRef<EditorPaneHandle | null>(null);

  const frontmatterThemeRef = useMemo(() => readThemeRef(source), [source]);
  const effectiveThemeRef = frontmatterThemeRef ?? previewThemeRef;
  const hasThemeList = themes.length > 0;
  const knownThemeRefs = useMemo(() => new Set(themes.map((availableTheme) => availableTheme.name)), [themes]);
  const effectiveThemeSummary = useMemo(
    () => themes.find((availableTheme) => availableTheme.name === effectiveThemeRef),
    [effectiveThemeRef, themes]
  );
  const canBuildEffectiveTheme =
    effectiveThemeSummary?.buildable === true ||
    (effectiveThemeSummary === undefined && canTryUnlistedThemeRef(effectiveThemeRef));
  const isBuildingEffectiveTheme = themeBuildProgress?.ref === effectiveThemeRef;
  const isInspectingEffectiveTheme = themeInspectionProgress?.ref === effectiveThemeRef;

  useEffect(() => {
    let cancelled = false;
    loadEditorSession()
      .then((session) => {
        if (cancelled || session === null) {
          return;
        }
        setEditorSession(session);
        if (session.activeFile !== null) {
          setActiveDocument({ kind: "file", file: session.activeFile });
          setSource(session.activeFile.content);
          setBaselineSource(session.activeFile.content);
        } else {
          setActiveDocument({ kind: "example", example: initialExample });
          setSource(initialExample.source);
          setBaselineSource(initialExample.source);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setFileError(error instanceof Error ? error.message : String(error));
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasPendingChanges) {
      return;
    }
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [hasPendingChanges]);

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
    if (!isPreviewFullscreen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsPreviewFullscreen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPreviewFullscreen]);

  useEffect(() => {
    if (import.meta.hot === undefined) {
      return;
    }

    const handleThemeBuild = (payload: unknown) => {
      if (!isThemeBuildHmrPayload(payload)) {
        setThemeBuildSummary(undefined);
        setPreviewNotice("Invalid theme build update");
        return;
      }

      if (payload.ref !== effectiveThemeRef) {
        return;
      }

      if (payload.status === "success") {
        setThemeDiagnostics(payload.result.diagnostics.map(themeDiagnosticToDiagnostic));
        setThemeBuildSummary(createThemeBuildSummary(payload.ref, payload.result));
        setThemeInspectionSummary(undefined);
        setThemeError(undefined);
        setThemeReloadToken((token) => token + 1);
        setPreviewNotice(`Theme rebuilt: ${payload.ref}`);
        return;
      }

      setThemeBuildSummary(undefined);
      setThemeDiagnostics(themeBuildProviderDiagnosticsToEditorDiagnostics(payload.diagnostics));
      setPreviewNotice(`Theme rebuild failed: ${payload.ref}`);
    };

    import.meta.hot.on("mds-theme-build", handleThemeBuild);
    return () => {
      import.meta.hot?.off("mds-theme-build", handleThemeBuild);
    };
  }, [effectiveThemeRef]);

  useEffect(() => {
    let cancelled = false;
    const shouldValidateThemeRef = hasThemeList;

    if (shouldValidateThemeRef && !knownThemeRefs.has(effectiveThemeRef) && !canTryUnlistedThemeRef(effectiveThemeRef)) {
      const message = unknownThemeRefMessage(effectiveThemeRef);
      setTheme(undefined);
      setThemeError(message);
      setThemeDiagnostics([unknownThemeRefToDiagnostic(effectiveThemeRef)]);
      return () => {
        cancelled = true;
      };
    }

    setThemeError(undefined);
    setTheme(undefined);
    setThemeDiagnostics([]);

    void loadThemeForPreview(effectiveThemeRef, () => cancelled, {
      setTheme,
      setThemeError,
      setThemeDiagnostics,
      setThemeBuildProgress,
      setThemeBuildSummary,
      setThemeInspectionSummary,
      setPreviewNotice,
      canAutoBuild: canBuildEffectiveTheme
    });

    return () => {
      cancelled = true;
    };
  }, [canBuildEffectiveTheme, effectiveThemeRef, hasThemeList, knownThemeRefs, themeReloadToken]);

  const document = useMemo(() => parseMds(source), [source]);
  const renderState = useMemo<RenderState>(() => {
    try {
      if (theme === undefined) {
        return {
          html: themeError === undefined ? renderLoadingDocument() : renderErrorDocument(themeError),
          diagnostics: [...themeDiagnostics, ...withDiagnosticsSource(document.diagnostics, "parser")]
        };
      }

      const result = renderHtmlResult(document, {
        theme
      });

      return {
        ...result,
        diagnostics: [...themeDiagnostics, ...splitRenderDiagnostics(result.diagnostics, document.diagnostics)]
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        html: renderErrorDocument(message),
        diagnostics: [...themeDiagnostics, ...withDiagnosticsSource(document.diagnostics, "parser")],
        error: message
      };
    }
  }, [document, theme, themeDiagnostics, themeError]);

  const activeDocumentValue = serializeEditorDocumentRef(editorDocumentRef(activeDocument));
  const activeDocumentLabel = editorDocumentLabel(activeDocument);

  const applyExample = useCallback((nextId: string) => {
    const nextExample = examples.find((example) => example.id === nextId);
    if (nextExample === undefined) {
      return;
    }
    setActiveDocument({ kind: "example", example: nextExample });
    setSource(nextExample.source);
    setBaselineSource(nextExample.source);
    setFileConflict(undefined);
    setFileError(undefined);
    setEditorSession((session) => session === null ? null : { ...session, activeFile: null });
  }, []);

  const applyOpenedFile = useCallback((file: EditorFileRecord, files?: string[]) => {
    setActiveDocument({ kind: "file", file });
    setSource(file.content);
    setBaselineSource(file.content);
    setFileConflict(undefined);
    setFileError(undefined);
    setEditorSession((session) => session === null ? null : {
      ...session,
      activeFile: file,
      ...(files === undefined ? {} : { files })
    });
  }, []);

  const applyLocalDocument = useCallback((document: LocalEditorDocument) => {
    setActiveDocument({ kind: "local", document });
    setSource(document.content);
    setBaselineSource(document.content);
    setFileConflict(undefined);
    setFileError(undefined);
    setEditorSession((session) => session === null ? null : { ...session, activeFile: null });
  }, []);

  const handleFileChange = useCallback(async (path: string) => {
    if (activeFile?.path === path) {
      return;
    }

    setFileOperation("opening");
    setFileError(undefined);
    try {
      applyOpenedFile(await loadEditorFile(path));
    } catch (error) {
      setFileError(error instanceof Error ? error.message : String(error));
    } finally {
      setFileOperation("idle");
    }
  }, [activeFile?.path, applyOpenedFile]);

  const handleDocumentChange = useCallback(async (value: string) => {
    const nextDocument = parseEditorDocumentRef(value);
    if (nextDocument === undefined || value === activeDocumentValue) {
      return;
    }
    if (hasPendingChanges && !window.confirm("Leave the current unsaved document and open another one?")) {
      return;
    }
    if (nextDocument.kind === "example") {
      applyExample(nextDocument.id);
      return;
    }
    if (nextDocument.kind === "file") {
      await handleFileChange(nextDocument.path);
      return;
    }
    const localDocument = localDocuments.find((document) => document.id === nextDocument.id);
    if (localDocument !== undefined) {
      applyLocalDocument(localDocument);
    }
  }, [activeDocumentValue, applyExample, applyLocalDocument, handleFileChange, hasPendingChanges, localDocuments]);

  const handleSaveFile = useCallback(async (overwrite = false) => {
    if (activeFile === null) {
      return;
    }
    setFileOperation("saving");
    setFileError(undefined);
    try {
      const result = await saveEditorFile({
        path: activeFile.path,
        revision: activeFile.revision,
        content: source
      }, { overwrite });
      applyOpenedFile(result.file, result.files);
      setPreviewNotice(`Saved ${result.file.path}`);
    } catch (error) {
      if (error instanceof EditorSessionError && error.code === "file-conflict") {
        setFileConflict(error.file);
        setFileError(error.message);
      } else {
        setFileError(error instanceof Error ? error.message : String(error));
      }
    } finally {
      setFileOperation("idle");
    }
  }, [activeFile, applyOpenedFile, source]);

  const handleReloadConflict = useCallback(() => {
    if (fileConflict === null || fileConflict === undefined) {
      return;
    }
    applyOpenedFile(fileConflict);
    setPreviewNotice(`Reloaded ${fileConflict.path} from disk`);
  }, [applyOpenedFile, fileConflict]);

  const handleCreateFile = useCallback(async () => {
    const path = newFilePath.trim();
    if (path.length === 0) {
      return;
    }
    if (hasPendingChanges && !window.confirm("Leave the current unsaved document and create a new project file?")) {
      return;
    }

    setFileOperation("creating");
    setFileError(undefined);
    try {
      const result = await createEditorFile(path);
      applyOpenedFile(result.file, result.files);
      setNewFilePath("");
      setShowCreateFile(false);
      setPreviewNotice(`Created ${result.file.path}`);
    } catch (error) {
      setFileError(error instanceof Error ? error.message : String(error));
    } finally {
      setFileOperation("idle");
    }
  }, [applyOpenedFile, hasPendingChanges, newFilePath]);

  const handleNewDocument = useCallback(() => {
    if (hasProjectSession) {
      setShowCreateFile((visible) => !visible);
      return;
    }
    if (hasPendingChanges && !window.confirm("Leave the current unsaved document and create a new draft?")) {
      return;
    }

    const draft = createLocalDraft(localDocuments.map((document) => document.name));
    setLocalDocuments((documents) => [...documents, draft]);
    applyLocalDocument(draft);
    setPreviewNotice(`Created local draft: ${draft.name}`);
  }, [applyLocalDocument, hasPendingChanges, hasProjectSession, localDocuments]);

  const handleOpenLocalDocument = useCallback(async () => {
    if (hasPendingChanges && !window.confirm("Leave the current unsaved document and open a local file?")) {
      return;
    }

    setFileOperation("opening");
    setFileError(undefined);
    try {
      const document = await openLocalDocument();
      if (document === undefined) {
        return;
      }
      setLocalDocuments((documents) => [...documents, document]);
      applyLocalDocument(document);
      setPreviewNotice(`Opened local file: ${document.name}`);
    } catch (error) {
      setFileError(error instanceof Error ? error.message : String(error));
    } finally {
      setFileOperation("idle");
    }
  }, [applyLocalDocument, hasPendingChanges]);

  const handleSaveLocalDocument = useCallback(async () => {
    if (activeLocalDocument === null) {
      return;
    }

    setFileOperation("saving");
    setFileError(undefined);
    try {
      const result = await saveLocalDocument(activeLocalDocument, source);
      if (result === undefined) {
        return;
      }
      setLocalDocuments((documents) => documents.map((document) => (
        document.id === result.document.id ? result.document : document
      )));
      setActiveDocument({ kind: "local", document: result.document });
      setBaselineSource(source);
      setPreviewNotice(
        result.method === "download"
          ? `Downloaded ${result.document.name}`
          : `Saved ${result.document.name}`
      );
    } catch (error) {
      setFileError(error instanceof Error ? error.message : String(error));
    } finally {
      setFileOperation("idle");
    }
  }, [activeLocalDocument, source]);

  const handleSaveDocument = useCallback(async () => {
    if (activeDocument.kind === "file") {
      await handleSaveFile();
      return;
    }
    if (activeDocument.kind === "local") {
      await handleSaveLocalDocument();
    }
  }, [activeDocument.kind, handleSaveFile, handleSaveLocalDocument]);

  useEffect(() => {
    if (activeDocument.kind === "example") {
      return;
    }
    const saveShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void handleSaveDocument();
      }
    };
    window.addEventListener("keydown", saveShortcut);
    return () => window.removeEventListener("keydown", saveShortcut);
  }, [activeDocument.kind, handleSaveDocument]);

  const handleThemeChange = useCallback((nextThemeRef: string) => {
    setPreviewThemeRef(nextThemeRef);
    setThemeBuildSummary(undefined);
    setThemeInspectionSummary(undefined);
  }, []);

  const handleBuildTheme = useCallback(async () => {
    if (!canBuildEffectiveTheme) {
      setPreviewNotice(`Theme does not need build: ${effectiveThemeRef}`);
      return;
    }

    setThemeBuildProgress({ ref: effectiveThemeRef });
    setPreviewNotice(`Building theme: ${effectiveThemeRef}`);

    try {
      const result = await buildThemePackageWithDiagnostics(effectiveThemeRef);
      setThemeDiagnostics(result.diagnostics.map(themeDiagnosticToDiagnostic));
      setThemeBuildSummary(createThemeBuildSummary(effectiveThemeRef, result));
      setThemeInspectionSummary(undefined);
      setThemeError(undefined);
      setThemeReloadToken((token) => token + 1);
      setPreviewNotice(`Theme built: ${effectiveThemeRef}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setPreviewNotice(`Theme build failed: ${effectiveThemeRef}`);
      setThemeBuildSummary(undefined);
      setThemeDiagnostics(themeBuildErrorToEditorDiagnostics(error, message));
    } finally {
      setThemeBuildProgress((progress) => (progress?.ref === effectiveThemeRef ? undefined : progress));
    }
  }, [canBuildEffectiveTheme, effectiveThemeRef]);

  const handleInspectTheme = useCallback(async () => {
    setThemeInspectionProgress({ ref: effectiveThemeRef });
    setPreviewNotice(`Inspecting theme: ${effectiveThemeRef}`);

    try {
      const result = await inspectThemeWithDiagnostics(effectiveThemeRef);
      setThemeDiagnostics(result.diagnostics.map(themeDiagnosticToDiagnostic));
      setThemeInspectionSummary(createThemeInspectionSummary(effectiveThemeRef, result));
      setThemeError(undefined);
      setPreviewNotice(`Theme inspected: ${effectiveThemeRef}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setPreviewNotice(`Theme inspection failed: ${effectiveThemeRef}`);
      setThemeInspectionSummary(undefined);
      setThemeDiagnostics(themeBuildErrorToEditorDiagnostics(error, message));
    } finally {
      setThemeInspectionProgress((progress) => (progress?.ref === effectiveThemeRef ? undefined : progress));
    }
  }, [effectiveThemeRef]);

  const handleCopyHtml = useCallback(async () => {
    await navigator.clipboard.writeText(renderState.html);
  }, [renderState.html]);

  const handleDownloadHtml = useCallback(() => {
    const blob = new Blob([renderState.html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const filename = activeDocument.kind === "example"
      ? `${activeDocument.example.id}.html`
      : activeDocument.kind === "file"
        ? `${activeDocument.file.path.replace(/\.mds$/i, "")}.html`
        : `${activeDocument.document.name.replace(/\.mds$/i, "")}.html`;
    const link = documentCreateDownloadLink(url, filename);
    link.click();
    URL.revokeObjectURL(url);
  }, [activeDocument, renderState.html]);

  const handleFoldAllMds = useCallback(() => {
    editorPaneRef.current?.foldAllMds();
  }, []);

  const handleUnfoldAllMds = useCallback(() => {
    editorPaneRef.current?.unfoldAllMds();
  }, []);

  const handleTogglePreviewFullscreen = useCallback(() => {
    setIsPreviewFullscreen((current) => !current);
  }, []);

  return (
    <main className="app-shell">
      <WorkspaceHeader
        activeDocumentValue={activeDocumentValue}
        activeKind={activeDocument.kind}
        activeLabel={activeDocumentLabel}
        busyLabel={
          fileOperation === "opening"
            ? "Opening"
            : fileOperation === "saving"
              ? "Saving"
              : fileOperation === "creating"
                ? "Creating"
                : undefined
        }
        canSaveDocument={
          activeDocument.kind !== "example" &&
          hasPendingChanges &&
          fileOperation === "idle"
        }
        examples={examples}
        files={editorSession?.files ?? []}
        isDirty={hasPendingChanges}
        localDocuments={localDocuments}
        projectRoot={editorSession?.projectRoot}
        onCopyHtml={() => void handleCopyHtml()}
        onNewDocument={handleNewDocument}
        onOpenDocument={() => void handleOpenLocalDocument()}
        onDocumentChange={(value) => void handleDocumentChange(value)}
        onDownloadHtml={handleDownloadHtml}
        onResetExample={() => setSource(baselineSource)}
        onSaveDocument={() => void handleSaveDocument()}
      />

      <div className="status-stack">
        {hasProjectSession && showCreateFile ? (
          <form className="create-file-bar" onSubmit={(event) => { event.preventDefault(); void handleCreateFile(); }}>
            <strong>New document</strong>
            <input
              autoFocus
              value={newFilePath}
              onChange={(event) => setNewFilePath(event.target.value)}
              placeholder="notes/new-page.mds"
              aria-label="New MDS file path"
            />
            <span>inside {editorSession.projectRoot}</span>
            <button type="submit" className="primary-action" disabled={fileOperation !== "idle" || newFilePath.trim().length === 0}>
              {fileOperation === "creating" ? "Creating..." : "Create"}
            </button>
            <button type="button" onClick={() => setShowCreateFile(false)}>Cancel</button>
          </form>
        ) : null}

        {fileConflict !== undefined ? (
          <div className="file-conflict" role="alert">
            <strong>Save conflict</strong>
            <span>{fileError ?? "The file changed on disk after it was opened."}</span>
            <div>
              {fileConflict === null ? null : <button type="button" onClick={handleReloadConflict}>Reload disk version</button>}
              <button type="button" className="danger-action" onClick={() => void handleSaveFile(true)}>Overwrite disk</button>
            </div>
          </div>
        ) : fileError === undefined ? null : <div className="theme-error" role="alert">{fileError}</div>}

        {themeError === undefined ? null : <div className="theme-error">{themeError}</div>}
        {renderState.error === undefined ? null : <div className="theme-error">{renderState.error}</div>}
      </div>

      <section className="workspace">
        <div className="panel editor-panel">
          <div className="panel-title editor-panel-title">
            <span className="panel-heading">
              <small>Write</small>
              <strong>{activeDocumentLabel}</strong>
              <code>{source.length.toLocaleString()} chars</code>
            </span>
            <span className="panel-title-actions">
              <button type="button" onClick={handleFoldAllMds}>
                Fold all
              </button>
              <button type="button" onClick={handleUnfoldAllMds}>
                Expand all
              </button>
            </span>
          </div>
          <EditorPane ref={editorPaneRef} value={source} onChange={setSource} />
        </div>
        <div className={isPreviewFullscreen ? "panel preview-panel preview-panel-fullscreen" : "panel preview-panel"}>
          <div className="panel-title preview-panel-title">
            <span className="panel-heading">
              <small>Render</small>
              <strong>Preview</strong>
              <code>{effectiveThemeRef}</code>
            </span>
            <PreviewToolbar
              allowThemeTools={!hasProjectSession || editorSession?.themeDevelopment === true}
              canBuildTheme={canBuildEffectiveTheme}
              effectiveThemeRef={effectiveThemeRef}
              frontmatterThemeRef={frontmatterThemeRef}
              isBuildingTheme={isBuildingEffectiveTheme}
              isFullscreen={isPreviewFullscreen}
              isInspectingTheme={isInspectingEffectiveTheme}
              onBuildTheme={() => void handleBuildTheme()}
              onInspectTheme={() => void handleInspectTheme()}
              onPreviewSizeChange={setPreviewSize}
              onThemeChange={handleThemeChange}
              onToggleFullscreen={handleTogglePreviewFullscreen}
              previewSize={previewSize}
              previewThemeRef={previewThemeRef}
              themeBuildSummary={themeBuildSummary}
              themeInspectionSummary={themeInspectionSummary}
              themes={themes}
            />
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

function themeDiagnosticsFromError(error: unknown, message: string): EditorDiagnostic[] {
  if (error instanceof ThemeValidationError) {
    return error.diagnostics.map(themeDiagnosticToDiagnostic);
  }

  return [themeErrorToDiagnostic(message)];
}

interface ThemePreviewLoadCallbacks {
  setTheme: (theme: HtmlTheme | undefined) => void;
  setThemeError: (message: string | undefined) => void;
  setThemeDiagnostics: (diagnostics: EditorDiagnostic[]) => void;
  setThemeBuildProgress: Dispatch<SetStateAction<ThemeBuildProgress | undefined>>;
  setThemeBuildSummary: (summary: ThemeBuildSummary | undefined) => void;
  setThemeInspectionSummary: (summary: ThemeInspectionSummary | undefined) => void;
  setPreviewNotice: (message: string | undefined) => void;
  canAutoBuild: boolean;
}

async function loadThemeForPreview(
  ref: string,
  isCancelled: () => boolean,
  callbacks: ThemePreviewLoadCallbacks
): Promise<void> {
  try {
    const result = await themeProvider.loadThemeWithDiagnostics(ref);
    if (isCancelled()) {
      return;
    }

    callbacks.setTheme(result.theme);
    callbacks.setThemeDiagnostics(result.diagnostics.map(themeDiagnosticToDiagnostic));
    return;
  } catch (error) {
    if (isCancelled()) {
      return;
    }

    if (callbacks.canAutoBuild && shouldAutoBuildTheme(error)) {
      await buildAndReloadThemeForPreview(ref, isCancelled, callbacks);
      return;
    }

    applyThemeLoadError(error, callbacks);
  }
}

async function buildAndReloadThemeForPreview(
  ref: string,
  isCancelled: () => boolean,
  callbacks: ThemePreviewLoadCallbacks
): Promise<void> {
  callbacks.setThemeBuildProgress({ ref });
  callbacks.setPreviewNotice(`Building theme: ${ref}`);

  try {
    const buildResult = await buildThemePackageWithDiagnostics(ref);
    if (isCancelled()) {
      return;
    }

    callbacks.setThemeBuildSummary(createThemeBuildSummary(ref, buildResult));
    callbacks.setThemeInspectionSummary(undefined);
    callbacks.setThemeError(undefined);
    callbacks.setPreviewNotice(`Theme built: ${ref}`);

    const loadResult = await themeProvider.loadThemeWithDiagnostics(ref);
    if (isCancelled()) {
      return;
    }

    callbacks.setTheme(loadResult.theme);
    callbacks.setThemeDiagnostics(loadResult.diagnostics.map(themeDiagnosticToDiagnostic));
  } catch (error) {
    if (isCancelled()) {
      return;
    }

    callbacks.setTheme(undefined);
    callbacks.setThemeBuildSummary(undefined);
    callbacks.setPreviewNotice(`Theme build failed: ${ref}`);
    applyThemeBuildOrLoadError(error, callbacks);
  } finally {
    if (!isCancelled()) {
      callbacks.setThemeBuildProgress((progress) => (progress?.ref === ref ? undefined : progress));
    }
  }
}

function applyThemeLoadError(error: unknown, callbacks: ThemePreviewLoadCallbacks): void {
  const message = error instanceof Error ? error.message : String(error);
  callbacks.setTheme(undefined);
  callbacks.setThemeError(message);
  callbacks.setThemeDiagnostics(themeDiagnosticsFromError(error, message));
}

function applyThemeBuildOrLoadError(error: unknown, callbacks: ThemePreviewLoadCallbacks): void {
  const message = error instanceof Error ? error.message : String(error);
  callbacks.setThemeError(message);
  callbacks.setThemeDiagnostics(themeBuildErrorToEditorDiagnostics(error, message));
}

function shouldAutoBuildTheme(error: unknown): boolean {
  return (
    error instanceof ThemeValidationError &&
    error.diagnostics.some((diagnostic) => diagnostic.code === "missing-theme-manifest")
  );
}

function canTryUnlistedThemeRef(ref: string): boolean {
  return ref.startsWith("@");
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
