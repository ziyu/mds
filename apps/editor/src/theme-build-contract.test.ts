import { describe, expect, it } from "vitest";
import {
  isThemeBuildHmrPayload,
  isThemeBuildProviderErrorBody,
  isThemeBuildProviderResult,
  isThemeInspectionProviderResult,
  serializeThemeBuildErrorBody,
  serializeThemeBuildErrorHmrPayload,
  serializeThemeBuildSuccessHmrPayload,
  serializeThemeBuildResult,
  serializeThemeInspectionResult
} from "./theme-build-contract.js";
import type { PackageThemeBuildResult, ThemeArtifactInspection, ThemeBuildDiagnostic } from "@mds-crate/theme-builder";

describe("theme build contract", () => {
  it("serializes package theme build results into the browser provider contract", () => {
    const result: PackageThemeBuildResult = {
      packageDirectory: "/project/themes/clarity",
      outputDirectory: "/project/themes/clarity/dist/theme",
      sourcePath: "/project/themes/clarity/src/theme.tsx",
      inputFiles: ["/project/themes/clarity/package.json"],
      filesWritten: ["theme.json", "blocks/hero.html"],
      diagnostics: [
        {
          severity: "warning",
          code: "empty-theme-name",
          message: "Theme name is empty."
        }
      ],
      metadataPath: ".mds-theme-build.json"
    };

    const serialized = serializeThemeBuildResult(result);

    expect(serialized).toEqual({
      packageDirectory: "/project/themes/clarity",
      outputDirectory: "/project/themes/clarity/dist/theme",
      sourcePath: "/project/themes/clarity/src/theme.tsx",
      inputFiles: ["/project/themes/clarity/package.json"],
      filesWritten: ["theme.json", "blocks/hero.html"],
      diagnostics: [
        {
          severity: "warning",
          code: "empty-theme-name",
          message: "Theme name is empty."
        }
      ],
      metadataPath: ".mds-theme-build.json"
    });
    expect(isThemeBuildProviderResult(serialized)).toBe(true);
  });

  it("rejects malformed package theme build results", () => {
    expect(
      isThemeBuildProviderResult({
        packageDirectory: "/project/themes/clarity",
        outputDirectory: "/project/themes/clarity/dist/theme",
        sourcePath: "/project/themes/clarity/src/theme.tsx",
        inputFiles: ["/project/themes/clarity/package.json"],
        filesWritten: ["theme.json"],
        diagnostics: [],
        metadataPath: 123
      })
    ).toBe(false);
  });

  it("serializes theme inspections into the browser provider contract", () => {
    const inspection: ThemeArtifactInspection = {
      ref: "clarity",
      artifactDirectory: "/project/themes/clarity/dist/theme",
      name: "clarity",
      label: "Clarity",
      preview: "preview.svg",
      tags: ["docs"],
      supportedBlocks: ["hero"],
      files: ["theme.json", "blocks/hero.html", ".mds-theme-build.json"],
      runtimeFiles: ["theme.json", "blocks/hero.html"],
      developmentFiles: [".mds-theme-build.json"],
      assets: {
        css: ["style.css"],
        js: [],
        head: []
      },
      blocks: ["hero"],
      actions: ["toggle"],
      blockPacks: [
        {
          name: "@mds-crate/blocks/core",
          profiles: ["core"],
          supportedBlocks: ["hero"]
        }
      ],
      templateSources: [{ block: "hero", source: "theme" }],
      diagnostics: [],
      metadata: {
        version: 1,
        source: "src/theme.tsx",
        output: "dist/theme",
        inputFiles: ["package.json", "src/theme.tsx"],
        artifactFiles: ["theme.json", "blocks/hero.html"],
        templates: [
          {
            file: "blocks/hero.html",
            blocks: ["hero"]
          }
        ]
      }
    };
    const serialized = serializeThemeInspectionResult(inspection);

    expect(serialized).toEqual(inspection);
    expect(isThemeInspectionProviderResult(serialized)).toBe(true);
  });

  it("rejects malformed theme inspection results", () => {
    expect(
      isThemeInspectionProviderResult({
        ref: "clarity",
        artifactDirectory: "/project/themes/clarity/dist/theme",
        name: "clarity",
        tags: [],
        supportedBlocks: [],
        files: ["theme.json"],
        runtimeFiles: ["theme.json"],
        developmentFiles: [],
        assets: {
          css: [],
          js: [],
          head: [],
          shell: 123
        },
        blocks: [],
        actions: [],
        diagnostics: []
      })
    ).toBe(false);
  });

  it("recognizes structured package theme build error bodies", () => {
    const diagnostics: ThemeBuildDiagnostic[] = [
      {
        severity: "error",
        code: "theme-build-error",
        message: "Could not resolve CSS asset.",
        stage: "merge-assets",
        field: "mdsTheme.assets.css"
      }
    ];
    const errorBody = serializeThemeBuildErrorBody(diagnostics, "Theme build failed.");

    expect(errorBody).toEqual({
      message: "Theme build failed.",
      diagnostics
    });
    expect(isThemeBuildProviderErrorBody(errorBody)).toBe(true);
    expect(
      isThemeBuildProviderErrorBody({
        diagnostics: [
          {
            severity: "error",
            code: "theme-build-error",
            message: "Could not resolve CSS asset.",
            stage: 123
          }
        ]
      })
    ).toBe(false);
    expect(
      isThemeBuildProviderErrorBody({
        diagnostics: [
          {
            severity: "error",
            code: "theme-build-error",
            message: "Could not resolve CSS asset.",
            stage: "not-a-build-stage"
          }
        ]
      })
    ).toBe(false);
  });

  it("recognizes successful theme build HMR payloads", () => {
    const result: PackageThemeBuildResult = {
      packageDirectory: "/project/themes/clarity",
      outputDirectory: "/project/themes/clarity/dist/theme",
      sourcePath: "/project/themes/clarity/src/theme.tsx",
      inputFiles: ["/project/themes/clarity/package.json"],
      filesWritten: ["theme.json"],
      diagnostics: []
    };
    const payload = serializeThemeBuildSuccessHmrPayload("clarity", result);

    expect(payload).toEqual({
      ref: "clarity",
      status: "success",
      result: {
        packageDirectory: "/project/themes/clarity",
        outputDirectory: "/project/themes/clarity/dist/theme",
        sourcePath: "/project/themes/clarity/src/theme.tsx",
        inputFiles: ["/project/themes/clarity/package.json"],
        filesWritten: ["theme.json"],
        diagnostics: []
      }
    });
    expect(isThemeBuildHmrPayload(payload)).toBe(true);
  });

  it("recognizes failed theme build HMR payloads", () => {
    const diagnostics: ThemeBuildDiagnostic[] = [
      {
        severity: "error",
        code: "theme-build-error",
        message: "Could not render block.",
        stage: "load-source",
        field: "mdsTheme.source",
        block: "hero"
      }
    ];
    const payload = serializeThemeBuildErrorHmrPayload("clarity", diagnostics, "Theme build failed.");

    expect(payload).toEqual({
      ref: "clarity",
      status: "error",
      message: "Theme build failed.",
      diagnostics
    });
    expect(isThemeBuildHmrPayload(payload)).toBe(true);
  });

  it("rejects malformed theme build HMR payloads", () => {
    expect(
      isThemeBuildHmrPayload({
        ref: "clarity",
        status: "success",
        result: {
          packageDirectory: "/project/themes/clarity",
          outputDirectory: "/project/themes/clarity/dist/theme",
          sourcePath: "/project/themes/clarity/src/theme.tsx",
          inputFiles: ["/project/themes/clarity/package.json"],
          filesWritten: ["theme.json"],
          diagnostics: [],
          metadataPath: 123
        }
      })
    ).toBe(false);
    expect(
      isThemeBuildHmrPayload({
        ref: "clarity",
        status: "error",
        message: "Theme build failed.",
        diagnostics: [
          {
            severity: "error",
            code: "theme-build-error",
            message: "Could not render block.",
            stage: "not-a-build-stage"
          }
        ]
      })
    ).toBe(false);
    expect(
      isThemeBuildHmrPayload({
        ref: "clarity",
        status: "pending"
      })
    ).toBe(false);
  });
});
