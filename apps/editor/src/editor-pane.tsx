import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { markdown } from "@codemirror/lang-markdown";
import { Prec, type EditorState, type Extension, type Text } from "@codemirror/state";
import { foldEffect, foldedRanges, unfoldEffect } from "@codemirror/language";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  GutterMarker,
  ViewPlugin,
  ViewUpdate,
  gutter
} from "@codemirror/view";
import { basicSetup } from "codemirror";
import {
  createMdsContainerAutoCloseInsertion,
  isInsideMarkdownCodeFence,
  isMdsClosingBlockLine,
  isMdsContainerOpeningLine,
  matchMdsBlockLine
} from "./mds-editor-syntax.js";

export interface EditorPaneProps {
  value: string;
  onChange: (value: string) => void;
}

export interface EditorPaneHandle {
  foldAllMds: () => void;
  unfoldAllMds: () => void;
}

export const EditorPane = forwardRef<EditorPaneHandle, EditorPaneProps>(function EditorPane(
  { value, onChange },
  ref
) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useImperativeHandle(ref, () => ({
    foldAllMds() {
      const view = viewRef.current;

      if (view === null) {
        return;
      }

      foldAllMdsRanges(view);
    },
    unfoldAllMds() {
      const view = viewRef.current;

      if (view === null) {
        return;
      }

      unfoldAllMdsRanges(view);
    }
  }), []);

  useEffect(() => {
    if (hostRef.current === null || viewRef.current !== null) {
      return;
    }

    const view = new EditorView({
      doc: value,
      parent: hostRef.current,
      extensions: [
        mdsContainerAutoClose,
        basicSetup,
        markdown(),
        mdsFoldGutter,
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
});

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

const mdsLeafBlockLine = Decoration.line({
  attributes: {
    class: "cm-mds-block-line cm-mds-leaf-block-line"
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

interface MdsFoldRange {
  from: number;
  to: number;
}

interface MdsBlockFrame {
  lineNumber: number;
  start: number;
  contentStart: number;
}

class MdsFoldMarker extends GutterMarker {
  constructor(readonly open: boolean) {
    super();
  }

  eq(other: GutterMarker): boolean {
    return other instanceof MdsFoldMarker && other.open === this.open;
  }

  toDOM(): Node {
    const marker = document.createElement("span");
    marker.className = "cm-mds-fold-marker";
    marker.textContent = this.open ? "⌄" : "›";
    marker.title = this.open ? "Fold MDS block" : "Unfold MDS block";
    return marker;
  }
}

const mdsOpenFoldMarker = new MdsFoldMarker(true);
const mdsClosedFoldMarker = new MdsFoldMarker(false);

const mdsFoldGutter = gutter({
  class: "cm-mds-foldGutter",
  lineMarker(view, line) {
    const range = findMdsFoldRange(view.state.doc, line.from);

    if (range === null) {
      return null;
    }

    return findFoldedMdsRange(view.state, range) === null ? mdsOpenFoldMarker : mdsClosedFoldMarker;
  },
  lineMarkerChange(update) {
    return update.docChanged || update.viewportChanged || foldedRanges(update.startState) !== foldedRanges(update.state);
  },
  domEventHandlers: {
    click(view, line, event) {
      const range = findMdsFoldRange(view.state.doc, line.from);

      if (range === null) {
        return false;
      }

      event.preventDefault();
      const folded = findFoldedMdsRange(view.state, range);
      view.dispatch({
        effects: folded === null ? foldEffect.of(range) : unfoldEffect.of(folded)
      });
      return true;
    }
  }
});

const mdsContainerAutoClose = Prec.high(EditorView.domEventHandlers({
  keydown(event, view) {
    if (
      event.key !== "Enter" ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      event.shiftKey ||
      view.state.selection.ranges.length !== 1
    ) {
      return false;
    }

    const selection = view.state.selection.main;
    if (!selection.empty) {
      return false;
    }

    const line = view.state.doc.lineAt(selection.head);
    if (isInsideMarkdownCodeFence(view.state.doc, line.number)) {
      return false;
    }

    const insertion = createMdsContainerAutoCloseInsertion(line.text, selection.head - line.from);
    if (insertion === undefined) {
      return false;
    }

    event.preventDefault();
    view.dispatch({
      changes: {
        from: selection.head,
        insert: insertion.text
      },
      selection: {
        anchor: selection.head + insertion.cursorOffset
      },
      scrollIntoView: true
    });
    return true;
  }
}));

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

function findFoldedMdsRange(state: EditorState, range: MdsFoldRange): MdsFoldRange | null {
  let folded: MdsFoldRange | null = null;

  foldedRanges(state).between(range.from, range.from, (from, to) => {
    if (from === range.from && to === range.to) {
      folded = { from, to };
    }
  });

  return folded;
}

function foldAllMdsRanges(view: EditorView): void {
  const ranges = collectTopLevelMdsFoldRanges(view.state.doc)
    .filter((range) => findFoldedMdsRange(view.state, range) === null);

  if (ranges.length === 0) {
    return;
  }

  view.dispatch({
    effects: ranges.map((range) => foldEffect.of(range))
  });
}

function unfoldAllMdsRanges(view: EditorView): void {
  const effects: ReturnType<typeof unfoldEffect.of>[] = [];

  foldedRanges(view.state).between(0, view.state.doc.length, (from, to) => {
    effects.push(unfoldEffect.of({ from, to }));
  });

  if (effects.length === 0) {
    return;
  }

  view.dispatch({ effects });
}

function collectTopLevelMdsFoldRanges(document: Text): MdsFoldRange[] {
  const ranges: MdsFoldRange[] = [];
  let foldedUntil = -1;

  for (let lineNumber = 1; lineNumber <= document.lines; lineNumber += 1) {
    const line = document.line(lineNumber);

    if (line.from < foldedUntil) {
      continue;
    }

    const range = findMdsFoldRange(document, line.from);

    if (range === null) {
      continue;
    }

    ranges.push(range);
    foldedUntil = range.to;
  }

  return ranges;
}

function findMdsFoldRange(document: Text, lineStart: number): MdsFoldRange | null {
  const line = document.lineAt(lineStart);
  const text = line.text;
  const frontmatterLines = readFrontmatterLineNumbers(document);

  if (frontmatterLines !== undefined && line.number >= frontmatterLines.from && line.number <= frontmatterLines.to) {
    return null;
  }

  if (isMdsContainerOpeningLine(text)) {
    return findMdsBlockFoldRange(document, line.number);
  }

  if (isMdsSlotLine(text)) {
    return findMdsSlotFoldRange(document, line.number);
  }

  return null;
}

function findMdsBlockFoldRange(document: Text, lineNumber: number): MdsFoldRange | null {
  const startLine = document.line(lineNumber);
  const stack: MdsBlockFrame[] = [
    {
      lineNumber,
      start: startLine.from,
      contentStart: startLine.to
    }
  ];

  for (let currentLineNumber = lineNumber + 1; currentLineNumber <= document.lines; currentLineNumber += 1) {
    const line = document.line(currentLineNumber);

    if (isMdsContainerOpeningLine(line.text)) {
      stack.push({
        lineNumber: currentLineNumber,
        start: line.from,
        contentStart: line.to
      });
      continue;
    }

    if (!isMdsClosingBlockLine(line.text)) {
      continue;
    }

    const currentBlock = stack.pop();

    if (currentBlock === undefined) {
      continue;
    }

    if (currentBlock.lineNumber === lineNumber) {
      return createFoldRange(currentBlock.contentStart, line.to);
    }
  }

  return createFoldRange(startLine.to, document.length);
}

function findMdsSlotFoldRange(document: Text, lineNumber: number): MdsFoldRange | null {
  const startLine = document.line(lineNumber);
  const parentBlockEndLine = findContainingMdsBlockEndLine(document, lineNumber);
  const limitLineNumber = parentBlockEndLine ?? document.lines;

  for (let currentLineNumber = lineNumber + 1; currentLineNumber <= limitLineNumber; currentLineNumber += 1) {
    const line = document.line(currentLineNumber);

    if (isMdsSlotLine(line.text) || isMdsClosingBlockLine(line.text) || currentLineNumber === limitLineNumber) {
      return createFoldRange(startLine.to, line.from);
    }
  }

  return null;
}

function findContainingMdsBlockEndLine(document: Text, lineNumber: number): number | undefined {
  const stack: number[] = [];

  for (let currentLineNumber = 1; currentLineNumber <= document.lines; currentLineNumber += 1) {
    const line = document.line(currentLineNumber);

    if (isMdsContainerOpeningLine(line.text)) {
      stack.push(currentLineNumber);
      continue;
    }

    if (isMdsClosingBlockLine(line.text) && stack.length > 0) {
      const blockStartLine = stack.pop();

      if (blockStartLine !== undefined && blockStartLine < lineNumber && lineNumber < currentLineNumber) {
        return currentLineNumber;
      }
    }
  }

  return undefined;
}

function createFoldRange(from: number, to: number): MdsFoldRange | null {
  return to > from ? { from, to } : null;
}

function readFrontmatterLineNumbers(document: Text): { from: number; to: number } | undefined {
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

function isMdsSlotLine(text: string): boolean {
  return /^\s*---\s+\S/.test(text);
}

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
  const blockMatch = matchMdsBlockLine(text);
  if (blockMatch === undefined) {
    return;
  }

  const { indentLength, fence, type } = blockMatch;
  const fenceStart = lineStart + indentLength;

  addLine(
    ranges,
    lineStart,
    blockMatch.kind === "close"
      ? mdsClosingBlockLine
      : blockMatch.kind === "leaf"
        ? mdsLeafBlockLine
        : mdsBlockLine
  );
  addMark(ranges, fenceStart, fenceStart + fence.length, mdsMark.blockFence);

  if (type !== undefined) {
    const typeStart = text.indexOf(type, indentLength + fence.length);
    addMark(ranges, lineStart + typeStart, lineStart + typeStart + type.length, mdsMark.blockType);
  }

  const nameMatch = text.slice(blockMatch.matchedLength).match(/^\s+([A-Za-z0-9_-]+)(?=\s|$)/);
  const name = nameMatch?.[1];

  if (name !== undefined && nameMatch?.index !== undefined) {
    const nameStart = blockMatch.matchedLength + nameMatch[0].indexOf(name);
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
