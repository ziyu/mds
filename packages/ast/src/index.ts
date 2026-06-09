export type MdsNode =
  | DocumentNode
  | MarkdownNode
  | MdsBlockNode
  | SlotNode
  | ActionLinkNode
  | MediaDirectiveNode
  | FormFieldNode
  | StateDeclarationNode
  | InterpolationNode;

export interface PositionPoint {
  line: number;
  column: number;
  offset?: number;
}

export interface Position {
  start: PositionPoint;
  end: PositionPoint;
}

export type DiagnosticSeverity = "error" | "warning" | "info";

export interface Diagnostic {
  code: string;
  message: string;
  severity: DiagnosticSeverity;
  position?: Position;
}

export interface DocumentNode {
  type: "document";
  frontmatter: Record<string, unknown>;
  children: MdsNode[];
  diagnostics: Diagnostic[];
  position?: Position;
}

export interface MarkdownNode {
  type: "markdown";
  value: string;
  position?: Position;
}

export interface MdsBlockNode {
  type: "block";
  blockType: string;
  name?: string;
  children: MdsNode[];
  slots?: SlotNode[];
  position?: Position;
}

export interface SlotNode {
  type: "slot";
  name: string;
  children: MdsNode[];
  position?: Position;
}

export type ActionLinkKind = "primary" | "secondary" | "external" | "command";

export interface ActionLinkNode {
  type: "actionLink";
  label: string;
  kind: ActionLinkKind;
  target?: string;
  action?: string;
  args: string[];
  position?: Position;
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

export interface MediaDirectiveNode {
  type: "mediaDirective";
  mediaType: MediaDirectiveKind;
  target: string;
  position?: Position;
}

export interface FormFieldNode {
  type: "formField";
  name: string;
  fieldType: string;
  label: string;
  options?: string[];
  position?: Position;
}

export interface StateDeclarationNode {
  type: "stateDeclaration";
  name: string;
  value: string;
  position?: Position;
}

export interface InterpolationNode {
  type: "interpolation";
  path: string;
  position?: Position;
}
