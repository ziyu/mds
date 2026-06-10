import { useEffect, useRef } from "react";
import { markdown } from "@codemirror/lang-markdown";
import { EditorView, basicSetup } from "codemirror";

export interface EditorPaneProps {
  value: string;
  onChange: (value: string) => void;
}

export function EditorPane({ value, onChange }: EditorPaneProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (hostRef.current === null || viewRef.current !== null) {
      return;
    }

    const view = new EditorView({
      doc: value,
      parent: hostRef.current,
      extensions: [
        basicSetup,
        markdown(),
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        })
      ]
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (view === null) {
      return;
    }

    const current = view.state.doc.toString();
    if (current === value) {
      return;
    }

    view.dispatch({
      changes: {
        from: 0,
        to: current.length,
        insert: value
      }
    });
  }, [value]);

  return <div ref={hostRef} className="editor-host" />;
}
