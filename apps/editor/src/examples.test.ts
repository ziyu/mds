import { describe, expect, it } from "vitest";
import { parseMds } from "@mds/parser";
import { renderHtmlResult } from "@mds/renderer-html";
import { examples } from "./examples.js";

const previewTheme = {
  name: "test-preview",
  actions: ["toggle", "open", "close", "show", "hide"]
};

describe("editor examples", () => {
  it("parse and render without errors", () => {
    for (const example of examples) {
      const document = parseMds(example.source);
      const result = renderHtmlResult(document, {
        theme: previewTheme
      });
      const errors = result.diagnostics.filter((diagnostic) => diagnostic.severity === "error");

      expect(errors, example.id).toEqual([]);
      expect(result.html, example.id).toContain("<!doctype html>");
    }
  });

  it("covers custom app action warnings", () => {
    const example = examples.find((item) => item.id === "actions");
    expect(example).toBeDefined();

    const result = renderHtmlResult(parseMds(example!.source), {
      theme: previewTheme
    });

    expect(result.html).toContain('data-action="lead.submit"');
    expect(result.html).toContain('data-action="analytics.track"');
    expect(result.html).toContain('data-action-missing="true"');
    expect(result.diagnostics.filter((diagnostic) => diagnostic.code === "missing-action-handler")).toHaveLength(2);
  });

  it("shows block targets for nav examples", () => {
    const landing = examples.find((item) => item.id === "landing");
    const actions = examples.find((item) => item.id === "actions");
    expect(landing).toBeDefined();
    expect(actions).toBeDefined();

    const landingResult = renderHtmlResult(parseMds(landing!.source), {
      theme: previewTheme
    });
    const actionsResult = renderHtmlResult(parseMds(actions!.source), {
      theme: previewTheme
    });

    expect(landingResult.html).toContain('data-nav-target="authoring"');
    expect(landingResult.html).toContain('<span class="nav-target">#contact</span>');
    expect(actionsResult.html).toContain('data-nav-target="actionDetails"');
    expect(actionsResult.html).toContain('<span class="nav-target">#actionContact</span>');
  });
});
