import type { EditorExample } from "./examples.js";
import type { EditorFileRecord } from "./editor-session.js";
import type { LocalEditorDocument } from "./local-document.js";

export type EditorDocumentRef =
  | { kind: "example"; id: string }
  | { kind: "file"; path: string }
  | { kind: "local"; id: string };

export type EditorDocument =
  | { kind: "example"; example: EditorExample }
  | { kind: "file"; file: EditorFileRecord }
  | { kind: "local"; document: LocalEditorDocument };

export function editorDocumentRef(document: EditorDocument): EditorDocumentRef {
  switch (document.kind) {
    case "example":
      return { kind: "example", id: document.example.id };
    case "file":
      return { kind: "file", path: document.file.path };
    case "local":
      return { kind: "local", id: document.document.id };
  }
}

export function editorDocumentLabel(document: EditorDocument): string {
  switch (document.kind) {
    case "example":
      return document.example.label;
    case "file":
      return document.file.path;
    case "local":
      return document.document.name;
  }
}

export function serializeEditorDocumentRef(document: EditorDocumentRef): string {
  const value = document.kind === "file" ? document.path : document.id;
  return `${document.kind}:${encodeURIComponent(value)}`;
}

export function parseEditorDocumentRef(value: string): EditorDocumentRef | undefined {
  const separator = value.indexOf(":");
  if (separator < 0) {
    return undefined;
  }

  const kind = value.slice(0, separator);
  const encoded = value.slice(separator + 1);
  if ((kind !== "example" && kind !== "file" && kind !== "local") || encoded.length === 0) {
    return undefined;
  }

  try {
    const decoded = decodeURIComponent(encoded);
    return kind === "file" ? { kind, path: decoded } : { kind, id: decoded };
  } catch {
    return undefined;
  }
}
