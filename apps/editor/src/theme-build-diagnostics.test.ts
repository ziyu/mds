import { ThemeValidationError } from "@mds-crate/theme-loader/browser";
import { describe, expect, it } from "vitest";
import {
  themeBuildErrorToEditorDiagnostics,
  themeBuildProviderDiagnosticsToEditorDiagnostics
} from "./theme-build-diagnostics.js";
import { ThemeBuildProviderError } from "./theme-provider.js";

describe("theme build diagnostics", () => {
  it("keeps theme validation errors as theme diagnostics during build", () => {
    const diagnostics = themeBuildErrorToEditorDiagnostics(
      new ThemeValidationError([
        {
          severity: "error",
          code: "unknown-theme",
          message: "Unknown theme: missing.",
          field: "theme ref"
        }
      ]),
      "Unknown theme: missing."
    );

    expect(diagnostics).toEqual([
      {
        severity: "error",
        code: "theme:unknown-theme",
        message: "Unknown theme: missing. (theme ref)",
        source: "theme"
      }
    ]);
  });

  it("keeps provider build errors as builder diagnostics", () => {
    const diagnostics = themeBuildErrorToEditorDiagnostics(
      new ThemeBuildProviderError([
        {
          severity: "error",
          code: "theme-build-error",
          message: "Could not resolve CSS asset.",
          stage: "merge-assets",
          field: "mdsTheme.assets.css"
        }
      ]),
      "Theme build failed."
    );

    expect(diagnostics).toEqual([
      {
        severity: "error",
        code: "builder:theme-build-error",
        message: "Could not resolve CSS asset. (merge-assets / mdsTheme.assets.css)",
        source: "builder"
      }
    ]);
  });

  it("classifies mixed HMR build diagnostics by their contract shape", () => {
    expect(
      themeBuildProviderDiagnosticsToEditorDiagnostics([
        {
          severity: "error",
          code: "unknown-theme",
          message: "Unknown theme: missing.",
          field: "theme ref"
        },
        {
          severity: "error",
          code: "theme-build-error",
          message: "Unexpected build failure."
        }
      ])
    ).toEqual([
      {
        severity: "error",
        code: "theme:unknown-theme",
        message: "Unknown theme: missing. (theme ref)",
        source: "theme"
      },
      {
        severity: "error",
        code: "builder:theme-build-error",
        message: "Unexpected build failure.",
        source: "builder"
      }
    ]);
  });

  it("falls back to a theme load diagnostic for opaque build errors", () => {
    expect(themeBuildErrorToEditorDiagnostics(new Error("Network failed."), "Network failed.")).toEqual([
      {
        severity: "error",
        code: "theme:load-error",
        message: "Network failed.",
        source: "theme"
      }
    ]);
  });
});
