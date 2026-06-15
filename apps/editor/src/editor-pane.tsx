import { useEffect, useRef } from "react";
import { markdown } from "@codemirror/lang-markdown";
import type { Extension } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate
} from "@codemirror/view";
import { basicSetup } from "codemirror";

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
        mdsEditorExtensions,
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

const mdsBlockLine = Decoration.line({
  attributes: {
    class: "cm-mds-block-line"
  }
});

const mdsClosingBlockLine = Decoration.line({
  attributes: {
    class: "cm-mds-block-line cm-mds-block-close-line"
  }
});

const mdsSlotLine = Decoration.line({
  attributes: {
    class: "cm-mds-slot-line"
  }
});

const mdsFrontmatterLine = Decoration.line({
  attributes: {
    class: "cm-mds-frontmatter-line"
  }
});

const mdsFormLine = Decoration.line({
  attributes: {
    class: "cm-mds-form-line"
  }
});

const mdsMark = {
  action: Decoration.mark({ class: "cm-mds-action" }),
  attr: Decoration.mark({ class: "cm-mds-attr" }),
  blockFence: Decoration.mark({ class: "cm-mds-block-fence" }),
  blockName: Decoration.mark({ class: "cm-mds-block-name" }),
  blockType: Decoration.mark({ class: "cm-mds-block-type" }),
  formMarker: Decoration.mark({ class: "cm-mds-form-marker" }),
  frontmatterKey: Decoration.mark({ class: "cm-mds-frontmatter-key" }),
  linkArrow: Decoration.mark({ class: "cm-mds-link-arrow" }),
  slotFence: Decoration.mark({ class: "cm-mds-slot-fence" }),
  slotName: Decoration.mark({ class: "cm-mds-slot-name" })
};

const mdsSelectionMark = Decoration.mark({
  class: "cm-mds-selection-token"
});

interface MdsDecorationRange {
  from: number;
  to: number;
  decoration: Decoration;
}

const mdsEditorExtensions: Extension[] = [
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = buildMdsDecorations(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = buildMdsDecorations(update.view);
        }
      }
    },
    {
      decorations: (plugin) => plugin.decorations
    }
  ),
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = buildMdsSelectionDecorations(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged || update.selectionSet || update.viewportChanged || update.focusChanged) {
          this.decorations = buildMdsSelectionDecorations(update.view);
        }
      }
    },
    {
      decorations: (plugin) => plugin.decorations
    }
  )
];

function buildMdsSelectionDecorations(view: EditorView): DecorationSet {
  if (view.state.selection.ranges.every((range) => range.empty)) {
    return Decoration.none;
  }

  const ranges: MdsDecorationRange[] = [];

  for (const selectionRange of view.state.selection.ranges) {
    if (selectionRange.empty) {
      continue;
    }

    for (const visibleRange of view.visibleRanges) {
      const from = Math.max(selectionRange.from, visibleRange.from);
      const to = Math.min(selectionRange.to, visibleRange.to);

      if (to > from) {
        addMark(ranges, from, to, mdsSelectionMark);
      }
    }
  }

  ranges.sort((left, right) => left.from - right.from || left.to - right.to);
  return Decoration.set(ranges.map((range) => range.decoration.range(range.from, range.to)), true);
}

function buildMdsDecorations(view: EditorView): DecorationSet {
  const ranges: MdsDecorationRange[] = [];
  const frontmatterLines = readFrontmatterLines(view);

  for (const visibleRange of view.visibleRanges) {
    let line = view.state.doc.lineAt(visibleRange.from);

    while (line.from <= visibleRange.to) {
      const text = line.text;
      const isFrontmatterLine =
        frontmatterLines !== undefined && line.number >= frontmatterLines.from && line.number <= frontmatterLines.to;

      if (isFrontmatterLine) {
        addLine(ranges, line.from, mdsFrontmatterLine);
        decorateFrontmatterLine(ranges, line.from, text);
      } else {
        decorateMdsLine(ranges, line.from, text);
      }

      if (line.to >= visibleRange.to || line.number >= view.state.doc.lines) {
        break;
      }

      line = view.state.doc.line(line.number + 1);
    }
  }

  ranges.sort((left, right) => left.from - right.from || left.to - right.to);
  return Decoration.set(ranges.map((range) => range.decoration.range(range.from, range.to)), true);
}

function readFrontmatterLines(view: EditorView): { from: number; to: number } | undefined {
  const document = view.state.doc;

  if (document.lines < 2 || document.line(1).text.trim() !== "---") {
    return undefined;
  }

  for (let lineNumber = 2; lineNumber <= document.lines; lineNumber += 1) {
    if (document.line(lineNumber).text.trim() === "---") {
      return {
        from: 1,
        to: lineNumber
      };
    }
  }

  return undefined;
}

function decorateMdsLine(ranges: MdsDecorationRange[], lineStart: number, text: string): void {
  decorateBlockLine(ranges, lineStart, text);
  decorateSlotLine(ranges, lineStart, text);
  decorateFormLine(ranges, lineStart, text);
  decorateActionLinks(ranges, lineStart, text);
}

function decorateBlockLine(ranges: MdsDecorationRange[], lineStart: number, text: string): void {
  const blockMatch = text.match(/^(\s*)(:{3,})(?:\s+([A-Za-z][\w-]*))?/);

  if (blockMatch === null) {
    return;
  }

  const indentLength = blockMatch[1]?.length ?? 0;
  const fence = blockMatch[2] ?? "";
  const type = blockMatch[3];
  const fenceStart = lineStart + indentLength;

  addLine(ranges, lineStart, type === undefined ? mdsClosingBlockLine : mdsBlockLine);
  addMark(ranges, fenceStart, fenceStart + fence.length, mdsMark.blockFence);

  if (type !== undefined && blockMatch.index !== undefined) {
    const typeStart = text.indexOf(type, indentLength + fence.length);
    addMark(ranges, lineStart + typeStart, lineStart + typeStart + type.length, mdsMark.blockType);
  }

  const nameMatch = text.slice(blockMatch[0].length).match(/^\s+([A-Za-z0-9_-]+)(?=\s|$)/);
  const name = nameMatch?.[1];

  if (name !== undefined && nameMatch?.index !== undefined) {
    const nameStart = blockMatch[0].length + nameMatch[0].indexOf(name);
    addMark(ranges, lineStart + nameStart, lineStart + nameStart + name.length, mdsMark.blockName);
  }

  decorateAttrs(ranges, lineStart, text);
}

function decorateSlotLine(ranges: MdsDecorationRange[], lineStart: number, text: string): void {
  const slotMatch = text.match(/^(\s*)(---)(?:\s+(.+?))?\s*$/);

  if (slotMatch === null) {
    return;
  }

  const indentLength = slotMatch[1]?.length ?? 0;
  const fence = slotMatch[2] ?? "";
  const name = slotMatch[3];
  const fenceStart = lineStart + indentLength;

  addLine(ranges, lineStart, mdsSlotLine);
  addMark(ranges, fenceStart, fenceStart + fence.length, mdsMark.slotFence);

  if (name !== undefined) {
    const nameStart = text.indexOf(name, indentLength + fence.length);
    addMark(ranges, lineStart + nameStart, lineStart + nameStart + name.length, mdsMark.slotName);
  }
}

function decorateFormLine(ranges: MdsDecorationRange[], lineStart: number, text: string): void {
  const formMatch = text.match(/^(\s*)(\?)\s+([A-Za-z][\w.-]*)/);

  if (formMatch === null) {
    return;
  }

  const indentLength = formMatch[1]?.length ?? 0;
  const markerStart = lineStart + indentLength;
  const fieldName = formMatch[3] ?? "";
  const fieldStart = text.indexOf(fieldName, indentLength + 1);

  addLine(ranges, lineStart, mdsFormLine);
  addMark(ranges, markerStart, markerStart + 1, mdsMark.formMarker);
  addMark(ranges, lineStart + fieldStart, lineStart + fieldStart + fieldName.length, mdsMark.blockName);
}

function decorateFrontmatterLine(ranges: MdsDecorationRange[], lineStart: number, text: string): void {
  const keyMatch = text.match(/^(\s*)([A-Za-z][\w.-]*)(\s*:)/);

  if (keyMatch === null) {
    return;
  }

  const key = keyMatch[2] ?? "";
  const keyStart = text.indexOf(key);
  addMark(ranges, lineStart + keyStart, lineStart + keyStart + key.length, mdsMark.frontmatterKey);
}

function decorateAttrs(ranges: MdsDecorationRange[], lineStart: number, text: string): void {
  const attrPattern = /(?:^|\s)([A-Za-z_:][\w:.-]*)(=)(?:"[^"]*"|'[^']*'|[^\s]+)/g;

  for (const match of text.matchAll(attrPattern)) {
    const key = match[1];

    if (key === undefined || match.index === undefined) {
      continue;
    }

    const keyStart = match.index + match[0].indexOf(key);
    addMark(ranges, lineStart + keyStart, lineStart + keyStart + key.length, mdsMark.attr);
  }
}

function decorateActionLinks(ranges: MdsDecorationRange[], lineStart: number, text: string): void {
  const actionPattern = /\[[^\]]*?(?:\s+(![A-Za-z][\w.-]*)(?:\s+[^\]]*)?|(->|=>)\s+[^\]]+)\]/g;

  for (const match of text.matchAll(actionPattern)) {
    if (match.index === undefined) {
      continue;
    }

    const action = match[1];
    const arrow = match[2];

    if (action !== undefined) {
      const actionStart = match.index + match[0].indexOf(action);
      addMark(ranges, lineStart + actionStart, lineStart + actionStart + action.length, mdsMark.action);
    }

    if (arrow !== undefined) {
      const arrowStart = match.index + match[0].indexOf(arrow);
      addMark(ranges, lineStart + arrowStart, lineStart + arrowStart + arrow.length, mdsMark.linkArrow);
    }
  }
}

function addLine(ranges: MdsDecorationRange[], from: number, decoration: Decoration): void {
  ranges.push({
    from,
    to: from,
    decoration
  });
}

function addMark(ranges: MdsDecorationRange[], from: number, to: number, decoration: Decoration): void {
  if (to <= from) {
    return;
  }

  ranges.push({
    from,
    to,
    decoration
  });
}
