import { spawn } from "node:child_process";
import { access, mkdir, rm, stat, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";
import { parseMds } from "../packages/parser/src/index.js";
import { renderHtmlResult } from "../packages/renderer-html/src/index.js";
import { buildPackageTheme } from "../packages/theme-builder/src/index.js";
import { loadThemeDirectory } from "../packages/theme-loader/src/index.js";
import { examples } from "../apps/editor/src/examples.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = join(root, ".tmp/visual-smoke");
const themeNames = ["default", "folio", "atelier"] as const;
const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "desktop", width: 1440, height: 1000 }
] as const;

interface VisualSmokeArtifact {
  theme: string;
  viewport: string;
  width: number;
  height: number;
  html: string;
  screenshot?: string;
  screenshotBytes?: number;
  innerWidth?: number;
  scrollWidth?: number;
}

interface LayoutMetrics {
  innerWidth: number;
  innerHeight: number;
  scrollWidth: number;
  scrollHeight: number;
  overflowElements: Array<{ selector: string; left: number; right: number; width: number }>;
}

async function main(): Promise<void> {
  const htmlOnly = process.argv.includes("--html-only");
  const requestedTheme = process.argv.find((argument) => argument.startsWith("--theme="))?.slice("--theme=".length);
  const selectedThemes =
    requestedTheme === undefined
      ? [...themeNames]
      : themeNames.filter((themeName) => themeName === requestedTheme);
  if (selectedThemes.length === 0) {
    throw new Error(`Unknown visual smoke theme: ${requestedTheme}. Expected one of ${themeNames.join(", ")}.`);
  }
  const chrome = htmlOnly ? undefined : await resolveChromeExecutable();
  const components = examples.find((example) => example.id === "components");
  if (components === undefined) {
    throw new Error("The editor Components example is missing.");
  }

  await mkdir(outputDirectory, { recursive: true });
  const artifacts: VisualSmokeArtifact[] = [];

  for (const themeName of selectedThemes) {
    const themeDirectory = join(root, "themes", themeName);
    const themeOutput = join(outputDirectory, themeName);
    await rm(themeOutput, { recursive: true, force: true });
    const build = await buildPackageTheme(themeDirectory);
    const theme = await loadThemeDirectory(build.outputDirectory);
    const rendered = renderHtmlResult(parseMds(components.source, { filePath: "examples/components.mds" }), {
      theme
    });
    if (rendered.diagnostics.length > 0) {
      throw new Error(
        `${themeName} Components render produced diagnostics:\n${rendered.diagnostics
          .map((diagnostic) => `${diagnostic.severity} ${diagnostic.code}: ${diagnostic.message}`)
          .join("\n")}`
      );
    }

    const htmlPath = join(themeOutput, "components.html");
    await mkdir(themeOutput, { recursive: true });
    await writeFile(htmlPath, rendered.html, "utf8");

    for (const viewport of viewports) {
      const artifact: VisualSmokeArtifact = {
        theme: themeName,
        viewport: viewport.name,
        width: viewport.width,
        height: viewport.height,
        html: relativeArtifactPath(htmlPath)
      };

      if (chrome !== undefined) {
        const screenshotPath = join(themeOutput, `components-${viewport.name}.png`);
        const layout = await captureScreenshot(chrome, htmlPath, screenshotPath, viewport.width, viewport.height);
        const screenshotStat = await stat(screenshotPath);
        if (screenshotStat.size === 0) {
          throw new Error(`Chrome produced an empty screenshot: ${screenshotPath}`);
        }
        artifact.screenshot = relativeArtifactPath(screenshotPath);
        artifact.screenshotBytes = screenshotStat.size;
        artifact.innerWidth = layout.innerWidth;
        artifact.scrollWidth = layout.scrollWidth;
      }

      artifacts.push(artifact);
    }
  }

  const manifestPath =
    selectedThemes.length === themeNames.length
      ? join(outputDirectory, "manifest.json")
      : join(outputDirectory, selectedThemes[0]!, "manifest.json");
  await writeFile(
    manifestPath,
    `${JSON.stringify(
      {
        example: "components",
        generatedAt: new Date().toISOString(),
        chrome: chrome ?? null,
        artifacts
      },
      null,
      2
    )}\n`,
    "utf8"
  );
  console.log(`Visual smoke passed: ${selectedThemes.length} themes x ${viewports.length} viewports.`);
  console.log(`Artifacts: ${outputDirectory}`);
}

async function resolveChromeExecutable(): Promise<string> {
  const candidates = [
    process.env.CHROME_BIN,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser"
  ].filter((candidate): candidate is string => candidate !== undefined && candidate.length > 0);

  for (const candidate of candidates) {
    try {
      await access(candidate, constants.X_OK);
      return candidate;
    } catch {
      // Try the next platform-specific location.
    }
  }

  throw new Error("Chrome was not found. Set CHROME_BIN or run `pnpm test:visual -- --html-only`.");
}

async function captureScreenshot(
  chrome: string,
  htmlPath: string,
  screenshotPath: string,
  width: number,
  height: number
): Promise<LayoutMetrics> {
  const profileDirectory = `${screenshotPath}.chrome-profile`;
  await rm(profileDirectory, { recursive: true, force: true });
  const child = spawn(
    chrome,
    [
      "--headless=new",
      "--disable-gpu",
      "--disable-background-networking",
      "--disable-component-update",
      "--hide-scrollbars",
      "--no-first-run",
      "--no-default-browser-check",
      "--allow-file-access-from-files",
      "--remote-debugging-port=0",
      `--user-data-dir=${profileDirectory}`
    ],
    { stdio: ["ignore", "ignore", "pipe"] }
  );
  let client: CdpClient | undefined;

  try {
    client = await CdpClient.connect(await waitForDevToolsUrl(child, 12_000));
    const target = await client.send<{ targetId: string }>("Target.createTarget", { url: "about:blank" });
    const attached = await client.send<{ sessionId: string }>("Target.attachToTarget", {
      targetId: target.targetId,
      flatten: true
    });
    const sessionId = attached.sessionId;
    await client.send(
      "Emulation.setDeviceMetricsOverride",
      {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: false,
        screenWidth: width,
        screenHeight: height
      },
      sessionId
    );
    await client.send("Page.enable", {}, sessionId);
    await client.send("Runtime.enable", {}, sessionId);
    const domReady = client.waitForEvent("Page.domContentEventFired", sessionId, 15_000);
    await client.send("Page.navigate", { url: pathToFileURL(htmlPath).href }, sessionId);
    await domReady;
    await client.send(
      "Runtime.evaluate",
      {
        expression: "new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))",
        awaitPromise: true
      },
      sessionId
    );
    const evaluated = await client.send<{ result: { value: LayoutMetrics } }>(
      "Runtime.evaluate",
      {
        expression:
          "({innerWidth,innerHeight,scrollWidth:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth),scrollHeight:Math.max(document.documentElement.scrollHeight,document.body.scrollHeight),overflowElements:[...document.querySelectorAll('*')].map((element)=>{const rect=element.getBoundingClientRect();return {selector:element.tagName.toLowerCase()+(element.id?'#'+element.id:'')+(typeof element.className==='string'&&element.className.trim()?'.'+element.className.trim().split(/\\s+/).join('.'):''),left:Math.round(rect.left),right:Math.round(rect.right),width:Math.round(rect.width)}}).filter((entry)=>entry.right>innerWidth+1||entry.left<-1).slice(0,12)})",
        returnByValue: true
      },
      sessionId
    );
    const layout = evaluated.result.value;
    if (layout.innerWidth !== width) {
      throw new Error(`Chrome viewport mismatch for ${screenshotPath}: expected ${width}, got ${layout.innerWidth}.`);
    }
    if (layout.scrollWidth > layout.innerWidth + 1) {
      throw new Error(
        `Horizontal overflow in ${screenshotPath}: scrollWidth=${layout.scrollWidth}, innerWidth=${layout.innerWidth}. ` +
          `Offenders: ${layout.overflowElements
            .map((entry) => `${entry.selector}[${entry.left},${entry.right};w=${entry.width}]`)
            .join(", ")}.`
      );
    }
    const screenshot = await client.send<{ data: string }>(
      "Page.captureScreenshot",
      { format: "png", fromSurface: true, captureBeyondViewport: false },
      sessionId
    );
    await writeFile(screenshotPath, screenshot.data, "base64");
    return layout;
  } finally {
    client?.close();
    child.kill("SIGTERM");
    await Promise.race([new Promise<void>((resolveExit) => child.once("exit", () => resolveExit())), delay(1_000)]);
    if (child.exitCode === null && child.signalCode === null) {
      child.kill("SIGKILL");
    }
    await rm(profileDirectory, { recursive: true, force: true });
  }
}

async function waitForDevToolsUrl(
  child: ReturnType<typeof spawn>,
  timeoutMs: number
): Promise<string> {
  return new Promise((resolveUrl, rejectUrl) => {
    const stderr = child.stderr;
    if (stderr === null) {
      rejectUrl(new Error("Chrome stderr is unavailable."));
      return;
    }

    const timeout = setTimeout(() => {
      cleanup();
      rejectUrl(new Error(`Chrome did not expose a DevTools URL within ${timeoutMs}ms.`));
    }, timeoutMs);
    let output = "";
    const onData = (chunk: Buffer): void => {
      output += chunk.toString();
      const match = output.match(/DevTools listening on (ws:\/\/\S+)/);
      if (match?.[1] !== undefined) {
        cleanup();
        resolveUrl(match[1]);
      }
    };
    const onExit = (code: number | null): void => {
      cleanup();
      rejectUrl(new Error(`Chrome exited before exposing DevTools (exit ${String(code)}).`));
    };
    const cleanup = (): void => {
      clearTimeout(timeout);
      stderr.off("data", onData);
      child.off("exit", onExit);
    };
    stderr.on("data", onData);
    child.once("exit", onExit);
  });
}

class CdpClient {
  private nextId = 1;
  private readonly pending = new Map<
    number,
    { resolve: (value: unknown) => void; reject: (error: Error) => void }
  >();
  private readonly eventWaiters: Array<{
    method: string;
    sessionId?: string;
    resolve: () => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
  }> = [];

  private constructor(private readonly socket: WebSocket) {
    socket.addEventListener("message", (event) => this.handleMessage(String(event.data)));
  }

  static async connect(url: string): Promise<CdpClient> {
    const socket = new WebSocket(url);
    await new Promise<void>((resolveOpen, rejectOpen) => {
      socket.addEventListener("open", () => resolveOpen(), { once: true });
      socket.addEventListener("error", () => rejectOpen(new Error(`Could not connect to Chrome DevTools: ${url}`)), {
        once: true
      });
    });
    return new CdpClient(socket);
  }

  send<T = Record<string, unknown>>(
    method: string,
    params: Record<string, unknown> = {},
    sessionId?: string
  ): Promise<T> {
    const id = this.nextId;
    this.nextId += 1;
    return new Promise<T>((resolveResult, rejectResult) => {
      this.pending.set(id, {
        resolve: (value) => resolveResult(value as T),
        reject: rejectResult
      });
      this.socket.send(JSON.stringify({ id, method, params, ...(sessionId === undefined ? {} : { sessionId }) }));
    });
  }

  waitForEvent(method: string, sessionId: string | undefined, timeoutMs: number): Promise<void> {
    return new Promise((resolveEvent, rejectEvent) => {
      const waiter = {
        method,
        ...(sessionId === undefined ? {} : { sessionId }),
        resolve: resolveEvent,
        reject: rejectEvent,
        timeout: setTimeout(() => {
          const index = this.eventWaiters.indexOf(waiter);
          if (index >= 0) {
            this.eventWaiters.splice(index, 1);
          }
          rejectEvent(new Error(`Timed out waiting for Chrome DevTools event ${method}.`));
        }, timeoutMs)
      };
      this.eventWaiters.push(waiter);
    });
  }

  close(): void {
    this.socket.close();
  }

  private handleMessage(raw: string): void {
    const message = JSON.parse(raw) as {
      id?: number;
      method?: string;
      sessionId?: string;
      result?: unknown;
      error?: { message?: string };
    };
    if (message.id !== undefined) {
      const pending = this.pending.get(message.id);
      if (pending !== undefined) {
        this.pending.delete(message.id);
        if (message.error !== undefined) {
          pending.reject(new Error(message.error.message ?? "Chrome DevTools command failed."));
        } else {
          pending.resolve(message.result ?? {});
        }
      }
      return;
    }

    if (message.method !== undefined) {
      const index = this.eventWaiters.findIndex(
        (waiter) => waiter.method === message.method && waiter.sessionId === message.sessionId
      );
      if (index >= 0) {
        const waiter = this.eventWaiters.splice(index, 1)[0]!;
        clearTimeout(waiter.timeout);
        waiter.resolve();
      }
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

function relativeArtifactPath(path: string): string {
  return path.slice(outputDirectory.length + 1);
}

await main();
