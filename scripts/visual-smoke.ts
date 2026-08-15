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
const themeNames = ["default", "folio", "atelier", "canvas"] as const;
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
  overflowingContents: Array<{ selector: string; clientWidth: number; scrollWidth: number; overflowX: string }>;
}

interface CommandMetrics {
  enhanced: boolean;
  filters: boolean;
  restores: boolean;
}

interface RemainingBlockMetrics {
  calendar: boolean;
  dataTable: boolean;
  contextMenu: boolean;
  menubar: boolean;
  messageScroller: boolean;
  chart: boolean;
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
  await rm(profileDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
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
    client = await CdpClient.connect(await waitForDevToolsUrl(child, 30_000));
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
    const commandEvaluated = await client.send<{ result: { value: CommandMetrics } }>(
      "Runtime.evaluate",
      {
        expression: `(() => {
          const command = document.querySelector('.command');
          const search = command?.querySelector('.command-search');
          const input = command?.querySelector('.command-input');
          const empty = command?.querySelector('.command-empty');
          const items = command === null ? [] : [...command.querySelectorAll('.menu-item')];
          if (!(search instanceof HTMLElement) || !(input instanceof HTMLInputElement) || !(empty instanceof HTMLElement) || items.length === 0) {
            return { enhanced: false, filters: false, restores: false };
          }
          const enhanced = command.classList.contains('is-enhanced') && !search.hidden;
          input.value = '__mds_no_matching_command__';
          input.dispatchEvent(new Event('input', { bubbles: true }));
          const filters = items.every((item) => item.hidden) && !empty.hidden;
          input.value = '';
          input.dispatchEvent(new Event('input', { bubbles: true }));
          const restores = items.every((item) => !item.hidden) && empty.hidden;
          return { enhanced, filters, restores };
        })()`,
        returnByValue: true
      },
      sessionId
    );
    const command = commandEvaluated.result.value;
    if (!command.enhanced || !command.filters || !command.restores) {
      throw new Error(
        `Command enhancement failed for ${screenshotPath}: ${JSON.stringify(command)}.`
      );
    }
    const remainingEvaluated = await client.send<{ result: { value: RemainingBlockMetrics } }>(
      "Runtime.evaluate",
      {
        expression: `(() => {
          const calendarRoot = document.querySelector('.calendar');
          const calendarNative = calendarRoot?.querySelector('.calendar-native');
          const calendarTarget = [...(calendarRoot?.querySelectorAll('.calendar-day') ?? [])]
            .find((button) => !button.disabled && button.dataset.outside === 'false' && button.getAttribute('aria-selected') !== 'true');
          const calendarBefore = calendarRoot?.getAttribute('data-value');
          calendarTarget?.click();
          const calendar = calendarRoot instanceof HTMLElement &&
            calendarRoot.classList.contains('is-enhanced') &&
            calendarNative instanceof HTMLElement && calendarNative.hidden &&
            calendarTarget instanceof HTMLButtonElement &&
            calendarRoot.getAttribute('data-value') !== calendarBefore;

          const tableShell = document.querySelector('.data-table-shell');
          const table = tableShell?.querySelector('.data-table');
          const tableToolbar = tableShell?.querySelector('.data-table-toolbar');
          const tableFilter = tableShell?.querySelector('.data-table-filter-input');
          const tableEmpty = tableShell?.querySelector('.data-table-empty');
          const tablePager = tableShell?.querySelector('.data-table-pagination');
          const tableSort = tableShell?.querySelector('.data-table-sort');
          let filters = false;
          let restoresTable = false;
          if (tableFilter instanceof HTMLInputElement && table instanceof HTMLTableElement && tableEmpty instanceof HTMLElement) {
            tableFilter.value = '__mds_no_matching_row__';
            tableFilter.dispatchEvent(new Event('input', { bubbles: true }));
            filters = table.hidden && !tableEmpty.hidden;
            tableFilter.value = '';
            tableFilter.dispatchEvent(new Event('input', { bubbles: true }));
            restoresTable = !table.hidden && tableEmpty.hidden;
            if (tableSort instanceof HTMLButtonElement) tableSort.click();
          }
          const dataTable = tableShell instanceof HTMLElement &&
            tableShell.classList.contains('is-enhanced') &&
            tableToolbar instanceof HTMLElement && !tableToolbar.hidden &&
            tablePager instanceof HTMLElement && !tablePager.hidden &&
            filters && restoresTable;

          const contextRoot = document.querySelector('.context-menu');
          const contextTrigger = contextRoot?.querySelector('.context-menu-trigger');
          if (contextTrigger instanceof HTMLElement) {
            contextTrigger.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 40, clientY: 40 }));
          }
          const contextMenu = contextRoot instanceof HTMLDetailsElement &&
            contextRoot.classList.contains('is-enhanced') && contextRoot.open &&
            contextRoot.classList.contains('is-context-open');
          if (contextRoot instanceof HTMLDetailsElement) contextRoot.open = false;

          const menubarRoot = document.querySelector('.menubar');
          const menubarTriggers = [...(menubarRoot?.querySelectorAll('.dropdown-menu > summary') ?? [])];
          let menubarKeyboard = false;
          if (menubarTriggers[0] instanceof HTMLElement && menubarTriggers[1] instanceof HTMLElement) {
            menubarTriggers[0].focus();
            menubarTriggers[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
            menubarKeyboard = document.activeElement === menubarTriggers[1];
            menubarTriggers[1].blur();
          }
          const menubar = menubarRoot instanceof HTMLElement &&
            menubarRoot.classList.contains('is-enhanced') && menubarKeyboard;

          const scroller = document.querySelector('.message-scroller');
          const viewport = scroller?.querySelector('.message-scroller-viewport');
          const content = scroller?.querySelector('.message-scroller-content');
          const latest = scroller?.querySelector('.message-scroller-button');
          let scrollControl = false;
          if (viewport instanceof HTMLElement && content instanceof HTMLElement && latest instanceof HTMLButtonElement) {
            const additions = Array.from({ length: 16 }, (_, index) => {
              const row = document.createElement('p');
              row.textContent = 'Temporary transcript row ' + index;
              content.append(row);
              return row;
            });
            viewport.scrollTop = 0;
            viewport.dispatchEvent(new Event('scroll'));
            scrollControl = viewport.scrollHeight > viewport.clientHeight && !latest.hidden;
            additions.forEach((row) => row.remove());
            viewport.scrollTop = viewport.scrollHeight;
            viewport.dispatchEvent(new Event('scroll'));
          }
          const messageScroller = scroller instanceof HTMLElement &&
            scroller.classList.contains('is-enhanced') &&
            content?.getAttribute('role') === 'log' && scrollControl;

          const chart = document.querySelectorAll('.chart-point-meter').length >= 4 &&
            [...document.querySelectorAll('.chart-point-meter')].every((meter) => meter instanceof HTMLMeterElement);

          window.scrollTo(0, 0);
          return { calendar, dataTable, contextMenu, menubar, messageScroller, chart };
        })()`,
        returnByValue: true
      },
      sessionId
    );
    const remaining = remainingEvaluated.result.value;
    if (Object.values(remaining).some((value) => !value)) {
      throw new Error(
        `Remaining block enhancement failed for ${screenshotPath}: ${JSON.stringify(remaining)}.`
      );
    }
    const evaluated = await client.send<{ result: { value: LayoutMetrics } }>(
      "Runtime.evaluate",
      {
        expression:
          "({innerWidth,innerHeight,scrollWidth:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth),scrollHeight:Math.max(document.documentElement.scrollHeight,document.body.scrollHeight),overflowElements:[...document.querySelectorAll('*')].map((element)=>{const rect=element.getBoundingClientRect();return {selector:element.tagName.toLowerCase()+(element.id?'#'+element.id:'')+(typeof element.className==='string'&&element.className.trim()?'.'+element.className.trim().split(/\\s+/).join('.'):''),left:Math.round(rect.left),right:Math.round(rect.right),width:Math.round(rect.width)}}).filter((entry)=>entry.right>innerWidth+1||entry.left<-1).slice(0,12),overflowingContents:[...document.querySelectorAll('*')].map((element)=>({selector:element.tagName.toLowerCase()+(element.id?'#'+element.id:'')+(typeof element.className==='string'&&element.className.trim()?'.'+element.className.trim().split(/\\s+/).join('.'):''),clientWidth:element.clientWidth,scrollWidth:element.scrollWidth,overflowX:getComputedStyle(element).overflowX})).filter((entry)=>entry.scrollWidth>entry.clientWidth+1&&entry.overflowX==='visible').slice(0,12)})",
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
            .join(", ")}. Overflowing contents: ${layout.overflowingContents
            .map((entry) => `${entry.selector}[${entry.clientWidth}->${entry.scrollWidth};${entry.overflowX}]`)
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
    await stopProcess(child);
    await rm(profileDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}

async function stopProcess(child: ReturnType<typeof spawn>): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  child.kill("SIGTERM");
  const exited = await Promise.race([
    new Promise<boolean>((resolveExit) => child.once("exit", () => resolveExit(true))),
    delay(1_000).then(() => false)
  ]);
  if (exited || child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  child.kill("SIGKILL");
  await Promise.race([
    new Promise<void>((resolveExit) => child.once("exit", () => resolveExit())),
    delay(2_000)
  ]);
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
