export type MdsNode =
  | DocumentNode
  | MarkdownNode
  | TextNode
  | MdsBlockNode
  | SlotNode
  | ActionLinkNode
  | MediaDirectiveNode
  | FormFieldNode
  | StateDeclarationNode
  | ListDeclarationNode
  | InterpolationNode
  | ConditionBlockNode
  | EachBlockNode
  | DataBlockNode;

export type MarkdownInlineNode = TextNode | ActionLinkNode | InterpolationNode;

export interface PositionPoint {
  line: number;
  column: number;
  offset?: number;
}

export interface Position {
  start: PositionPoint;
  end: PositionPoint;
}

export interface BaseNode {
  type: string;
  position?: Position;
}

export type DiagnosticSeverity = "error" | "warning" | "info";

export interface Diagnostic {
  code: string;
  message: string;
  severity: DiagnosticSeverity;
  position?: Position;
}

export interface DocumentNode extends BaseNode {
  type: "document";
  frontmatter: Record<string, unknown>;
  children: MdsNode[];
  diagnostics: Diagnostic[];
}

export interface TextNode extends BaseNode {
  type: "text";
  value: string;
}

export interface MarkdownNode extends BaseNode {
  type: "markdown";
  value: string;
  inlines: MarkdownInlineNode[];
}

export interface MdsBlockNode extends BaseNode {
  type: "block";
  blockType: string;
  name?: string;
  children: MdsNode[];
  slots?: SlotNode[];
}

export interface SlotNode extends BaseNode {
  type: "slot";
  name: string;
  children: MdsNode[];
}

export type ActionLinkKind = "primary" | "secondary" | "external" | "command";

export interface ActionLinkNode extends BaseNode {
  type: "actionLink";
  label: string;
  kind: ActionLinkKind;
  target?: string;
  action?: string;
  args: string[];
}

export type MediaDirectiveKind =
  | "video"
  | "audio"
  | "embed"
  | "model"
  | "chart"
  | "map"
  | "file"
  | "download";

export interface MediaDirectiveNode extends BaseNode {
  type: "mediaDirective";
  mediaType: MediaDirectiveKind;
  target: string;
}

export interface FormFieldNode extends BaseNode {
  type: "formField";
  name: string;
  fieldType: string;
  label: string;
  options?: string[];
}

export interface StateDeclarationNode extends BaseNode {
  type: "stateDeclaration";
  name: string;
  value: string;
}

export interface ListDeclarationNode extends BaseNode {
  type: "listDeclaration";
  name: string;
  items: string[];
}

export interface InterpolationNode extends BaseNode {
  type: "interpolation";
  path: string;
}

export interface ConditionBlockNode extends BaseNode {
  type: "conditionBlock";
  condition: "if" | "unless";
  name: string;
  children: MdsNode[];
  slots?: SlotNode[];
}

export interface EachBlockNode extends BaseNode {
  type: "eachBlock";
  listName: string;
  children: MdsNode[];
  slots?: SlotNode[];
}

export interface DataBlockNode extends BaseNode {
  type: "dataBlock";
  name: string;
  value: string;
  children: MdsNode[];
}
