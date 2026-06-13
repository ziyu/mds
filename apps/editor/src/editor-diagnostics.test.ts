import { describe, expect, it } from "vitest";
import {
  splitRenderDiagnostics,
  themeBuildDiagnosticToEditorDiagnostic,
  withDiagnosticSource,
  withDiagnosticsSource
} from "./editor-diagnostics.js";

describe("editor diagnostics", () => {
  it("adds source metadata to diagnostics", () => {
    expect(
      withDiagnosticSource(
        {
          severity: "warning",
          code: "sample",
          message: "Sample diagnostic."
        },
        "renderer"
      )
    ).toEqual({
      severity: "warning",
      code: "sample",
      message: "Sample diagnostic.",
      source: "renderer"
    });

    expect(
      withDiagnosticsSource(
        [
          {
            severity: "error",
            code: "parse-error",
            message: "Parser failed."
          }
        ],
        "parser"
      )
    ).toEqual([
      {
        severity: "error",
        code: "parse-error",
        message: "Parser failed.",
        source: "parser"
      }
    ]);
  });

  it("splits render diagnostics into parser and renderer sources", () => {
    const parserDiagnostic = {
      severity: "error" as const,
      code: "invalid-frontmatter",
      message: "Frontmatter is invalid."
    };
    const rendererDiagnostic = {
      severity: "warning" as const,
      code: "missing-action-handler",
      message: "No handler registered."
    };

    expect(splitRenderDiagnostics([parserDiagnostic, rendererDiagnostic], [parserDiagnostic])).toEqual([
      {
        ...parserDiagnostic,
        source: "parser"
      },
      {
        ...rendererDiagnostic,
        source: "renderer"
      }
    ]);
  });

  it("converts serializable builder diagnostics to editor diagnostics", () => {
    expect(
      themeBuildDiagnosticToEditorDiagnostic({
        severity: "error",
        code: "theme-build-error",
        message: "Could not resolve CSS asset.",
        stage: "merge-assets",
        field: "mdsTheme.assets.css",
        path: "/project/themes/clean/src/missing.css"
      })
    ).toEqual({
      severity: "error",
      code: "builder:theme-build-error",
      message:
        "Could not resolve CSS asset. (merge-assets / mdsTheme.assets.css / /project/themes/clean/src/missing.css)",
      source: "builder"
    });
  });
});
