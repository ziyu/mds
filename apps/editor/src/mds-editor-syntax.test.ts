import { Text } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import {
  createMdsContainerAutoCloseInsertion,
  isInsideMarkdownCodeFence,
  matchMdsBlockLine
} from "./mds-editor-syntax.js";

describe("MDS editor syntax", () => {
  it("distinguishes leaf, container, and closing block lines", () => {
    expect(matchMdsBlockLine(':: button label="Save"')).toMatchObject({
      kind: "leaf",
      fence: "::",
      type: "button"
    });
    expect(matchMdsBlockLine("::: grid columns=3")).toMatchObject({
      kind: "container",
      fence: ":::",
      type: "grid"
    });
    expect(matchMdsBlockLine(":::")).toMatchObject({ kind: "close" });
    expect(matchMdsBlockLine("::")).toBeUndefined();
  });

  it("creates an indented closing fence only for a completed container opener", () => {
    expect(createMdsContainerAutoCloseInsertion("  ::: card", 10)).toEqual({
      text: "\n  \n  :::",
      cursorOffset: 3
    });
    expect(createMdsContainerAutoCloseInsertion(":: button", 9)).toBeUndefined();
    expect(createMdsContainerAutoCloseInsertion("::: card", 4)).toBeUndefined();
  });

  it("recognizes block-looking lines inside Markdown code fences", () => {
    const document = Text.of(["```mds", "::: card", "```", "::: card"]);
    expect(isInsideMarkdownCodeFence(document, 2)).toBe(true);
    expect(isInsideMarkdownCodeFence(document, 4)).toBe(false);
  });
});
