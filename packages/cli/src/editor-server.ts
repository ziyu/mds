import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import {
  lstat,
  open,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  stat
} from "node:fs/promises";
import { createRequire } from "node:module";
import { extname, basename, dirname, isAbsolute, join, posix, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  readThemeDirectory,
  readThemeRef,
  resolveThemeRef,
  ThemeValidationError,
  type ThemeSource,
  type ThemeSummary
} from "@mds-crate/theme-loader";

const EDITOR_TOKEN_HEADER = "x-mds-editor-token";
const MAX_DOCUMENT_BYTES = 2 * 1024 * 1024;
const MAX_REQUEST_BYTES = MAX_DOCUMENT_BYTES + 64 * 1024;
const DEFAULT_DOCUMENT = "# Untitled\n";
const SKIPPED_DIRECTORIES = new Set([".git", ".hg", ".svn", "dist", "node_modules"]);

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

export interface StartEditorServerOptions {
  input?: string;
  host?: string;
  port?: number;
  assetsDirectory?: string;
  themeDevelopment?: boolean;
}

export interface EditorServer {
  url: string;
  host: string;
  port: number;
  projectRoot: string;
  activeFile: string | null;
  close(): Promise<void>;
  closed: Promise<void>;
}

interface EditorProject {
  root: string;
  activeFile: string | null;
}

interface RequestContext {
  project: EditorProject;
  assetsDirectory: string;
  token: string;
  expectedHosts: Set<string>;
  themeDevelopment: boolean;
}

interface SaveDocumentInput {
  path: string;
  content: string;
  revision: string | null;
  overwrite?: boolean;
}

class EditorHttpError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details: Record<string, unknown> | undefined;

  constructor(statusCode: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "EditorHttpError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export async function startEditorServer(options: StartEditorServerOptions = {}): Promise<EditorServer> {
  const host = options.host ?? "127.0.0.1";
  if (!isLoopbackHost(host)) {
    throw new Error(`The MDS Editor only supports loopback hosts; received ${host}.`);
  }

  const project = await resolveEditorProject(options.input ?? ".");
  const assetsDirectory = resolve(options.assetsDirectory ?? defaultEditorAssetsDirectory());
  await assertEditorAssets(assetsDirectory);

  const token = randomBytes(32).toString("hex");
  const server = createServer();
  let closedResolve: (() => void) | undefined;
  const closed = new Promise<void>((resolveClosed) => {
    closedResolve = resolveClosed;
  });
  server.once("close", () => closedResolve?.());

  await listen(server, options.port ?? 0, host);
  const address = server.address();
  if (address === null || typeof address === "string") {
    await closeServer(server);
    throw new Error("The MDS Editor server did not receive a TCP address.");
  }

  const port = address.port;
  const addressHost = host.includes(":") ? `[${host}]` : host;
  const expectedHosts = new Set([`${addressHost}:${port}`, `localhost:${port}`]);
  const context: RequestContext = {
    project,
    assetsDirectory,
    token,
    expectedHosts,
    themeDevelopment: options.themeDevelopment ?? false
  };
  server.on("request", (request, response) => {
    void handleRequest(request, response, context);
  });

  return {
    url: `http://${addressHost}:${port}/`,
    host,
    port,
    projectRoot: project.root,
    activeFile: project.activeFile,
    close: async () => closeServer(server),
    closed
  };
}

export async function resolveEditorProject(input: string): Promise<EditorProject> {
  const inputPath = resolve(input);
  let inputStats;
  try {
    inputStats = await lstat(inputPath);
  } catch (error) {
    if (!isNodeError(error) || error.code !== "ENOENT" || extname(inputPath).toLowerCase() !== ".mds") {
      throw error;
    }

    const parent = await realpath(dirname(inputPath));
    const parentStats = await stat(parent);
    if (!parentStats.isDirectory()) {
      throw new Error(`Editor project parent is not a directory: ${parent}.`);
    }
    const activeFile = basename(inputPath);
    const project: EditorProject = {
      root: parent,
      activeFile
    };
    await saveDocument(project, {
      path: activeFile,
      content: DEFAULT_DOCUMENT,
      revision: null
    });
    return project;
  }

  if (inputStats.isSymbolicLink()) {
    throw new Error(`Editor input cannot be a symbolic link: ${inputPath}.`);
  }

  if (inputStats.isDirectory()) {
    const root = await realpath(inputPath);
    const files = await listMdsFiles(root);
    return {
      root,
      activeFile: files[0] ?? null
    };
  }

  if (!inputStats.isFile() || extname(inputPath).toLowerCase() !== ".mds") {
    throw new Error(`Editor input must be an .mds file or directory: ${inputPath}.`);
  }

  const file = await realpath(inputPath);
  return {
    root: dirname(file),
    activeFile: basename(file)
  };
}

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse<IncomingMessage>,
  context: RequestContext
): Promise<void> {
  try {
    validateRequestBoundary(request, context);
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);

    if (url.pathname.startsWith("/__mds/")) {
      validateSessionToken(request, context.token);
      await handleApiRequest(request, response, url, context);
      return;
    }

    await serveEditorAsset(request, response, url, context);
  } catch (error) {
    sendRequestError(response, error);
  }
}

async function handleApiRequest(
  request: IncomingMessage,
  response: ServerResponse<IncomingMessage>,
  url: URL,
  context: RequestContext
): Promise<void> {
  if (url.pathname === "/__mds/session" && request.method === "GET") {
    const files = await listMdsFiles(context.project.root);
    const activePath = context.project.activeFile !== null && files.includes(context.project.activeFile)
      ? context.project.activeFile
      : files[0] ?? null;
    context.project.activeFile = activePath;
    sendJson(response, {
      mode: "document",
      projectRoot: context.project.root,
      activeFile: activePath === null ? null : await readDocument(context.project, activePath),
      files,
      themeDevelopment: context.themeDevelopment
    } satisfies EditorSessionPayload);
    return;
  }

  if (url.pathname === "/__mds/file" && request.method === "GET") {
    const path = url.searchParams.get("path");
    if (path === null) {
      throw new EditorHttpError(400, "missing-file-path", "The file path query parameter is required.");
    }
    sendJson(response, await readDocument(context.project, path));
    return;
  }

  if (url.pathname === "/__mds/file" && request.method === "PUT") {
    const input = validateSaveInput(await readJsonBody(request));
    const file = await saveDocument(context.project, input);
    context.project.activeFile = file.path;
    sendJson(response, {
      file,
      files: await listMdsFiles(context.project.root)
    });
    return;
  }

  if (url.pathname === "/__mds/files" && request.method === "POST") {
    const body = await readJsonBody(request);
    if (!isRecord(body) || typeof body.path !== "string") {
      throw new EditorHttpError(400, "invalid-create-request", "A string file path is required.");
    }
    const content = body.content === undefined ? DEFAULT_DOCUMENT : body.content;
    if (typeof content !== "string") {
      throw new EditorHttpError(400, "invalid-create-request", "New file content must be a string.");
    }
    const file = await saveDocument(context.project, {
      path: body.path,
      content,
      revision: null
    });
    context.project.activeFile = file.path;
    sendJson(response, {
      file,
      files: await listMdsFiles(context.project.root)
    }, 201);
    return;
  }

  if (url.pathname === "/__mds/themes" && request.method === "GET") {
    sendJson(response, await listProjectThemes(context.project.root));
    return;
  }

  if (url.pathname.startsWith("/__mds/themes/") && request.method === "GET") {
    const ref = decodeURIComponent(url.pathname.slice("/__mds/themes/".length));
    sendJson(response, await readProjectTheme(ref, context.project.root));
    return;
  }

  throw new EditorHttpError(404, "api-not-found", `Unknown MDS Editor endpoint: ${url.pathname}.`);
}

async function readDocument(project: EditorProject, requestedPath: string): Promise<EditorFileRecord> {
  const { relativePath, absolutePath } = resolveProjectFilePath(project.root, requestedPath);
  const fileStats = await lstat(absolutePath).catch((error: unknown) => {
    if (isNodeError(error) && error.code === "ENOENT") {
      throw new EditorHttpError(404, "file-not-found", `MDS file does not exist: ${relativePath}.`);
    }
    throw error;
  });
  if (fileStats.isSymbolicLink()) {
    throw new EditorHttpError(403, "symlink-not-allowed", `Symbolic-link files are not available in the Editor: ${relativePath}.`);
  }
  if (!fileStats.isFile()) {
    throw new EditorHttpError(400, "not-a-file", `MDS path is not a file: ${relativePath}.`);
  }

  const canonicalPath = await realpath(absolutePath);
  assertPathInside(canonicalPath, project.root, "File path escapes the Editor project root.");
  if (fileStats.size > MAX_DOCUMENT_BYTES) {
    throw new EditorHttpError(413, "file-too-large", `MDS files must be at most ${MAX_DOCUMENT_BYTES} bytes.`);
  }

  const content = await readFile(canonicalPath, "utf8");
  return createFileRecord(relativePath, content, fileStats.mtimeMs);
}

async function saveDocument(project: EditorProject, input: SaveDocumentInput): Promise<EditorFileRecord> {
  const { relativePath, absolutePath } = resolveProjectFilePath(project.root, input.path);
  const contentBytes = Buffer.byteLength(input.content, "utf8");
  if (contentBytes > MAX_DOCUMENT_BYTES) {
    throw new EditorHttpError(413, "file-too-large", `MDS files must be at most ${MAX_DOCUMENT_BYTES} bytes.`);
  }

  let current: EditorFileRecord | undefined;
  let currentMode = 0o644;
  try {
    const fileStats = await lstat(absolutePath);
    if (fileStats.isSymbolicLink()) {
      throw new EditorHttpError(403, "symlink-not-allowed", `Symbolic-link files cannot be saved: ${relativePath}.`);
    }
    if (!fileStats.isFile()) {
      throw new EditorHttpError(400, "not-a-file", `MDS path is not a file: ${relativePath}.`);
    }
    const canonicalPath = await realpath(absolutePath);
    assertPathInside(canonicalPath, project.root, "File path escapes the Editor project root.");
    const currentContent = await readFile(canonicalPath, "utf8");
    current = createFileRecord(relativePath, currentContent, fileStats.mtimeMs);
    currentMode = fileStats.mode;
  } catch (error) {
    if (!isNodeError(error) || error.code !== "ENOENT") {
      throw error;
    }
    const canonicalParent = await realpath(dirname(absolutePath)).catch((parentError: unknown) => {
      if (isNodeError(parentError) && parentError.code === "ENOENT") {
        throw new EditorHttpError(400, "missing-parent-directory", `Parent directory does not exist: ${posix.dirname(relativePath)}.`);
      }
      throw parentError;
    });
    assertPathInside(canonicalParent, project.root, "File parent escapes the Editor project root.");
  }

  if (input.overwrite !== true) {
    const expectedRevision = input.revision;
    const currentRevision = current?.revision ?? null;
    if (expectedRevision !== currentRevision) {
      throw new EditorHttpError(409, "file-conflict", `MDS file changed outside the Editor: ${relativePath}.`, {
        file: current ?? null
      });
    }
  }

  const temporaryPath = join(dirname(absolutePath), `.${basename(absolutePath)}.${process.pid}.${randomBytes(8).toString("hex")}.tmp`);
  let handle;
  try {
    handle = await open(temporaryPath, "wx", currentMode);
    await handle.writeFile(input.content, "utf8");
    await handle.sync();
    await handle.close();
    handle = undefined;
    await rename(temporaryPath, absolutePath);
  } finally {
    await handle?.close().catch(() => undefined);
    await rm(temporaryPath, { force: true }).catch(() => undefined);
  }

  const savedStats = await stat(absolutePath);
  return createFileRecord(relativePath, input.content, savedStats.mtimeMs);
}

async function listMdsFiles(root: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(directory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isSymbolicLink()) {
        continue;
      }
      const absolutePath = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!SKIPPED_DIRECTORIES.has(entry.name)) {
          await walk(absolutePath);
        }
        continue;
      }
      if (entry.isFile() && extname(entry.name).toLowerCase() === ".mds") {
        files.push(toPosixPath(relative(root, absolutePath)));
      }
    }
  }

  await walk(root);
  return files.sort((left, right) => left.localeCompare(right));
}

async function listProjectThemes(projectRoot: string): Promise<ThemeSummary[]> {
  const summaries: ThemeSummary[] = [
    {
      name: "default",
      label: "Default",
      description: "Official MDS default theme."
    }
  ];
  const localRoot = join(projectRoot, "themes");
  try {
    for (const entry of await readdir(localRoot, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.isSymbolicLink()) {
        continue;
      }
      try {
        const source = await readThemeRef(entry.name, {
          roots: [localRoot],
          baseDirectory: projectRoot
        });
        summaries.push(themeSourceSummary(entry.name, source));
      } catch {
        // Broken themes remain loadable by ref so their structured diagnostics can be displayed.
      }
    }
  } catch (error) {
    if (!isNodeError(error) || error.code !== "ENOENT") {
      throw error;
    }
  }

  for (const packageName of await readProjectDependencyNames(projectRoot)) {
    try {
      const source = await readThemeRef(packageName, {
        roots: [localRoot],
        baseDirectory: projectRoot
      });
      summaries.push(themeSourceSummary(packageName, source));
    } catch {
      // Most project dependencies are not themes.
    }
  }

  return dedupeThemeSummaries(summaries);
}

async function readProjectTheme(ref: string, projectRoot: string): Promise<ThemeSource> {
  if (ref === "default" || ref === "@mds-crate/theme-default") {
    const packageJsonPath = createRequire(import.meta.url).resolve("@mds-crate/theme-default/package.json");
    return readThemeRef(dirname(packageJsonPath));
  }

  if (isAbsolute(ref) || ref.includes("\\") || ref.includes("\0")) {
    throw new EditorHttpError(400, "invalid-theme-ref", `Invalid theme ref: ${ref}.`);
  }

  const options = {
    roots: [join(projectRoot, "themes")],
    baseDirectory: projectRoot
  };
  if (ref.startsWith(".")) {
    const themeDirectory = await resolveThemeRef(ref, {
      roots: options.roots,
      baseDirectory: options.baseDirectory
    });
    assertPathInside(themeDirectory, projectRoot, "Theme path escapes the Editor project root.");
    return readThemeDirectory(themeDirectory);
  }

  return readThemeRef(ref, options);
}

async function readProjectDependencyNames(projectRoot: string): Promise<string[]> {
  try {
    const manifest = JSON.parse(await readFile(join(projectRoot, "package.json"), "utf8")) as unknown;
    if (!isRecord(manifest)) {
      return [];
    }
    const names = new Set<string>();
    for (const field of ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"] as const) {
      const dependencies = manifest[field];
      if (isRecord(dependencies)) {
        Object.keys(dependencies).forEach((name) => names.add(name));
      }
    }
    return [...names].sort((left, right) => left.localeCompare(right));
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

function themeSourceSummary(ref: string, source: ThemeSource): ThemeSummary {
  const manifest = source.manifest;
  return {
    name: ref,
    label: typeof manifest.label === "string" && manifest.label.length > 0 ? manifest.label : ref,
    ...(typeof manifest.description === "string" ? { description: manifest.description } : {}),
    ...(typeof manifest.author === "string" ? { author: manifest.author } : {}),
    ...(typeof manifest.homepage === "string" ? { homepage: manifest.homepage } : {}),
    ...(typeof manifest.preview === "string" ? { preview: manifest.preview } : {}),
    ...(Array.isArray(manifest.tags) ? { tags: manifest.tags } : {}),
    ...(Array.isArray(manifest.supportedBlocks) ? { supportedBlocks: manifest.supportedBlocks } : {})
  };
}

function dedupeThemeSummaries(summaries: ThemeSummary[]): ThemeSummary[] {
  const refs = new Set<string>();
  return summaries.filter((summary) => {
    if (refs.has(summary.name)) {
      return false;
    }
    refs.add(summary.name);
    return true;
  });
}

async function serveEditorAsset(
  request: IncomingMessage,
  response: ServerResponse<IncomingMessage>,
  url: URL,
  context: RequestContext
): Promise<void> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    throw new EditorHttpError(405, "method-not-allowed", "Editor assets only accept GET and HEAD requests.");
  }

  const requestedPath = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname.slice(1));
  if (requestedPath.includes("\\") || requestedPath.includes("\0") || requestedPath.split("/").includes("..")) {
    throw new EditorHttpError(400, "invalid-asset-path", "Invalid Editor asset path.");
  }
  const assetPath = resolve(context.assetsDirectory, requestedPath);
  assertPathInside(assetPath, context.assetsDirectory, "Editor asset path escapes the asset directory.");

  let body = await readFile(assetPath).catch((error: unknown) => {
    if (isNodeError(error) && error.code === "ENOENT") {
      throw new EditorHttpError(404, "asset-not-found", `Editor asset not found: ${requestedPath}.`);
    }
    throw error;
  });
  if (requestedPath === "index.html") {
    const html = body.toString("utf8");
    const tokenMeta = `<meta name="mds-editor-token" content="${context.token}">`;
    body = Buffer.from(html.replace("</head>", `    ${tokenMeta}\n  </head>`), "utf8");
    response.setHeader("Cache-Control", "no-store");
  } else {
    response.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  }

  response.statusCode = 200;
  response.setHeader("Content-Type", contentTypeFor(requestedPath));
  response.setHeader("Content-Length", body.byteLength);
  response.setHeader("Content-Security-Policy", "default-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; frame-src 'self'; object-src 'none'; base-uri 'none'");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  if (request.method === "HEAD") {
    response.end();
    return;
  }
  response.end(body);
}

function validateRequestBoundary(request: IncomingMessage, context: RequestContext): void {
  const host = request.headers.host;
  if (host === undefined || !context.expectedHosts.has(host.toLowerCase())) {
    throw new EditorHttpError(403, "invalid-host", "Request Host is not allowed for this Editor session.");
  }

  const origin = request.headers.origin;
  if (origin !== undefined) {
    let originHost: string;
    try {
      const originUrl = new URL(origin);
      if (originUrl.protocol !== "http:") {
        throw new Error("invalid protocol");
      }
      originHost = originUrl.host.toLowerCase();
    } catch {
      throw new EditorHttpError(403, "invalid-origin", "Request Origin is not allowed for this Editor session.");
    }
    if (!context.expectedHosts.has(originHost)) {
      throw new EditorHttpError(403, "invalid-origin", "Request Origin is not allowed for this Editor session.");
    }
  }
}

function validateSessionToken(request: IncomingMessage, expectedToken: string): void {
  const received = request.headers[EDITOR_TOKEN_HEADER];
  if (typeof received !== "string") {
    throw new EditorHttpError(403, "invalid-session-token", "Missing Editor session token.");
  }
  const expectedBuffer = Buffer.from(expectedToken);
  const receivedBuffer = Buffer.from(received);
  if (receivedBuffer.length !== expectedBuffer.length || !timingSafeEqual(receivedBuffer, expectedBuffer)) {
    throw new EditorHttpError(403, "invalid-session-token", "Invalid Editor session token.");
  }
}

function validateSaveInput(value: unknown): SaveDocumentInput {
  if (
    !isRecord(value) ||
    typeof value.path !== "string" ||
    typeof value.content !== "string" ||
    !(typeof value.revision === "string" || value.revision === null) ||
    !(value.overwrite === undefined || typeof value.overwrite === "boolean")
  ) {
    throw new EditorHttpError(400, "invalid-save-request", "Save requests require path, content, and revision fields.");
  }
  return {
    path: value.path,
    content: value.content,
    revision: value.revision,
    ...(value.overwrite === undefined ? {} : { overwrite: value.overwrite })
  };
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const contentType = request.headers["content-type"] ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new EditorHttpError(415, "unsupported-content-type", "Editor write requests require application/json.");
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.byteLength;
    if (size > MAX_REQUEST_BYTES) {
      throw new EditorHttpError(413, "request-too-large", `Editor requests must be at most ${MAX_REQUEST_BYTES} bytes.`);
    }
    chunks.push(buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new EditorHttpError(400, "invalid-json", "Editor request body must be valid JSON.");
  }
}

function resolveProjectFilePath(root: string, requestedPath: string): { relativePath: string; absolutePath: string } {
  if (
    requestedPath.length === 0 ||
    isAbsolute(requestedPath) ||
    requestedPath.includes("\\") ||
    requestedPath.includes("\0") ||
    requestedPath.split("/").some((segment) => segment === ".." || segment === ".")
  ) {
    throw new EditorHttpError(400, "invalid-file-path", "File paths must be relative paths inside the Editor project.");
  }
  const relativePath = posix.normalize(requestedPath);
  if (relativePath !== requestedPath || extname(relativePath).toLowerCase() !== ".mds") {
    throw new EditorHttpError(400, "invalid-file-path", "Editor files must use a normalized relative .mds path.");
  }
  const absolutePath = resolve(root, ...relativePath.split("/"));
  assertPathInside(absolutePath, root, "File path escapes the Editor project root.");
  return { relativePath, absolutePath };
}

function createFileRecord(path: string, content: string, modifiedAt: number): EditorFileRecord {
  return {
    path,
    content,
    revision: createHash("sha256").update(content).digest("hex"),
    modifiedAt
  };
}

function assertPathInside(path: string, directory: string, message: string): void {
  const relativePath = relative(directory, path);
  if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
    throw new EditorHttpError(403, "path-escape", message);
  }
}

function toPosixPath(path: string): string {
  return path.split(sep).join("/");
}

function defaultEditorAssetsDirectory(): string {
  const currentDirectory = dirname(fileURLToPath(import.meta.url));
  return currentDirectory.endsWith(`${sep}src`)
    ? resolve(currentDirectory, "../../../apps/editor/dist")
    : resolve(currentDirectory, "editor");
}

async function assertEditorAssets(directory: string): Promise<void> {
  try {
    const indexStats = await stat(join(directory, "index.html"));
    if (!indexStats.isFile()) {
      throw new Error("index.html is not a file");
    }
  } catch (error) {
    throw new Error(`MDS Editor assets are unavailable at ${directory}. Build or reinstall @mds-crate/cli.`, {
      cause: error
    });
  }
}

function contentTypeFor(path: string): string {
  switch (extname(path).toLowerCase()) {
    case ".html": return "text/html; charset=utf-8";
    case ".js": return "text/javascript; charset=utf-8";
    case ".css": return "text/css; charset=utf-8";
    case ".json": return "application/json; charset=utf-8";
    case ".svg": return "image/svg+xml";
    case ".png": return "image/png";
    case ".jpg":
    case ".jpeg": return "image/jpeg";
    case ".woff2": return "font/woff2";
    default: return "application/octet-stream";
  }
}

function sendJson(response: ServerResponse<IncomingMessage>, value: unknown, statusCode = 200): void {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(value));
}

function sendRequestError(response: ServerResponse<IncomingMessage>, error: unknown): void {
  if (response.headersSent) {
    response.destroy(error instanceof Error ? error : undefined);
    return;
  }

  if (error instanceof ThemeValidationError) {
    sendJson(response, {
      name: error.name,
      message: error.message,
      diagnostics: error.diagnostics
    }, error.diagnostics.every((diagnostic) => diagnostic.code === "unknown-theme") ? 404 : 500);
    return;
  }

  if (error instanceof EditorHttpError) {
    sendJson(response, {
      code: error.code,
      message: error.message,
      ...error.details
    }, error.statusCode);
    return;
  }

  sendJson(response, {
    code: "editor-server-error",
    message: error instanceof Error ? error.message : String(error)
  }, 500);
}

function listen(server: Server, port: number, host: string): Promise<void> {
  return new Promise((resolveListen, reject) => {
    const handleError = (error: Error) => {
      server.off("listening", handleListening);
      reject(error);
    };
    const handleListening = () => {
      server.off("error", handleError);
      resolveListen();
    };
    server.once("error", handleError);
    server.once("listening", handleListening);
    server.listen(port, host);
  });
}

function closeServer(server: Server): Promise<void> {
  if (!server.listening) {
    return Promise.resolve();
  }
  return new Promise((resolveClose, reject) => {
    server.close((error) => error === undefined ? resolveClose() : reject(error));
  });
}

function isLoopbackHost(host: string): boolean {
  return host === "127.0.0.1" || host === "localhost" || host === "::1";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
