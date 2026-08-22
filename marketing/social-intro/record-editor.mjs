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
  { id: "landing", label: "Landing", scrollMs: 3000, scrollSteps: 5, settleMs: 800 },
  { id: "basic", label: "Basic", scrollMs: 3800, scrollSteps: 5, settleMs: 1000 },
  { id: "motion", label: "Motion", scrollMs: 2000, scrollSteps: 4, settleMs: 1000 },
];

const LIVE_DEMO_CHUNKS = [
  "---\ntitle: 实时预览\n---\n\n",
  "# Hello MDS\n\n",
  "- Markdown 写作\n- HTML 级效果\n- 即时预览\n\n",
  "::: hero\n",
  "# 像写 Markdown 一样写网页\n\n",
  "用语义块描述页面结构，MDS 渲染器负责呈现。\n\n",
  "[开始 -> /docs]\n",
  ":::\n\n",
  ':: button label="开始"\n',
  ':: slider label="音量" min=0 max=100 value=60\n',
  ':: switch label="深色模式" checked\n',
];

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

async function selectExample(page, exampleId) {
  await page.selectOption('select[aria-label="Document"]', `example:${exampleId}`);
  await page.waitForTimeout(120);
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

async function typeChunks(page, chunks, chunkPauseMs = 550) {
  await focusEditor(page);
  for (const chunk of chunks) {
    await page.keyboard.insertText(chunk);
    await page.waitForTimeout(chunkPauseMs);
    await waitForPreviewReady(page).catch(() => {});
  }
}

async function runDemo(page) {
  page.on("dialog", (dialog) => dialog.accept());

  await page.goto(EDITOR_URL, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForSelector(".app-shell", { timeout: 60_000 });
  await waitForPreviewReady(page);
  await page.waitForTimeout(150);

  for (let i = 0; i < EXAMPLES.length; i++) {
    const example = EXAMPLES[i];
    console.log(`[demo] Example: ${example.label}`);
    if (i > 0) {
      await selectExample(page, example.id);
    }
    await resetPreviewScroll(page);
    await page.waitForTimeout(example.settleMs ?? 1000);
    await scrollPreview(page, example.scrollMs, example.scrollSteps);
    await page.waitForTimeout(100);
  }

  console.log("[demo] New document + live typing");
  await page.getByRole("button", { name: "New", exact: true }).click();
  await page.waitForTimeout(500);
  await waitForPreviewReady(page);
  await clearEditor(page);
  await page.waitForTimeout(300);
  await typeChunks(page, LIVE_DEMO_CHUNKS, 650);
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
