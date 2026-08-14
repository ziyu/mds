import { describe, expect, it } from "vitest";
import {
  compactPath,
  createThemeBuildSummary,
  createThemeInspectionSummary,
  formatThemeBuildOutput,
  formatThemeBuildSummary,
  formatThemeInspectionOutput,
  formatThemeInspectionSummary
} from "./theme-build-status.js";

describe("theme build status", () => {
  it("formats build summaries for the editor status strip", () => {
    const summary = createThemeBuildSummary("clarity", {
      packageDirectory: "/project/themes/clarity",
      outputDirectory: "/project/themes/clarity/dist/theme",
      sourcePath: "/project/themes/clarity/src/theme.tsx",
      inputFiles: ["package.json", "src/theme.tsx"],
      filesWritten: ["theme.json", "style.css", "blocks/hero.html"],
      diagnostics: []
    });

    expect(summary).toEqual({
      ref: "clarity",
      outputDirectory: "/project/themes/clarity/dist/theme",
      sourcePath: "/project/themes/clarity/src/theme.tsx",
      inputFiles: 2,
      filesWritten: 3
    });
    expect(formatThemeBuildSummary(summary)).toBe("clarity: 3 files from .../clarity/src/theme.tsx");
    expect(formatThemeBuildOutput(summary)).toBe("output .../clarity/dist/theme / 2 inputs");
  });

  it("keeps short paths unchanged", () => {
    expect(compactPath("theme.tsx")).toBe("theme.tsx");
    expect(compactPath("themes/clarity/theme.tsx")).toBe("themes/clarity/theme.tsx");
  });

  it("formats inspection summaries for the editor status strip", () => {
    const summary = createThemeInspectionSummary("clarity", {
      ref: "clarity",
      artifactDirectory: "/project/themes/clarity/dist/theme",
      name: "clarity",
      tags: [],
      supportedBlocks: ["hero"],
      files: ["theme.json", "blocks/hero.html", ".mds-theme-build.json"],
      runtimeFiles: ["theme.json", "blocks/hero.html"],
      developmentFiles: [".mds-theme-build.json"],
      assets: {
        css: [],
        js: [],
        head: []
      },
      blocks: ["hero"],
      actions: [],
      blockPacks: [],
      templateSources: [{ block: "hero", source: "theme" }],
      diagnostics: []
    });

    expect(summary).toEqual({
      ref: "clarity",
      artifactDirectory: "/project/themes/clarity/dist/theme",
      runtimeFiles: 2,
      developmentFiles: 1,
      blocks: 1
    });
    expect(formatThemeInspectionSummary(summary)).toBe("clarity: 2 runtime files / 1 blocks");
    expect(formatThemeInspectionOutput(summary)).toBe("artifact .../clarity/dist/theme / 1 development files");
  });
});
