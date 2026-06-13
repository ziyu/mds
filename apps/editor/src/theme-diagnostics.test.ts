import { describe, expect, it } from "vitest";
import {
  themeDiagnosticToDiagnostic,
  themeErrorToDiagnostic,
  unknownThemeRefMessage,
  unknownThemeRefToDiagnostic
} from "./theme-diagnostics.js";

describe("theme diagnostics", () => {
  it("converts theme diagnostics to editor diagnostics", () => {
    expect(
      themeDiagnosticToDiagnostic({
        severity: "warning",
        code: "duplicate-theme-block-template",
        message: "Theme block is defined more than once.",
        path: "blocks/hero.html",
        block: "hero"
      })
    ).toEqual({
      severity: "warning",
      code: "theme:duplicate-theme-block-template",
      message: "Theme block is defined more than once. (blocks/hero.html / hero)",
      source: "theme"
    });
  });

  it("creates a diagnostic for generic theme load failures", () => {
    expect(themeErrorToDiagnostic("Network failed")).toEqual({
      severity: "error",
      code: "theme:load-error",
      message: "Network failed",
      source: "theme"
    });
  });

  it("creates a structured diagnostic for unknown theme refs", () => {
    expect(unknownThemeRefMessage("missing")).toBe("Unknown theme: missing.");
    expect(unknownThemeRefToDiagnostic("missing")).toEqual({
      severity: "error",
      code: "theme:unknown-theme",
      message: "Unknown theme: missing. (theme ref)",
      source: "theme"
    });
  });
});
