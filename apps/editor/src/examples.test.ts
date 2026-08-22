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
    expect(inspection.blocks).toHaveLength(67);
    expect(inspection.blockPacks).toHaveLength(9);
    expect(inspection.templateSources.filter((entry) => entry.source === "theme")).toHaveLength(6);
    expectAtomicProgress(theme, inspection);

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
    expectCompactModeToBeIntrinsic(result.html);
    expect(theme.js).toContain("function setTargetState(target, open, trigger)");
    expect(theme.js).toContain("target.hidden = !open;");
  });

  it("renders every example through Canvas without unsupported block fallbacks", async () => {
    const themeDirectory = fileURLToPath(new URL("../../../themes/canvas", import.meta.url));
    const build = await buildPackageTheme(themeDirectory);
    const inspection = await inspectThemeArtifact(build.outputDirectory);
    const theme = await loadThemeDirectory(build.outputDirectory);

    expect(inspection.diagnostics).toEqual([]);
    expectAtomicProgress(theme, inspection);

    for (const example of examples) {
      const result = renderHtmlResult(parseMds(example.source), { theme });
      expect(result.html, example.id).not.toContain('data-fallback="true"');
      expect(
        result.diagnostics.filter((diagnostic) => diagnostic.code === "missing-block-renderer"),
        example.id
      ).toEqual([]);
    }

    const components = examples.find((item) => item.id === "components");
    const result = renderHtmlResult(parseMds(components!.source), { theme });
    expect(result.diagnostics).toEqual([]);
    expect(result.html).toContain("mds-callout callout");
    expect(result.html).toContain("mds-tabs");
    expect(result.html).toContain("mds-accordion");
    expect(result.html).toContain('class="carousel-track"');
    expect(result.html).toContain("mds-block command");
    expect(result.html).not.toContain("{{ attr:");
    expectCompactModeToBeIntrinsic(result.html);

    const unlabeledControls = renderHtmlResult(
      parseMds(`# Unlabeled controls

:: input placeholder="Input"

:: slider value=25

:: progress value=42 max=100
`),
      { theme }
    );
    expect(unlabeledControls.diagnostics).toEqual([]);
    expect(unlabeledControls.html).not.toContain(">Input<");
    expect(unlabeledControls.html).not.toContain(">Value<");
    expect(unlabeledControls.html).not.toContain("<strong>Progress</strong>");
    expect(unlabeledControls.html).toContain('aria-label="Progress"');
    expect(theme.js).toContain("setupToggles");
    expect(theme.js).toContain("track.scrollTo");
    expect(theme.js).not.toContain("scrollIntoView");
    expect(theme.css).toContain(":where(details, .mds-details):has(+ .action)");
    expect(theme.css).not.toContain(":where(details, .mds-details) + .action");
  });

  it("keeps Rich extensions separate from the portable block runtime", async () => {
    const themeDirectory = fileURLToPath(new URL("../../../themes/rich", import.meta.url));
    const build = await buildPackageTheme(themeDirectory);
    const inspection = await inspectThemeArtifact(build.outputDirectory);
    const theme = await loadThemeDirectory(build.outputDirectory);
    const script = theme.js ?? "";

    expect(inspection.diagnostics).toEqual([]);
    expect(inspection.blocks).toHaveLength(102);
    expect(inspection.supportedBlocks).toHaveLength(102);
    expect(script.match(/function setupTabs\(/g)).toHaveLength(1);
    expect(script.match(/function setupMotion\(/g)).toHaveLength(1);
    expect(script.match(/function setupDataTables\(/g)).toHaveLength(1);
    expect(script.match(/function setupMessageScrollers\(/g)).toHaveLength(1);
    expect(script).not.toContain('querySelectorAll(".tabs")');
    expect(script).not.toContain('querySelectorAll(".dialog.is-open, .drawer.is-open")');
    expect(script).not.toContain("Rich theme viewport motion");
    expect(theme.css).toContain("[data-motion-ready]");
    expect(theme.css).toContain("var(--motion-item-delay, var(--motion-delay))");
    expect(theme.css).not.toContain("--rich-order");

    const result = renderHtmlResult(
      parseMds(`::: data-table label="Releases" filter="Filter releases" page-size=10 selectable
--- columns
:: data-column key="package" label="Package" sortable
:: data-column key="version" label="Version" sortable

--- rows
::: data-row
::: data-cell column="package"
@mds-crate/blocks
:::
::: data-cell column="version"
0.2.0
:::
:::
:::

::: message-scroller label="Conversation" follow=true height="24rem"
::: message align="start" sender="MDS" status="Delivered"
--- body
::: bubble variant="secondary"
All checks passed.
:::
:::
:::`),
      { theme }
    );

    expect(result.diagnostics).toEqual([]);
    expect(result.html).toContain('class="data-table-shell"');
    expect(result.html).toContain('class="message-scroller"');
    expect(result.html).not.toContain('data-fallback="true"');

    const labeledCallout = renderHtmlResult(
      parseMds(`::: callout label="MDS"
Write content. Preview the result.
:::`),
      { theme }
    );
    expect(labeledCallout.diagnostics).toEqual([]);
    expect(labeledCallout.html).toContain('<strong class="callout-label">MDS</strong>');
    expect(labeledCallout.html).not.toContain('<strong class="callout-label">callout</strong>');
  });

  it("keeps progress atomic across every official file-authored theme", async () => {
    for (const themeName of ["default", "light", "dark", "rich"]) {
      const themeDirectory = fileURLToPath(new URL(`../../../themes/${themeName}`, import.meta.url));
      const build = await buildPackageTheme(themeDirectory);
      const inspection = await inspectThemeArtifact(build.outputDirectory);
      const theme = await loadThemeDirectory(build.outputDirectory);

      expect(inspection.diagnostics, themeName).toEqual([]);
      expectAtomicProgress(theme, inspection);
    }
  });
});

function expectAtomicProgress(
  theme: Awaited<ReturnType<typeof loadThemeDirectory>>,
  inspection: Awaited<ReturnType<typeof inspectThemeArtifact>>
): void {
  expect(inspection.templateSources).toContainEqual({
    block: "progress",
    source: "@mds-crate/blocks/display"
  });

  const result = renderHtmlResult(parseMds(':: progress label="the progress" value=5 max=100'), { theme });
  expect(result.diagnostics).toEqual([]);
  expect(result.html).toMatch(/<progress\b[^>]*class="progress"[^>]*><\/progress>/);
  expect(result.html).not.toContain("progress-block");
  expect(result.html).not.toContain("<figure");
  expect(result.html).not.toContain("<figcaption");
  expect(result.html).not.toContain(">the progress<");
  expect(result.html).not.toContain("5/100");
}

function expectCompactModeToBeIntrinsic(html: string): void {
  const compactMode = html.match(/<button\b[^>]*>Compact mode<\/button>/)?.[0];
  expect(compactMode).toBeDefined();
  expect(compactMode).toContain('class="action toggle-control"');
  expect(compactMode).toContain('aria-pressed="false"');
  expect(compactMode).not.toContain("data-action");
  expect(compactMode).not.toContain("data-target");
  expect(compactMode).not.toContain("aria-controls");
}

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
