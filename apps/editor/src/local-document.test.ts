import { describe, expect, it } from "vitest";
import {
  createDraftSource,
  ensureMdsExtension,
  nextUntitledName,
  openLocalDocument,
  saveLocalDocument,
  type LocalDocumentFileHandle
} from "./local-document.js";

describe("local editor documents", () => {
  it("creates a useful MDS starter", () => {
    expect(createDraftSource()).toContain("title: Untitled");
    expect(createDraftSource()).toContain("# Untitled");
  });

  it("chooses a unique untitled filename", () => {
    expect(nextUntitledName([])).toBe("untitled.mds");
    expect(nextUntitledName(["Untitled.mds", "untitled-2.mds"])).toBe("untitled-3.mds");
  });

  it("normalizes the MDS extension without duplicating it", () => {
    expect(ensureMdsExtension("notes")).toBe("notes.mds");
    expect(ensureMdsExtension("NOTES.MDS")).toBe("NOTES.MDS");
  });

  it("opens and writes back a browser-selected local file", async () => {
    const writes: string[] = [];
    let closed = false;
    const handle: LocalDocumentFileHandle = {
      name: "opened.mds",
      async getFile() {
        return {
          name: "opened.mds",
          text: async () => "# Opened"
        } as File;
      },
      async createWritable() {
        return {
          async write(value) {
            writes.push(value);
          },
          async close() {
            closed = true;
          }
        };
      }
    };

    const opened = await openLocalDocument({
      showOpenFilePicker: async () => [handle]
    });
    expect(opened).toMatchObject({
      name: "opened.mds",
      content: "# Opened",
      persisted: true,
      handle
    });

    const saved = await saveLocalDocument(opened!, "# Saved", {});
    expect(saved).toMatchObject({
      method: "file",
      document: {
        name: "opened.mds",
        content: "# Saved",
        persisted: true,
        handle
      }
    });
    expect(writes).toEqual(["# Saved"]);
    expect(closed).toBe(true);
  });
});
