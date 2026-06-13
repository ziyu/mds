import { describe, expect, it } from "vitest";
import {
  isThemeValidationProviderErrorBody,
  serializeThemeValidationErrorBody
} from "./theme-validation-contract.js";
import type { ThemeDiagnostic } from "@mds/theme-loader/browser";

describe("theme validation contract", () => {
  it("serializes theme validation errors for the browser provider", () => {
    const diagnostics: ThemeDiagnostic[] = [
      {
        severity: "error",
        code: "invalid-theme-manifest",
        message: "Theme has invalid theme.json.",
        field: "theme.json",
        path: "themes/broken/theme.json"
      }
    ];
    const body = serializeThemeValidationErrorBody(diagnostics, "Theme validation failed.");

    expect(body).toEqual({
      name: "ThemeValidationError",
      message: "Theme validation failed.",
      diagnostics
    });
    expect(isThemeValidationProviderErrorBody(body)).toBe(true);
  });

  it("rejects malformed theme validation error bodies", () => {
    expect(
      isThemeValidationProviderErrorBody({
        message: "Theme validation failed.",
        diagnostics: [
          {
            severity: "error",
            code: "invalid-theme-manifest",
            message: "Theme has invalid theme.json.",
            path: 123
          }
        ]
      })
    ).toBe(false);
    expect(
      isThemeValidationProviderErrorBody({
        message: 123,
        diagnostics: []
      })
    ).toBe(false);
  });
});
