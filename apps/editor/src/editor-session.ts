export interface EditorFileRecord {
  path: string;
  content: string;
  revision: string;
  modifiedAt: number;
}

export interface EditorSessionPayload {
  mode: "document";
  projectRoot: string;
  activeFile: EditorFileRecord | null;
  files: string[];
  themeDevelopment: boolean;
}

export interface EditorFileMutationResult {
  file: EditorFileRecord;
  files: string[];
}

export class EditorSessionError extends Error {
  readonly code: string | undefined;
  readonly file: EditorFileRecord | null | undefined;

  constructor(message: string, options: { code?: string; file?: EditorFileRecord | null } = {}) {
    super(message);
    this.name = "EditorSessionError";
    this.code = options.code;
    this.file = options.file;
  }
}

export async function loadEditorSession(): Promise<EditorSessionPayload | null> {
  if (readEditorSessionToken() === undefined) {
    return null;
  }
  return readJson("/__mds/session", isEditorSessionPayload);
}

export async function loadEditorFile(path: string): Promise<EditorFileRecord> {
  return readJson(`/__mds/file?path=${encodeURIComponent(path)}`, isEditorFileRecord);
}

export async function saveEditorFile(
  file: Pick<EditorFileRecord, "path" | "revision"> & { content: string },
  options: { overwrite?: boolean } = {}
): Promise<EditorFileMutationResult> {
  return mutateEditorFile("/__mds/file", "PUT", {
    path: file.path,
    content: file.content,
    revision: file.revision,
    ...(options.overwrite === undefined ? {} : { overwrite: options.overwrite })
  });
}

export async function createEditorFile(path: string, content?: string): Promise<EditorFileMutationResult> {
  return mutateEditorFile("/__mds/files", "POST", {
    path,
    ...(content === undefined ? {} : { content })
  });
}

export function editorRequestHeaders(json = false): Record<string, string> {
  const token = readEditorSessionToken();
  return {
    ...(token === undefined ? {} : { "X-MDS-Editor-Token": token }),
    ...(json ? { "Content-Type": "application/json" } : {})
  };
}

async function mutateEditorFile(
  url: string,
  method: "POST" | "PUT",
  body: Record<string, unknown>
): Promise<EditorFileMutationResult> {
  const response = await fetch(url, {
    method,
    headers: editorRequestHeaders(true),
    body: JSON.stringify(body)
  });
  const responseBody = await response.text();
  if (!response.ok) {
    throwEditorSessionError(responseBody);
  }
  const value = parseJson(responseBody);
  if (!isEditorFileMutationResult(value)) {
    throw new EditorSessionError("Editor server returned an invalid file response.");
  }
  return value;
}

async function readJson<T>(url: string, validate: (value: unknown) => value is T): Promise<T> {
  const response = await fetch(url, {
    headers: editorRequestHeaders()
  });
  const body = await response.text();
  if (!response.ok) {
    throwEditorSessionError(body);
  }
  const value = parseJson(body);
  if (!validate(value)) {
    throw new EditorSessionError("Editor server returned an invalid response.");
  }
  return value;
}

function throwEditorSessionError(body: string): never {
  const value = parseJson(body);
  if (isRecord(value)) {
    throw new EditorSessionError(
      typeof value.message === "string" ? value.message : "Editor request failed.",
      {
        ...(typeof value.code === "string" ? { code: value.code } : {}),
        ...(value.file === null || isEditorFileRecord(value.file) ? { file: value.file } : {})
      }
    );
  }
  throw new EditorSessionError(body.length > 0 ? body : "Editor request failed.");
}

function readEditorSessionToken(): string | undefined {
  if (typeof document === "undefined") {
    return undefined;
  }
  const value = document.querySelector<HTMLMetaElement>('meta[name="mds-editor-token"]')?.content;
  return value === undefined || value.length === 0 ? undefined : value;
}

function isEditorSessionPayload(value: unknown): value is EditorSessionPayload {
  return (
    isRecord(value) &&
    value.mode === "document" &&
    typeof value.projectRoot === "string" &&
    (value.activeFile === null || isEditorFileRecord(value.activeFile)) &&
    Array.isArray(value.files) &&
    value.files.every((path) => typeof path === "string") &&
    typeof value.themeDevelopment === "boolean"
  );
}

function isEditorFileMutationResult(value: unknown): value is EditorFileMutationResult {
  return (
    isRecord(value) &&
    isEditorFileRecord(value.file) &&
    Array.isArray(value.files) &&
    value.files.every((path) => typeof path === "string")
  );
}

function isEditorFileRecord(value: unknown): value is EditorFileRecord {
  return (
    isRecord(value) &&
    typeof value.path === "string" &&
    typeof value.content === "string" &&
    typeof value.revision === "string" &&
    typeof value.modifiedAt === "number"
  );
}

function parseJson(body: string): unknown {
  try {
    return JSON.parse(body) as unknown;
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
