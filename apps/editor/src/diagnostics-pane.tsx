import type { Diagnostic } from "@mds/ast";

export interface DiagnosticsPaneProps {
  diagnostics: Diagnostic[];
}

export function DiagnosticsPane({ diagnostics }: DiagnosticsPaneProps) {
  return (
    <section className="diagnostics" aria-label="Diagnostics">
      <div className="diagnostics-header">
        <span>Diagnostics</span>
        <strong>{diagnostics.length}</strong>
      </div>
      {diagnostics.length === 0 ? (
        <p className="diagnostics-empty">No parser diagnostics.</p>
      ) : (
        <ul>
          {diagnostics.map((diagnostic, index) => (
            <li key={`${diagnostic.code}-${index}`} className={`diagnostic diagnostic-${diagnostic.severity}`}>
              <span>{diagnostic.severity}</span>
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
