import type { EditorExample } from "./examples.js";
import type { LocalEditorDocument } from "./local-document.js";
import { serializeEditorDocumentRef } from "./editor-document.js";

export interface WorkspaceHeaderProps {
  activeDocumentValue: string;
  activeKind: "example" | "file" | "local";
  activeLabel: string;
  busyLabel: string | undefined;
  canSaveDocument: boolean;
  examples: readonly EditorExample[];
  files: string[];
  isDirty: boolean;
  localDocuments: readonly LocalEditorDocument[];
  projectRoot: string | undefined;
  onCopyHtml: () => void;
  onNewDocument: () => void;
  onOpenDocument: () => void;
  onDocumentChange: (value: string) => void;
  onDownloadHtml: () => void;
  onResetExample: () => void;
  onSaveDocument: () => void;
}

export function WorkspaceHeader(props: WorkspaceHeaderProps) {
  const stateLabel = props.busyLabel ?? documentStateLabel(props.activeKind, props.isDirty);

  return (
    <header className="workbench-header">
      <div className="brand" aria-label="MDS Editor">
        <span className="brand-mark">MDS</span>
        <span className="brand-copy">
          <strong>Editor</strong>
          <small>Markdown workbench</small>
        </span>
      </div>

      <label className="document-switcher" title={props.projectRoot}>
        <span className="control-kicker">Document</span>
        <select
          aria-label="Document"
          value={props.activeDocumentValue}
          onChange={(event) => props.onDocumentChange(event.target.value)}
        >
          {props.files.length > 0 ? (
            <optgroup label="Project files">
              {props.files.map((path) => (
                <option key={path} value={serializeEditorDocumentRef({ kind: "file", path })}>{path}</option>
              ))}
            </optgroup>
          ) : null}
          {props.localDocuments.length > 0 ? (
            <optgroup label="Local documents">
              {props.localDocuments.map((document) => (
                <option key={document.id} value={serializeEditorDocumentRef({ kind: "local", id: document.id })}>
                  {document.name}
                </option>
              ))}
            </optgroup>
          ) : null}
          <optgroup label="Examples">
            {props.examples.map((example) => (
              <option key={example.id} value={serializeEditorDocumentRef({ kind: "example", id: example.id })}>
                {example.label}
              </option>
            ))}
          </optgroup>
        </select>
      </label>

      <div className="document-identity">
        <span className="document-kind">{documentKindLabel(props.activeKind)}</span>
        <strong title={props.activeLabel}>{props.activeLabel}</strong>
      </div>

      <span className={`file-state ${props.isDirty ? "file-state-dirty" : ""}`}>{stateLabel}</span>

      <div className="header-spacer" />

      <div className="document-actions" aria-label="Document actions">
        <button type="button" onClick={props.onNewDocument} disabled={props.busyLabel !== undefined}>New</button>
        <button type="button" onClick={props.onOpenDocument} disabled={props.busyLabel !== undefined}>Open…</button>
        {props.activeKind === "example" ? (
          <button type="button" onClick={props.onResetExample} disabled={!props.isDirty || props.busyLabel !== undefined}>Reset</button>
        ) : (
          <button
            type="button"
            className="primary-action"
            onClick={props.onSaveDocument}
            disabled={!props.canSaveDocument}
            title="Save (Cmd/Ctrl+S)"
          >
            Save
          </button>
        )}
      </div>

      <div className="export-actions" aria-label="Export actions">
        <button type="button" onClick={props.onCopyHtml}>Copy HTML</button>
        <button type="button" onClick={props.onDownloadHtml}>Export</button>
      </div>
    </header>
  );
}

function documentStateLabel(kind: "example" | "file" | "local", isDirty: boolean): string {
  if (kind === "file") {
    return isDirty ? "Unsaved" : "Saved";
  }
  if (kind === "local") {
    return isDirty ? "Unsaved" : "Local";
  }
  return isDirty ? "Edited" : "Sample";
}

function documentKindLabel(kind: "example" | "file" | "local"): string {
  switch (kind) {
    case "example":
      return "Built-in example";
    case "file":
      return "Project file";
    case "local":
      return "Local document";
  }
}
