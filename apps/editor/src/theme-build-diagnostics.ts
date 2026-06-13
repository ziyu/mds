import { ThemeValidationError } from "@mds/theme-loader/browser";
import { themeBuildDiagnosticToEditorDiagnostic, type EditorDiagnostic } from "./editor-diagnostics.js";
import { themeDiagnosticToDiagnostic, themeErrorToDiagnostic } from "./theme-diagnostics.js";
import { ThemeBuildProviderError } from "./theme-provider.js";
import type { ThemeBuildProviderDiagnostic } from "./theme-build-contract.js";

export function themeBuildErrorToEditorDiagnostics(error: unknown, message: string): EditorDiagnostic[] {
  if (error instanceof ThemeValidationError) {
    return error.diagnostics.map(themeDiagnosticToDiagnostic);
  }

  if (error instanceof ThemeBuildProviderError) {
    return themeBuildProviderDiagnosticsToEditorDiagnostics(error.diagnostics);
  }

  return [themeErrorToDiagnostic(message)];
}

export function themeBuildProviderDiagnosticsToEditorDiagnostics(
  diagnostics: ThemeBuildProviderDiagnostic[]
): EditorDiagnostic[] {
  return diagnostics.map((diagnostic) =>
    isBuilderDiagnostic(diagnostic)
      ? themeBuildDiagnosticToEditorDiagnostic(diagnostic)
      : themeDiagnosticToDiagnostic(diagnostic)
  );
}

function isBuilderDiagnostic(diagnostic: ThemeBuildProviderDiagnostic): boolean {
  return diagnostic.stage !== undefined || diagnostic.code === "theme-build-error";
}
