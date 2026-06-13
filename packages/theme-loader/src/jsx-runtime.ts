export const Fragment = Symbol.for("mds.jsx.fragment");

export type JsxPrimitive = string | number | boolean | null | undefined;
export type JsxChild = JsxPrimitive | RawHtml | JsxElement | JsxChild[];
export type JsxComponent<P extends object = Record<string, unknown>> = (props: P & { children?: JsxChild }) => JsxChild;
export type JsxType<P extends object = Record<string, unknown>> = string | typeof Fragment | JsxComponent<P>;

export interface JsxElement {
  type: JsxType;
  props: Record<string, unknown>;
}

export interface RawHtml {
  __rawHtml: string;
}

export function jsx<P extends object = Record<string, unknown>>(
  type: JsxType<P>,
  props: (P & { children?: JsxChild }) | null,
  ...children: JsxChild[]
): JsxChild {
  return createElement(type, props, ...children);
}

export const jsxs = jsx;

export function createElement<P extends object = Record<string, unknown>>(
  type: JsxType<P>,
  props: (P & { children?: JsxChild }) | null,
  ...children: JsxChild[]
): JsxChild {
  const normalizedProps = {
    ...(props ?? {}),
    ...(children.length === 0 ? {} : { children: children.length === 1 ? children[0] : children })
  };

  if (typeof type === "function") {
    return type(normalizedProps as never);
  }

  return {
    type,
    props: normalizedProps
  };
}

export function raw(value: string): RawHtml {
  return {
    __rawHtml: value
  };
}

export function renderJsxNode(node: JsxChild): string {
  if (node === null || node === undefined || typeof node === "boolean") {
    return "";
  }

  if (typeof node === "string" || typeof node === "number") {
    return escapeHtml(String(node));
  }

  if (Array.isArray(node)) {
    return node.map((child) => renderJsxNode(child)).join("");
  }

  if (isRawHtml(node)) {
    return node.__rawHtml;
  }

  if (node.type === Fragment) {
    return renderJsxNode(node.props.children as JsxChild);
  }

  if (typeof node.type !== "string") {
    return renderJsxNode(node.type(node.props as never));
  }

  const attributes = renderAttributes(node.props);
  const children = renderJsxNode(node.props.children as JsxChild);
  return `<${node.type}${attributes}>${children}</${node.type}>`;
}

export function isRawHtml(value: unknown): value is RawHtml {
  return typeof value === "object" && value !== null && "__rawHtml" in value && typeof value.__rawHtml === "string";
}

function renderAttributes(props: Record<string, unknown>): string {
  const rawAttrs = props.rawAttrs;
  const entries = Object.entries(props)
    .filter(([name]) => name !== "children" && name !== "rawAttrs")
    .flatMap(([name, value]) => renderAttribute(name, value));
  const renderedRawAttrs = isRawHtml(rawAttrs) ? rawAttrs.__rawHtml : "";

  return `${entries.join("")}${renderedRawAttrs}`;
}

function renderAttribute(name: string, value: unknown): string[] {
  if (value === false || value === null || value === undefined) {
    return [];
  }

  const attributeName = normalizeAttributeName(name);
  if (value === true) {
    return [` ${attributeName}`];
  }

  const attributeValue = isRawHtml(value) ? value.__rawHtml : String(value);
  return [` ${attributeName}="${escapeAttribute(attributeValue)}"`];
}

function normalizeAttributeName(name: string): string {
  if (name === "className") {
    return "class";
  }

  if (name === "htmlFor") {
    return "for";
  }

  return name;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value);
}

export namespace JSX {
  export type Element = JsxChild;
  export interface IntrinsicElements {
    [elementName: string]: Record<string, unknown>;
  }
}
