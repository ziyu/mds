import { describe, expect, it } from "vitest";
import { parseMds } from "@mds-crate/parser";
import { renderHtmlResult } from "@mds-crate/renderer-html";
import { buildPackageTheme, inspectThemeArtifact } from "@mds-crate/theme-builder";
import { loadThemeDirectory } from "@mds-crate/theme-loader";
import { blockVocabulary } from "../../../packages/blocks/src/index.js";
import { fileURLToPath } from "node:url";
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

  it("uses every shared block and no theme-owned extensions in the Components example", () => {
    const components = examples.find((item) => item.id === "components");
    expect(components).toBeDefined();
    expect(collectBlockTypes(components!.source)).toEqual(blockVocabulary.map((block) => block.name).sort());
  });

  it("renders every example through Default without unsupported block fallbacks", async () => {
    const themeDirectory = fileURLToPath(new URL("../../../themes/default", import.meta.url));
    const build = await buildPackageTheme(themeDirectory);
    const inspection = await inspectThemeArtifact(build.outputDirectory);
    const theme = await loadThemeDirectory(build.outputDirectory);

    expect(inspection.diagnostics).toEqual([]);
    expect(inspection.blocks).toHaveLength(66);
    expect(inspection.blockPacks).toHaveLength(9);
    expect(inspection.templateSources.filter((entry) => entry.source === "theme")).toHaveLength(6);

    for (const example of examples) {
      const result = renderHtmlResult(parseMds(example.source), { theme });
      expect(result.html, example.id).not.toContain('data-fallback="true"');
    }

    const components = examples.find((item) => item.id === "components");
    const result = renderHtmlResult(parseMds(components!.source), { theme });
    expect(result.diagnostics).toEqual([]);
    expect(result.html).toContain('class="page"');
    expect(result.html).toContain('class="callout warning"');
    expect(result.html).toContain('class="form-field input-group"');
    expect(result.html).toContain('class="field-error"');
    expect(result.html).toContain('class="command"');
    expect(result.html).toContain('class="calendar-days"');
    expect(result.html).toContain('class="context-menu"');
    expect(result.html).toContain('class="menubar"');
    expect(result.html).toContain('class="figure"');
    expect(result.html).toContain('class="caption"');
    expect(result.html).toContain('class="motion"');
    expect(result.html).not.toContain('class="data-table-shell"');
    expect(result.html).not.toContain('class="message-scroller"');
    expect(result.html).not.toContain('class="terminal"');
    expect(result.html).not.toContain("{{ attr:");
  });
});

function collectBlockTypes(source: string): string[] {
  const blockTypes = new Set<string>();

  const visit = (value: unknown): void => {
    if (typeof value !== "object" || value === null) return;
    const record = value as Record<string, unknown>;
    if (record.type === "block" && typeof record.blockType === "string") {
      blockTypes.add(record.blockType);
    }
    for (const child of Object.values(record)) {
      if (Array.isArray(child)) {
        child.forEach(visit);
      } else {
        visit(child);
      }
    }
  };

  visit(parseMds(source));
  return [...blockTypes].sort();
}
