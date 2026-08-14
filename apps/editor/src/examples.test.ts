import { describe, expect, it } from "vitest";
import { parseMds } from "@mds-crate/parser";
import { renderHtmlResult } from "@mds-crate/renderer-html";
import { buildPackageTheme, inspectThemeArtifact } from "@mds-crate/theme-builder";
import { loadThemeDirectory } from "@mds-crate/theme-loader";
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

  it("renders the Components example through shared-pack themes without diagnostics", async () => {
    const components = examples.find((item) => item.id === "components");
    expect(components).toBeDefined();
    const themePackages = [
      { name: "default", themeOwnedBlocks: 6 },
      { name: "folio", themeOwnedBlocks: 10 },
      { name: "atelier", themeOwnedBlocks: 6 }
    ];

    for (const themePackage of themePackages) {
      const themeDirectory = fileURLToPath(new URL(`../../../themes/${themePackage.name}`, import.meta.url));
      const build = await buildPackageTheme(themeDirectory);
      const inspection = await inspectThemeArtifact(build.outputDirectory);
      const theme = await loadThemeDirectory(build.outputDirectory);
      const result = renderHtmlResult(parseMds(components!.source), { theme });

      expect(result.diagnostics, theme.name).toEqual([]);
      expect(inspection.diagnostics, theme.name).toEqual([]);
      expect(inspection.blocks, theme.name).toHaveLength(72);
      expect(inspection.blockPacks, theme.name).toHaveLength(9);
      expect(
        inspection.templateSources.filter((entry) => entry.source === "theme"),
        theme.name
      ).toHaveLength(themePackage.themeOwnedBlocks);
      expect(result.html, theme.name).toContain('class="pricing-plan"');
      expect(result.html, theme.name).toContain('class="terminal"');
      expect(result.html, theme.name).toContain('class="popover"');
      expect(result.html, theme.name).not.toContain('data-fallback="true"');
    }
  });
});
