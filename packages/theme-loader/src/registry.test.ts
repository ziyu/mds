import { describe, expect, it } from "vitest";
import {
  createMemoryThemeRegistry,
  createUnknownThemeError,
  isThemeSummary,
  isThemeSummaryList,
  unknownThemeDiagnostic
} from "./index.js";

describe("theme registry", () => {
  it("recognizes serialized theme summary shapes", () => {
    expect(
      isThemeSummary({
        name: "default",
        label: "Default",
        source: "default",
        description: "A theme.",
        author: "MDS",
        homepage: "https://example.com",
        preview: "preview.svg",
        tags: ["docs"],
        supportedBlocks: ["hero"]
      })
    ).toBe(true);
    expect(isThemeSummary({ name: "default" })).toBe(false);
    expect(isThemeSummary({ name: "default", label: "Default", tags: ["docs", 42] })).toBe(false);
    expect(isThemeSummaryList([{ name: "default", label: "Default" }])).toBe(true);
    expect(isThemeSummaryList([{ name: "default", label: "Default" }, { name: "broken" }])).toBe(false);
  });

  it("creates shared unknown theme diagnostics", () => {
    expect(unknownThemeDiagnostic("missing")).toEqual({
      severity: "error",
      code: "unknown-theme",
      message: "Unknown theme: missing.",
      field: "theme ref"
    });
    expect(createUnknownThemeError("missing")).toMatchObject({
      name: "ThemeValidationError",
      diagnostics: [unknownThemeDiagnostic("missing")]
    });
  });

  it("creates memory theme summaries with manifest metadata", async () => {
    const registry = createMemoryThemeRegistry([
      {
        manifest: {
          name: "known",
          label: "Known Theme",
          description: "A theme in memory.",
          author: "MDS",
          homepage: "https://example.com/theme",
          preview: "./assets//preview.svg",
          tags: ["docs", "clean"],
          supportedBlocks: ["hero", "card", "hero"]
        },
        files: {},
        rootName: "known-source"
      }
    ]);

    await expect(registry.listThemes()).resolves.toEqual([
      {
        name: "known",
        label: "Known Theme",
        source: "known-source",
        description: "A theme in memory.",
        author: "MDS",
        homepage: "https://example.com/theme",
        preview: "assets/preview.svg",
        tags: ["docs", "clean"],
        supportedBlocks: ["hero", "card"]
      }
    ]);
  });

  it("omits empty preview paths from memory theme summaries", async () => {
    const registry = createMemoryThemeRegistry([
      {
        manifest: {
          name: "empty-preview",
          preview: ""
        },
        files: {}
      }
    ]);

    await expect(registry.listThemes()).resolves.toEqual([
      {
        name: "empty-preview",
        label: "empty-preview"
      }
    ]);
  });

  it("reports structured diagnostics for unknown memory theme refs", async () => {
    const registry = createMemoryThemeRegistry([
      {
        manifest: {
          name: "known"
        },
        files: {}
      }
    ]);

    await expect(registry.loadTheme("missing")).rejects.toMatchObject({
      name: "ThemeValidationError",
      diagnostics: [
        expect.objectContaining({
          severity: "error",
          code: "unknown-theme",
          field: "theme ref"
        })
      ]
    });
    await expect(registry.loadThemeWithDiagnostics("missing")).rejects.toMatchObject({
      name: "ThemeValidationError",
      diagnostics: [
        expect.objectContaining({
          severity: "error",
          code: "unknown-theme",
          field: "theme ref"
        })
      ]
    });
  });
});
