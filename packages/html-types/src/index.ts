import type { MdsBlockNode, MdsNode, SlotNode } from "@mds/ast";

export interface HtmlTheme {
  name: string;
  css?: string;
  blockRenderers?: HtmlBlockRenderers;
}

export type HtmlBlockRenderer = (block: MdsBlockNode, context: HtmlRenderContext) => string;

export type HtmlBlockRenderers = Partial<Record<string, HtmlBlockRenderer>>;

export interface HtmlRenderContext {
  states: ReadonlyMap<string, string>;
  lists: ReadonlyMap<string, string[]>;
  locals: ReadonlyMap<string, string>;
  renderNode: (node: MdsNode) => string;
  renderChildren: (children: MdsNode[]) => string;
  renderChildrenWithLocals: (children: MdsNode[], locals: ReadonlyMap<string, string>) => string;
  renderSlottedContainer: (block: MdsBlockNode, slots: SlotNode[], className: string) => string;
  getSlots: (block: MdsBlockNode) => SlotNode[];
  getContentChildren: (block: MdsBlockNode) => MdsNode[];
  resolveValue: (path: string) => string;
  escapeHtml: (value: string) => string;
  escapeAttribute: (value: string) => string;
}
