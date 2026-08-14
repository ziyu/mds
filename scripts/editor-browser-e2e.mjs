import { spawn } from "node:child_process";
import { access, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, extname, join, resolve } from "node:path";

async function main() {
const requestedCli = readArgument("--cli");
if (requestedCli === undefined) {
  throw new Error("Usage: node scripts/editor-browser-e2e.mjs --cli <mds executable or dist/index.js>");
}

const cliPath = resolve(requestedCli);
const chrome = await resolveChromeExecutable();
const project = await realpath(await mkdtemp(join(tmpdir(), "mds-packed-editor-e2e-")));
const input = join(project, "page.mds");
let editorChild;
let chromeChild;
let client;

try {
  await writeInstalledTheme(project);
  const originalSource = themedSource("Original packaged Editor content.");
  await writeFile(input, originalSource, "utf8");

  editorChild = startEditor(cliPath, input);
  const editor = await readEditorStartup(editorChild, 15_000);
  if (editor.projectRoot !== project || editor.activeFile !== "page.mds") {
    throw new Error(`Packed Editor opened the wrong project: ${JSON.stringify(editor)}.`);
  }

  const launchedChrome = await launchChromeWithRetries(chrome, project);
  chromeChild = launchedChrome.child;
  client = await CdpClient.connect(launchedChrome.devToolsUrl);
  const target = await client.send("Target.createTarget", { url: "about:blank" });
  const attached = await client.send("Target.attachToTarget", {
    targetId: target.targetId,
    flatten: true
  });
  const sessionId = attached.sessionId;
  await client.send("Page.enable", {}, sessionId);
  await client.send("Runtime.enable", {}, sessionId);
  const loaded = client.waitForEvent("Page.domContentEventFired", sessionId, 15_000);
  await client.send("Page.navigate", { url: editor.url }, sessionId);
  await loaded;

  await waitForExpression(client, sessionId, `document.querySelector('.cm-content')?.innerText.includes('Original packaged Editor content.') === true`);
  await waitForExpression(client, sessionId, `document.querySelector('iframe')?.getAttribute('srcdoc')?.includes('.e2e-installed-theme') === true`);

  const savedSource = themedSource("Saved through the packed browser UI.");
  await replaceEditorText(client, sessionId, savedSource);
  await waitForExpression(client, sessionId, `document.body.innerText.includes('UNSAVED')`);
  await clickButton(client, sessionId, "Save");
  await waitForFileContent(input, savedSource, 10_000);
  await waitForExpression(client, sessionId, `document.body.innerText.includes('SAVED')`);

  const externalSource = themedSource("Changed outside the packed Editor.");
  await writeFile(input, externalSource, "utf8");
  await replaceEditorText(client, sessionId, themedSource("Unsaved browser conflict content."));
  await waitForExpression(client, sessionId, `document.body.innerText.includes('UNSAVED')`);
  await clickButton(client, sessionId, "Save");
  await waitForExpression(client, sessionId, `document.body.innerText.toLowerCase().includes('save conflict')`);
  if (await readFile(input, "utf8") !== externalSource) {
    throw new Error("Editor conflict handling overwrote the external file change.");
  }
  await clickButton(client, sessionId, "Reload disk version");
  await waitForExpression(client, sessionId, `document.querySelector('.cm-content')?.innerText.includes('Changed outside the packed Editor.') === true`);

  await replaceEditorText(client, sessionId, "::: note\nUnclosed diagnostic\n");
  await waitForExpression(client, sessionId, `document.body.innerText.includes('unclosed-block')`);

  client.close();
  client = undefined;
  chromeChild.kill("SIGTERM");
  await waitForExit(chromeChild, 5_000, true);
  chromeChild = undefined;

  editorChild.kill("SIGTERM");
  await waitForExit(editorChild, 5_000);
  editorChild = undefined;
  await expectServerClosed(editor.url, 5_000);

  console.log("Packed Editor browser E2E passed: open, installed theme, save, conflict, reload, diagnostics, shutdown.");
} finally {
  client?.close();
  if (chromeChild !== undefined) {
    chromeChild.kill("SIGKILL");
    await waitForExit(chromeChild, 2_000, true);
  }
  if (editorChild !== undefined) {
    editorChild.kill("SIGKILL");
    await waitForExit(editorChild, 2_000, true);
  }
  await rm(project, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
}

function startEditor(path, inputPath) {
  const args = ["edit", inputPath, "--no-open", "--json"];
  if (extname(path) === ".js") {
    return spawn(process.execPath, [path, ...args], {
      cwd: dirname(inputPath),
      stdio: ["ignore", "pipe", "pipe"]
    });
  }
  return spawn(path, args, {
    cwd: dirname(inputPath),
    stdio: ["ignore", "pipe", "pipe"]
  });
}

async function readEditorStartup(child, timeoutMs) {
  const stdout = child.stdout;
  const stderr = child.stderr;
  if (stdout === null || stderr === null) {
    throw new Error("Packed Editor child output is unavailable.");
  }
  let output = "";
  let errorOutput = "";
  stderr.on("data", (chunk) => {
    errorOutput += chunk.toString();
  });
  return new Promise((resolveStartup, rejectStartup) => {
    const timeout = setTimeout(() => {
      cleanup();
      rejectStartup(new Error(`Packed Editor did not start within ${timeoutMs}ms. ${errorOutput}`));
    }, timeoutMs);
    const onData = (chunk) => {
      output += chunk.toString();
      try {
        const value = JSON.parse(output);
        cleanup();
        resolveStartup(value);
      } catch {
        // Wait for the complete pretty-printed JSON object.
      }
    };
    const onExit = (code) => {
      cleanup();
      rejectStartup(new Error(`Packed Editor exited before startup (exit ${String(code)}). ${errorOutput}`));
    };
    const cleanup = () => {
      clearTimeout(timeout);
      stdout.off("data", onData);
      child.off("exit", onExit);
    };
    stdout.on("data", onData);
    child.once("exit", onExit);
  });
}

async function writeInstalledTheme(projectRoot) {
  const packageName = "@acme/mds-theme-editor-e2e";
  const packageDirectory = join(projectRoot, "node_modules/@acme/mds-theme-editor-e2e");
  const artifact = join(packageDirectory, "dist/theme");
  await mkdir(join(artifact, "blocks"), { recursive: true });
  await writeFile(join(projectRoot, "package.json"), `${JSON.stringify({
    name: "editor-e2e-project",
    private: true,
    dependencies: { [packageName]: "1.0.0" }
  }, null, 2)}\n`, "utf8");
  await writeFile(join(packageDirectory, "package.json"), `${JSON.stringify({
    name: packageName,
    mdsTheme: { dist: "./dist/theme" }
  }, null, 2)}\n`, "utf8");
  await writeFile(join(artifact, "theme.json"), `${JSON.stringify({
    name: "editor-e2e",
    label: "Editor E2E",
    css: "style.css",
    blocks: "blocks"
  }, null, 2)}\n`, "utf8");
  await writeFile(join(artifact, "style.css"), ".e2e-installed-theme{color:rgb(12 34 56)}", "utf8");
  await writeFile(join(artifact, "shell.html"), "<!doctype html><html><head>{{ head }}</head><body><main class=\"e2e-installed-theme\">{{ body }}</main>{{ scripts }}</body></html>", "utf8");
}

function themedSource(content) {
  return `---\ntheme: @acme/mds-theme-editor-e2e\n---\n\n# Packed Editor\n\n${content}\n`;
}

async function replaceEditorText(client, sessionId, text) {
  await evaluate(client, sessionId, `document.querySelector('.cm-content').focus()`);
  const modifier = process.platform === "darwin" ? 4 : 2;
  await client.send("Input.dispatchKeyEvent", {
    type: "rawKeyDown",
    key: "a",
    code: "KeyA",
    modifiers: modifier
  }, sessionId);
  await client.send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: "a",
    code: "KeyA",
    modifiers: modifier
  }, sessionId);
  await client.send("Input.insertText", { text }, sessionId);
}

async function clickButton(client, sessionId, label) {
  const clicked = await evaluate(
    client,
    sessionId,
    `(() => { const button = [...document.querySelectorAll('button')].find((candidate) => candidate.textContent?.trim() === ${JSON.stringify(label)}); if (!button) return false; button.click(); return true; })()`
  );
  if (clicked !== true) {
    throw new Error(`Could not find Editor button: ${label}.`);
  }
}

async function waitForExpression(client, sessionId, expression, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  do {
    if (await evaluate(client, sessionId, expression) === true) {
      return;
    }
    await delay(50);
  } while (Date.now() < deadline);
  throw new Error(`Timed out waiting for Editor browser expression: ${expression}.`);
}

async function evaluate(client, sessionId, expression) {
  const response = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  }, sessionId);
  if (response.exceptionDetails !== undefined) {
    throw new Error(response.exceptionDetails.text ?? `Browser evaluation failed: ${expression}.`);
  }
  return response.result?.value;
}

async function waitForFileContent(path, expected, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  do {
    if (await readFile(path, "utf8") === expected) {
      return;
    }
    await delay(50);
  } while (Date.now() < deadline);
  throw new Error(`Timed out waiting for Editor to save ${basename(path)}.`);
}

async function expectServerClosed(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  do {
    try {
      await fetch(url);
    } catch {
      return;
    }
    await delay(50);
  } while (Date.now() < deadline);
  throw new Error(`Editor server still accepts connections after shutdown: ${url}.`);
}

async function resolveChromeExecutable() {
  const candidates = [
    process.env.CHROME_BIN,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser"
  ].filter((candidate) => typeof candidate === "string" && candidate.length > 0);
  for (const candidate of candidates) {
    try {
      await access(candidate, constants.X_OK);
      return candidate;
    } catch {
      // Try the next platform-specific location.
    }
  }
  throw new Error("Chrome was not found. Set CHROME_BIN to run the Editor browser E2E test.");
}

async function launchChromeWithRetries(executable, projectRoot, attempts = 3) {
  const failures = [];
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const profile = join(projectRoot, `.chrome-profile-${attempt}`);
    await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    const child = spawn(
      executable,
      [
        "--headless=new",
        "--disable-gpu",
        "--disable-background-networking",
        "--disable-component-update",
        "--disable-extensions",
        "--no-first-run",
        "--no-default-browser-check",
        ...(process.platform === "linux" ? ["--disable-dev-shm-usage", "--no-sandbox"] : []),
        "--remote-debugging-port=0",
        `--user-data-dir=${profile}`
      ],
      { stdio: ["ignore", "ignore", "pipe"] }
    );
    try {
      const devToolsUrl = await waitForDevToolsUrl(child, 30_000);
      return { child, devToolsUrl };
    } catch (error) {
      failures.push(`attempt ${attempt}: ${error instanceof Error ? error.message : String(error)}`);
      child.kill("SIGKILL");
      await waitForExit(child, 2_000, true);
      if (attempt < attempts) {
        await delay(1_000);
      }
    }
  }
  throw new Error(`Chrome failed to start after ${attempts} attempts. ${failures.join(" | ")}`);
}

async function waitForDevToolsUrl(child, timeoutMs) {
  return new Promise((resolveUrl, rejectUrl) => {
    const stderr = child.stderr;
    if (stderr === null) {
      rejectUrl(new Error("Chrome stderr is unavailable."));
      return;
    }
    const timeout = setTimeout(() => {
      cleanup();
      const details = output.trim();
      rejectUrl(
        new Error(
          `Chrome did not expose a DevTools URL within ${timeoutMs}ms.${details.length === 0 ? "" : ` ${details}`}`
        )
      );
    }, timeoutMs);
    let output = "";
    const onData = (chunk) => {
      output += chunk.toString();
      const match = output.match(/DevTools listening on (ws:\/\/\S+)/);
      if (match?.[1] !== undefined) {
        cleanup();
        resolveUrl(match[1]);
      }
    };
    const onExit = (code) => {
      cleanup();
      rejectUrl(new Error(`Chrome exited before exposing DevTools (exit ${String(code)}).`));
    };
    const onError = (error) => {
      cleanup();
      rejectUrl(new Error(`Chrome could not be started: ${error.message}`));
    };
    const cleanup = () => {
      clearTimeout(timeout);
      stderr.off("data", onData);
      child.off("exit", onExit);
      child.off("error", onError);
    };
    stderr.on("data", onData);
    child.once("exit", onExit);
    child.once("error", onError);
  });
}

async function waitForExit(child, timeoutMs, forceOnTimeout = false) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }
  const exited = await Promise.race([
    new Promise((resolveExit) => child.once("exit", () => resolveExit(true))),
    delay(timeoutMs).then(() => false)
  ]);
  if (exited) {
    return;
  }
  if (!forceOnTimeout) {
    throw new Error(`Process did not exit within ${timeoutMs}ms.`);
  }
  child.kill("SIGKILL");
  await Promise.race([
    new Promise((resolveExit) => child.once("exit", () => resolveExit())),
    delay(2_000)
  ]);
}

class CdpClient {
  nextId = 1;
  pending = new Map();
  eventWaiters = [];

  constructor(socket) {
    this.socket = socket;
    socket.addEventListener("message", (event) => this.handleMessage(String(event.data)));
  }

  static async connect(url) {
    const socket = new WebSocket(url);
    await new Promise((resolveOpen, rejectOpen) => {
      socket.addEventListener("open", () => resolveOpen(), { once: true });
      socket.addEventListener("error", () => rejectOpen(new Error(`Could not connect to Chrome DevTools: ${url}`)), { once: true });
    });
    return new CdpClient(socket);
  }

  send(method, params = {}, sessionId) {
    const id = this.nextId;
    this.nextId += 1;
    return new Promise((resolveResult, rejectResult) => {
      this.pending.set(id, { resolve: resolveResult, reject: rejectResult });
      this.socket.send(JSON.stringify({ id, method, params, ...(sessionId === undefined ? {} : { sessionId }) }));
    });
  }

  waitForEvent(method, sessionId, timeoutMs) {
    return new Promise((resolveEvent, rejectEvent) => {
      const waiter = {
        method,
        ...(sessionId === undefined ? {} : { sessionId }),
        resolve: resolveEvent,
        reject: rejectEvent,
        timeout: setTimeout(() => {
          const index = this.eventWaiters.indexOf(waiter);
          if (index >= 0) this.eventWaiters.splice(index, 1);
          rejectEvent(new Error(`Timed out waiting for Chrome DevTools event ${method}.`));
        }, timeoutMs)
      };
      this.eventWaiters.push(waiter);
    });
  }

  close() {
    this.socket.close();
  }

  handleMessage(raw) {
    const message = JSON.parse(raw);
    if (message.id !== undefined) {
      const pending = this.pending.get(message.id);
      if (pending !== undefined) {
        this.pending.delete(message.id);
        if (message.error !== undefined) pending.reject(new Error(message.error.message ?? "Chrome DevTools command failed."));
        else pending.resolve(message.result ?? {});
      }
      return;
    }
    if (message.method !== undefined) {
      const index = this.eventWaiters.findIndex((waiter) => waiter.method === message.method && waiter.sessionId === message.sessionId);
      if (index >= 0) {
        const waiter = this.eventWaiters.splice(index, 1)[0];
        clearTimeout(waiter.timeout);
        waiter.resolve();
      }
    }
  }
}

function readArgument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function delay(ms) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

await main();
