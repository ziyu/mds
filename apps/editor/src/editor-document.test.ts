import { describe, expect, it } from "vitest";
import { editorDocumentLabel, editorDocumentRef, parseEditorDocumentRef, serializeEditorDocumentRef } from "./editor-document.js";

describe("editor document references", () => {
  it("round-trips example, project-file, and local-document references", () => {
    expect(parseEditorDocumentRef(serializeEditorDocumentRef({ kind: "example", id: "components" }))).toEqual({
      kind: "example",
      id: "components"
    });
    expect(parseEditorDocumentRef(serializeEditorDocumentRef({ kind: "file", path: "notes/概览 page.mds" }))).toEqual({
      kind: "file",
      path: "notes/概览 page.mds"
    });
    expect(parseEditorDocumentRef(serializeEditorDocumentRef({ kind: "local", id: "local:1" }))).toEqual({
      kind: "local",
      id: "local:1"
    });
  });

  it("rejects unknown and malformed references", () => {
    expect(parseEditorDocumentRef("unknown:value")).toBeUndefined();
    expect(parseEditorDocumentRef("file:")).toBeUndefined();
    expect(parseEditorDocumentRef("example:%E0%A4%A")).toBeUndefined();
  });

  it("exposes a common reference and label for every document source", () => {
    expect(editorDocumentRef({ kind: "example", example: { id: "basic", label: "Basic", source: "# Basic" } })).toEqual({
      kind: "example",
      id: "basic"
    });
    expect(editorDocumentLabel({
      kind: "file",
      file: { path: "docs/index.mds", content: "# Docs", revision: "r1", modifiedAt: 1 }
    })).toBe("docs/index.mds");
    expect(editorDocumentRef({
      kind: "local",
      document: { id: "draft-1", name: "untitled.mds", content: "# Untitled", persisted: false }
    })).toEqual({ kind: "local", id: "draft-1" });
    expect(editorDocumentLabel({
      kind: "local",
      document: { id: "draft-1", name: "untitled.mds", content: "# Untitled", persisted: false }
    })).toBe("untitled.mds");
  });
});
