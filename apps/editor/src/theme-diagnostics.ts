import { unknownThemeDiagnostic, type ThemeDiagnostic } from "@mds-crate/theme-loader/browser";
import type { EditorDiagnostic } from "./editor-diagnostics.js";

export function themeDiagnosticToDiagnostic(diagnostic: ThemeDiagnostic): EditorDiagnostic {
  const location = [diagnostic.field, diagnostic.path, diagnostic.block].filter(Boolean).join(" / ");

  return {
    severity: diagnostic.severity,
    code: `theme:${diagnostic.code}`,
    message: location.length === 0 ? diagnostic.message : `${diagnostic.message} (${location})`,
    source: "theme"
  };
}

export function themeErrorToDiagnostic(message: string): EditorDiagnostic {
  return {
    severity: "error",
    code: "theme:load-error",
    message,
    source: "theme"
  };
}

export function unknownThemeRefMessage(ref: string): string {
  return unknownThemeDiagnostic(ref).message;
}

export function unknownThemeRefToDiagnostic(ref: string): EditorDiagnostic {
  return themeDiagnosticToDiagnostic(unknownThemeDiagnostic(ref));
}
