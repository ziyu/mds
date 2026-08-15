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
      expect(inspection.blocks, theme.name).toHaveLength(102);
      expect(inspection.blockPacks, theme.name).toHaveLength(13);
      expect(
        inspection.templateSources.filter((entry) => entry.source === "theme"),
        theme.name
      ).toHaveLength(themePackage.themeOwnedBlocks);
      expect(result.html, theme.name).toContain('class="terminal"');
      expect(result.html, theme.name).toContain('class="popover"');
      expect(result.html, theme.name).toContain('class="action control-button"');
      expect(result.html, theme.name).toContain('class="form-field input-group"');
      expect(result.html, theme.name).toContain('class="form-field input-otp"');
      expect(result.html, theme.name).toContain('autocomplete="one-time-code"');
      expect(result.html, theme.name).toContain('class="form-field combobox-field"');
      expect(result.html, theme.name).toContain('<datalist id="framework-options">');
      expect(result.html, theme.name).toContain('class="command"');
      expect(result.html, theme.name).toContain('class="command-input"');
      expect(result.html, theme.name).toContain('class="menu-item-shortcut">⌘1</kbd>');
      expect(result.html, theme.name).toContain('class="calendar-days"');
      expect(result.html, theme.name).toContain('class="data-table-shell"');
      expect(result.html, theme.name).toContain('class="chart-point-meter"');
      expect(result.html, theme.name).toContain('class="context-menu"');
      expect(result.html, theme.name).toContain('class="menubar"');
      expect(result.html, theme.name).toContain('class="message-scroller"');
      expect(result.html, theme.name).toContain('class="attachment"');
      expect(result.html, theme.name).not.toContain("{{ attr:");
      expect(result.html, theme.name).toContain('class="avatar"');
      expect(result.html, theme.name).toContain('class="breadcrumb"');
      expect(result.html, theme.name).toContain('class="empty"');
      expect(result.html, theme.name).toContain('class="item"');
      expect(result.html, theme.name).toContain('class="pagination"');
      expect(result.html, theme.name).toContain('type="range"');
      expect(result.html, theme.name).toContain('class="dropdown-menu"');
      expect(result.html, theme.name).toContain('class="action menu-item-control"');
      expect(result.html, theme.name).not.toContain('data-fallback="true"');
    }
  });
});
