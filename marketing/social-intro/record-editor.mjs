import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdir, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import net from "node:net";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");
const DIST = path.join(__dirname, "dist");

const EDITOR_PORT = Number(process.env.MDS_EDITOR_PORT || 5199);
const EDITOR_URL = process.env.MDS_EDITOR_URL || `http://127.0.0.1:${EDITOR_PORT}/`;
const WIDTH = 1920;
const HEIGHT = 1080;
const OUT = path.join(DIST, "mds-showcase-16x9.mp4");
const COVER = path.join(DIST, "cover-showcase-16x9.png");
const RAW = path.join(DIST, "raw-editor-showcase.webm");

const EXAMPLES = [
  { id: "landing", label: "Landing", scrollMs: 3000, scrollSteps: 5, settleMs: 2000 },
  { id: "basic", label: "Basic", scrollMs: 3800, scrollSteps: 5, settleMs: 2000 },
  { id: "motion", label: "Motion", scrollMs: 2000, scrollSteps: 4, settleMs: 2000 },
];

const LIVE_DEMO_SOURCE = `---
title: Live Preview
---

# Hello MDS

Plain Markdown stays readable. Semantic blocks add the rest.

- Write in Markdown
- Rich HTML output
- Instant preview

::: hero
# Write pages like Markdown

Describe structure with semantic blocks. MDS renders the rest.

[Get started -> /docs]
:::

:: button label="Start"
:: slider label="Volume" name="volume" min=0 max=100 value=60
:: switch label="Dark mode" name="dark" checked
`;

/** Chunk boundaries for brief pauses (after structural sections). */
const LIVE_DEMO_PAUSE_AT = new Set([
  LIVE_DEMO_SOURCE.indexOf("# Hello MDS"),
  LIVE_DEMO_SOURCE.indexOf("::: hero"),
  LIVE_DEMO_SOURCE.indexOf(":: button"),
  LIVE_DEMO_SOURCE.indexOf(":: slider"),
  LIVE_DEMO_SOURCE.indexOf(":: switch"),
]);

function run(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit", ...options });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with ${code}`));
    });
  });
}

function waitForPort(url, timeoutMs = 120_000) {
  const { hostname, port } = new URL(url);
  const started = Date.now();

  return new Promise((resolve, reject) => {
    const tick = () => {
      const socket = net.createConnection(Number(port), hostname);
      socket.once("connect", () => {
        socket.end();
        resolve();
      });
      socket.once("error", () => {
        socket.destroy();
        if (Date.now() - started > timeoutMs) {
          reject(new Error(`Timed out waiting for ${url}`));
          return;
        }
        setTimeout(tick, 400);
      });
    };
    tick();
  });
}

function startEditorDevServer() {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "pnpm",
      ["--filter", "@mds-crate/editor", "exec", "vite", "--host", "127.0.0.1", "--port", String(EDITOR_PORT), "--strictPort"],
      {
        cwd: REPO_ROOT,
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, FORCE_COLOR: "0" },
      }
    );

    let settled = false;
    const readyPattern = new RegExp(`http://127\\.0\\.0\\.1:${EDITOR_PORT}/`);

    const onData = (chunk) => {
      const text = chunk.toString();
      process.stdout.write(`[editor] ${text}`);
      if (!settled && readyPattern.test(text)) {
        settled = true;
        resolve(child);
      }
    };

    child.stdout?.on("data", onData);
    child.stderr?.on("data", onData);
    child.on("exit", (code) => {
      if (!settled) {
        settled = true;
        reject(new Error(`Editor dev server exited with ${code}`));
      }
    });

    setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(child);
      }
    }, 30_000);
  });
}

async function waitForPreviewReady(page) {
  const frame = page.frameLocator('iframe[title="MDS preview"]');
  await page.waitForSelector('iframe[title="MDS preview"]', { timeout: 60_000 });
  await frame.locator("body").waitFor({ state: "attached", timeout: 90_000 });
  await page.waitForFunction(async () => {
    const iframe = document.querySelector('iframe[title="MDS preview"]');
    if (!(iframe instanceof HTMLIFrameElement)) return false;
    const len = iframe.getAttribute("srcdoc")?.length ?? 0;
    return len > 500 && !iframe.getAttribute("srcdoc")?.includes("Loading theme...");
  }, null, { timeout: 90_000 });
  const scrollHeight = await frame.locator("body").evaluate((el) => el.scrollHeight);
  if (scrollHeight < 80) {
    throw new Error(`Preview iframe scrollHeight too small: ${scrollHeight}`);
  }
}

/** Visible demo cursor + focus ring for UI click choreography. */
async function installDemoCursor(page) {
  await page.addStyleTag({
    content: `
      .mds-demo-cursor {
        position: fixed;
        left: 50%;
        top: 50%;
        width: 22px;
        height: 22px;
        pointer-events: none;
        z-index: 2147483647;
        opacity: 0;
        transform: translate(-14%, -8%) scale(0.86);
        filter: drop-shadow(0 2px 6px rgba(29, 27, 23, 0.28));
        transition:
          left 480ms cubic-bezier(0.22, 0.82, 0.2, 1),
          top 480ms cubic-bezier(0.22, 0.82, 0.2, 1),
          opacity 180ms ease,
          transform 160ms ease;
      }
      .mds-demo-cursor.is-visible {
        opacity: 1;
        transform: translate(-14%, -8%) scale(1);
      }
      .mds-demo-cursor.is-pressing {
        transform: translate(-14%, -8%) scale(0.9);
      }
      .mds-demo-cursor-pointer {
        position: absolute;
        inset: 0;
        background:
          url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='M5 3.5 19.5 12.2l-6.1 1.5 3.1 7.2-2.7 1.1-3.1-7.3L5 17.8V3.5Z' fill='%23fffdf8' stroke='%231d1b17' stroke-width='1.35' stroke-linejoin='round'/%3E%3C/svg%3E")
          center / contain no-repeat;
      }
      .mds-demo-cursor-ripple {
        position: absolute;
        left: 2px;
        top: 2px;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        border: 1.5px solid rgba(31, 84, 127, 0.55);
        background: rgba(31, 84, 127, 0.12);
        opacity: 0;
        transform: scale(0.4);
        pointer-events: none;
      }
      .mds-demo-cursor.is-pressing .mds-demo-cursor-ripple {
        animation: mds-demo-ripple 420ms ease-out forwards;
      }
      @keyframes mds-demo-ripple {
        0% { opacity: 0.7; transform: scale(0.45); }
        100% { opacity: 0; transform: scale(2.4); }
      }
      .mds-demo-focus {
        border-radius: 8px !important;
        background: rgba(31, 84, 127, 0.07) !important;
        box-shadow:
          0 0 0 1px rgba(31, 84, 127, 0.38),
          0 10px 28px rgba(31, 84, 127, 0.12) !important;
        transition: background 200ms ease, box-shadow 200ms ease;
      }
    `,
  });

  await page.evaluate(() => {
    let cursor = document.querySelector(".mds-demo-cursor");
    if (!(cursor instanceof HTMLElement)) {
      cursor = document.createElement("div");
      cursor.className = "mds-demo-cursor";
      cursor.setAttribute("aria-hidden", "true");
      cursor.innerHTML = '<span class="mds-demo-cursor-ripple"></span><span class="mds-demo-cursor-pointer"></span>';
      document.documentElement.append(cursor);
    }
  });
}

async function moveDemoCursor(page, locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("Cannot move demo cursor: element has no bounding box");
  const x = Math.round(box.x + box.width * 0.55);
  const y = Math.round(box.y + box.height * 0.55);

  await installDemoCursor(page);

  // Appear at viewport center first, then animate to the target.
  await page.evaluate(() => {
    const cursor = document.querySelector(".mds-demo-cursor");
    if (!(cursor instanceof HTMLElement)) return;
    cursor.style.transition = "none";
    cursor.style.left = "50%";
    cursor.style.top = "42%";
    cursor.classList.add("is-visible");
    cursor.classList.remove("is-pressing");
    void cursor.offsetWidth;
    cursor.style.transition = "";
  });
  await page.waitForTimeout(180);
  await page.evaluate(({ x, y }) => {
    const cursor = document.querySelector(".mds-demo-cursor");
    if (!(cursor instanceof HTMLElement)) return;
    cursor.style.left = `${x}px`;
    cursor.style.top = `${y}px`;
  }, { x, y });
  await page.mouse.move(x, y);
  await page.waitForTimeout(620);
}

async function pressDemoCursor(page) {
  await page.evaluate(() => {
    const cursor = document.querySelector(".mds-demo-cursor");
    if (!(cursor instanceof HTMLElement)) return;
    // Retrigger ripple animation cleanly on each press.
    const ripple = cursor.querySelector(".mds-demo-cursor-ripple");
    if (ripple instanceof HTMLElement) {
      ripple.replaceWith(ripple.cloneNode(true));
    }
    cursor.classList.add("is-pressing");
  });
  await page.waitForTimeout(220);
  await page.evaluate(() => {
    document.querySelector(".mds-demo-cursor")?.classList.remove("is-pressing");
  });
  await page.waitForTimeout(100);
}

async function setDemoFocus(page, locator, on) {
  await locator.evaluate((el, enabled) => {
    el.classList.toggle("mds-demo-focus", Boolean(enabled));
  }, on);
}

async function hideDemoCursor(page) {
  await page.evaluate(() => {
    document.querySelector(".mds-demo-cursor")?.classList.remove("is-visible", "is-pressing");
    document.querySelectorAll(".mds-demo-focus").forEach((el) => el.classList.remove("mds-demo-focus"));
  });
}

async function selectExample(page, exampleId) {
  const select = page.locator('select[aria-label="Document"]');
  const switcher = page.locator(".document-switcher");
  await setDemoFocus(page, switcher, true);
  await moveDemoCursor(page, select);
  await page.waitForTimeout(1100);
  await pressDemoCursor(page);
  await select.click({ force: true });
  await page.waitForTimeout(600);
  await select.selectOption(`example:${exampleId}`);
  await page.waitForTimeout(700);
  await setDemoFocus(page, switcher, false);
  await hideDemoCursor(page);
  await waitForPreviewReady(page);
}

async function selectTheme(page, themeName) {
  const field = page.locator(".theme-select-field");
  const themeSelect = field.locator("select");
  await themeSelect.waitFor({ state: "visible", timeout: 15_000 });
  await setDemoFocus(page, field, true);
  await moveDemoCursor(page, themeSelect);
  await page.waitForTimeout(1100);
  await pressDemoCursor(page);
  await themeSelect.click({ force: true });
  await page.waitForTimeout(600);
  await themeSelect.selectOption(themeName);
  await page.waitForTimeout(700);
  await setDemoFocus(page, field, false);
  await hideDemoCursor(page);
  await waitForPreviewReady(page);
}

/** Scroll preview from top to bottom in exactly `totalMs` milliseconds. */
async function scrollPreview(page, totalMs, steps) {
  const frame = page.frameLocator('iframe[title="MDS preview"]');
  const maxY = await frame.locator("body").evaluate(() =>
    Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) - window.innerHeight
  );
  if (maxY <= 0 || steps <= 0) return;

  const started = Date.now();
  for (let i = 1; i <= steps; i++) {
    const targetTime = (totalMs * i) / steps;
    const y = Math.round((maxY * i) / steps);
    await frame.locator("html").evaluate((_, top) => window.scrollTo({ top, behavior: "auto" }), y);
    const wait = targetTime - (Date.now() - started);
    if (wait > 0) await page.waitForTimeout(wait);
  }
}

async function resetPreviewScroll(page) {
  const frame = page.frameLocator('iframe[title="MDS preview"]');
  await frame.locator("html").evaluate(() => window.scrollTo({ top: 0, behavior: "auto" }));
}

async function focusEditor(page) {
  await page.locator(".editor-host .cm-content").click({ timeout: 10_000 });
}

async function clearEditor(page) {
  await focusEditor(page);
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Backspace");
  await page.waitForTimeout(200);
}

/**
 * Type with a visible caret, but use insertText (not keydown) so Enter does not
 * trigger the editor's ::: auto-close and corrupt the MDS structure.
 */
async function typeLiveDemo(page, source, { charDelayMs = 26, sectionPauseMs = 380 } = {}) {
  await focusEditor(page);
  for (let i = 0; i < source.length; i++) {
    if (LIVE_DEMO_PAUSE_AT.has(i) && i > 0) {
      await page.waitForTimeout(sectionPauseMs);
      await waitForPreviewReady(page).catch(() => {});
    }
    await page.keyboard.insertText(source[i]);
    await page.waitForTimeout(charDelayMs);
  }
  await page.waitForTimeout(sectionPauseMs);
  await waitForPreviewReady(page).catch(() => {});
}

async function runDemo(page) {
  page.on("dialog", (dialog) => dialog.accept());

  await page.goto(EDITOR_URL, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForSelector(".app-shell", { timeout: 60_000 });
  await waitForPreviewReady(page);
  await installDemoCursor(page);
  await page.waitForTimeout(150);

  for (let i = 0; i < EXAMPLES.length; i++) {
    const example = EXAMPLES[i];
    console.log(`[demo] Example: ${example.label}`);
    if (i > 0) {
      await selectExample(page, example.id);
      await hideDemoCursor(page);
    }
    await resetPreviewScroll(page);
    await page.waitForTimeout(example.settleMs ?? 1000);
    await scrollPreview(page, example.scrollMs, example.scrollSteps);
    await page.waitForTimeout(100);
  }

  console.log("[demo] Switch theme: canvas");
  await selectTheme(page, "canvas");
  await hideDemoCursor(page);
  await page.waitForTimeout(2000);

  console.log("[demo] New document + live typing");
  const newButton = page.getByRole("button", { name: "New", exact: true });
  await setDemoFocus(page, newButton, true);
  await moveDemoCursor(page, newButton);
  await page.waitForTimeout(900);
  await pressDemoCursor(page);
  await newButton.click();
  await page.waitForTimeout(500);
  await hideDemoCursor(page);
  await page.waitForTimeout(400);
  await waitForPreviewReady(page);
  await clearEditor(page);
  await page.waitForTimeout(300);
  await typeLiveDemo(page, LIVE_DEMO_SOURCE, { charDelayMs: 26, sectionPauseMs: 380 });
  await page.waitForTimeout(1800);

  await scrollPreview(page, 1400, 3);
  await page.waitForTimeout(1000);
}

async function main() {
  await mkdir(DIST, { recursive: true });

  let editorProcess;
  const ownsEditor = !process.env.MDS_EDITOR_URL;

  if (ownsEditor) {
    console.log(`Starting editor dev server on port ${EDITOR_PORT}…`);
    editorProcess = await startEditorDevServer();
    await waitForPort(EDITOR_URL);
    console.log(`Editor ready at ${EDITOR_URL}`);
  }

  const browser = await chromium.launch({
    headless: true,
    args: ["--autoplay-policy=no-user-gesture-required"],
  });

  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
    recordVideo: {
      dir: DIST,
      size: { width: WIDTH, height: HEIGHT },
    },
  });

  const page = await context.newPage();
  const video = page.video();

  try {
    await runDemo(page);
  } finally {
    await page.waitForTimeout(800);
    await page.close();
    if (video) {
      await video.saveAs(RAW);
      await video.delete().catch(() => {});
    }
    await context.close();
    await browser.close();
    if (editorProcess) {
      editorProcess.kill("SIGTERM");
    }
  }

  await run("ffmpeg", [
    "-y",
    "-i",
    RAW,
    "-map",
    "0:v:0",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-preset",
    "medium",
    "-crf",
    "18",
    "-movflags",
    "+faststart",
    OUT,
  ]);

  await run("ffmpeg", ["-y", "-ss", "2", "-i", OUT, "-frames:v", "1", COVER]);
  await access(RAW).then(() => run("rm", ["-f", RAW])).catch(() => {});

  console.log(`\nWrote ${OUT}`);
  console.log(`Cover ${COVER}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
