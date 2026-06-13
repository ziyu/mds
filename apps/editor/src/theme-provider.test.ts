import { ThemeValidationError } from "@mds/theme-loader/browser";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildThemePackageWithDiagnostics,
  inspectThemeWithDiagnostics,
  loadThemeWithDiagnostics,
  themeProvider,
  ThemeBuildProviderError
} from "./theme-provider.js";
import { serializeThemeValidationErrorBody } from "./theme-validation-contract.js";

describe("theme provider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("restores structured theme diagnostics from server errors", async () => {
    const diagnostics = [
      {
        severity: "error" as const,
        code: "invalid-theme-manifest",
        message: "Theme has invalid theme.json.",
        field: "theme.json",
        path: "themes/broken/theme.json"
      }
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(serializeThemeValidationErrorBody(diagnostics, "Theme validation failed.")), {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      }))
    );

    await expect(loadThemeWithDiagnostics("broken")).rejects.toMatchObject({
      name: "ThemeValidationError",
      diagnostics
    } satisfies Partial<ThemeValidationError>);
  });

  it("restores structured unknown theme diagnostics from not found responses", async () => {
    const diagnostics = [
      {
        severity: "error" as const,
        code: "unknown-theme",
        message: "Unknown theme: missing.",
        field: "theme ref"
      }
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(serializeThemeValidationErrorBody(diagnostics, "Unknown theme: missing.")), {
        status: 404,
        headers: {
          "Content-Type": "application/json"
        }
      }))
    );

    await expect(loadThemeWithDiagnostics("missing")).rejects.toMatchObject({
      name: "ThemeValidationError",
      diagnostics
    } satisfies Partial<ThemeValidationError>);
  });

  it("rejects malformed theme source responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({
        manifest: {
          name: "broken"
        }
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      }))
    );

    await expect(loadThemeWithDiagnostics("broken")).rejects.toThrow("Invalid theme source response.");
  });

  it("rejects malformed theme list responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify([{ name: "default" }]), {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      }))
    );

    await expect(themeProvider.listThemes()).rejects.toThrow("Invalid theme list response.");
  });

  it("requests package theme builds through the dev server endpoint", async () => {
    const result = {
      packageDirectory: "/project/themes/clarity",
      outputDirectory: "/project/themes/clarity/dist/theme",
      sourcePath: "/project/themes/clarity/src/theme.tsx",
      inputFiles: ["/project/themes/clarity/package.json"],
      filesWritten: ["theme.json"],
      diagnostics: []
    };
    const fetch = vi.fn(async () => new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    }));
    vi.stubGlobal("fetch", fetch);

    await expect(buildThemePackageWithDiagnostics("clarity")).resolves.toEqual(result);
    expect(fetch).toHaveBeenCalledWith("/__mds/theme-build/clarity", {
      method: "POST"
    });
  });

  it("requests theme inspections through the dev server endpoint", async () => {
    const result = {
      ref: "clarity",
      artifactDirectory: "/project/themes/clarity/dist/theme",
      name: "clarity",
      tags: ["docs"],
      supportedBlocks: ["hero"],
      files: ["theme.json", "blocks/hero.html"],
      runtimeFiles: ["theme.json", "blocks/hero.html"],
      developmentFiles: [],
      assets: {
        css: [],
        js: [],
        head: []
      },
      blocks: ["hero"],
      actions: [],
      diagnostics: []
    };
    const fetch = vi.fn(async () => new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    }));
    vi.stubGlobal("fetch", fetch);

    await expect(inspectThemeWithDiagnostics("clarity")).resolves.toEqual(result);
    expect(fetch).toHaveBeenCalledWith("/__mds/theme-inspect/clarity");
  });

  it("rejects malformed theme inspection responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({
        ref: "clarity",
        artifactDirectory: "/project/themes/clarity/dist/theme",
        name: "clarity",
        diagnostics: []
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      }))
    );

    await expect(inspectThemeWithDiagnostics("clarity")).rejects.toThrow("Invalid theme inspection response.");
  });

  it("restores structured builder diagnostics from theme inspection failures", async () => {
    const diagnostics = [
      {
        severity: "error" as const,
        code: "theme-build-error",
        message: "Theme artifact could not be inspected.",
        stage: "read-artifact" as const,
        field: "theme artifact",
        path: "/project/themes/broken"
      }
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ message: "Theme inspection failed.", diagnostics }), {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      }))
    );

    await expect(inspectThemeWithDiagnostics("broken")).rejects.toMatchObject({
      name: "ThemeBuildProviderError",
      message: "Theme inspection failed.",
      diagnostics
    } satisfies Partial<ThemeBuildProviderError>);
  });

  it("rejects malformed package theme build responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({
        outputDirectory: "/project/themes/clarity/dist/theme",
        sourcePath: "/project/themes/clarity/src/theme.tsx",
        inputFiles: ["/project/themes/clarity/package.json"],
        filesWritten: ["theme.json"],
        diagnostics: []
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      }))
    );

    await expect(buildThemePackageWithDiagnostics("clarity")).rejects.toThrow("Invalid theme build response.");
  });

  it("restores structured builder diagnostics from package build failures", async () => {
    const diagnostics = [
      {
        severity: "error" as const,
        code: "theme-build-error",
        message: "Could not resolve CSS asset.",
        stage: "merge-assets" as const,
        field: "mdsTheme.assets.css",
        path: "/project/themes/clarity/src/missing.css"
      }
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ message: "Theme build failed.", diagnostics }), {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      }))
    );

    await expect(buildThemePackageWithDiagnostics("clarity")).rejects.toMatchObject({
      name: "ThemeBuildProviderError",
      diagnostics
    } satisfies Partial<ThemeBuildProviderError>);
  });

  it("restores structured theme diagnostics from package build failures", async () => {
    const diagnostics = [
      {
        severity: "error" as const,
        code: "unknown-theme",
        message: "Unknown theme: missing.",
        field: "theme ref"
      }
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify(serializeThemeValidationErrorBody(diagnostics, "Unknown theme: missing.")), {
        status: 404,
        headers: {
          "Content-Type": "application/json"
        }
      }))
    );

    await expect(buildThemePackageWithDiagnostics("missing")).rejects.toMatchObject({
      name: "ThemeValidationError",
      diagnostics
    } satisfies Partial<ThemeValidationError>);
  });

  it("rejects malformed structured builder diagnostics from package build failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({
        message: "Theme build failed.",
        diagnostics: [
          {
            severity: "error",
            code: "theme-build-error",
            message: "Could not resolve CSS asset.",
            stage: 123
          }
        ]
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      }))
    );

    await expect(buildThemePackageWithDiagnostics("clarity")).rejects.toThrow(
      JSON.stringify({
        message: "Theme build failed.",
        diagnostics: [
          {
            severity: "error",
            code: "theme-build-error",
            message: "Could not resolve CSS asset.",
            stage: 123
          }
        ]
      })
    );
  });
});
