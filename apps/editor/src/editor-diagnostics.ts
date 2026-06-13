import type { Diagnostic } from "@mds/ast";

export type EditorDiagnosticSource = "builder" | "parser" | "renderer" | "theme";

export interface BuilderDiagnosticInput extends Omit<Diagnostic, "severity"> {
  severity: "error" | "warning";
  stage?: string;
  field?: string;
  path?: string;
  block?: string;
}

export interface EditorDiagnostic extends Diagnostic {
  source: EditorDiagnosticSource;
}

export function withDiagnosticSource(diagnostic: Diagnostic, source: EditorDiagnosticSource): EditorDiagnostic {
  return {
    ...diagnostic,
    source
  };
}

export function withDiagnosticsSource(
  diagnostics: Diagnostic[],
  source: EditorDiagnosticSource
): EditorDiagnostic[] {
  return diagnostics.map((diagnostic) => withDiagnosticSource(diagnostic, source));
}

export function splitRenderDiagnostics(
  renderDiagnostics: Diagnostic[],
  parserDiagnostics: Diagnostic[]
): EditorDiagnostic[] {
  const parserCount = parserDiagnostics.length;
  return [
    ...withDiagnosticsSource(renderDiagnostics.slice(0, parserCount), "parser"),
    ...withDiagnosticsSource(renderDiagnostics.slice(parserCount), "renderer")
  ];
}

export function themeBuildDiagnosticToEditorDiagnostic(diagnostic: BuilderDiagnosticInput): EditorDiagnostic {
  const location = [diagnostic.stage, diagnostic.field, diagnostic.path, diagnostic.block].filter(Boolean).join(" / ");

  return {
    severity: diagnostic.severity,
    code: `builder:${diagnostic.code}`,
    message: location.length === 0 ? diagnostic.message : `${diagnostic.message} (${location})`,
    source: "builder"
  };
}
