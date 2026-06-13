import type { EditorDiagnostic } from "./editor-diagnostics.js";

export interface DiagnosticsPaneProps {
  diagnostics: EditorDiagnostic[];
}

export function DiagnosticsPane({ diagnostics }: DiagnosticsPaneProps) {
  return (
    <section className="diagnostics" aria-label="Diagnostics">
      <div className="diagnostics-header">
        <span>Diagnostics</span>
        <strong>{diagnostics.length}</strong>
      </div>
      {diagnostics.length === 0 ? (
        <p className="diagnostics-empty">No diagnostics.</p>
      ) : (
        <ul>
          {diagnostics.map((diagnostic, index) => (
            <li key={`${diagnostic.code}-${index}`} className={`diagnostic diagnostic-${diagnostic.severity}`}>
              <span className="diagnostic-source">{diagnostic.source}</span>
              <span className="diagnostic-severity">{diagnostic.severity}</span>
              <code>{diagnostic.code}</code>
              <p>{diagnostic.message}</p>
              {diagnostic.position === undefined ? null : (
                <small>
                  {diagnostic.position.start.line}:{diagnostic.position.start.column}
                </small>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
