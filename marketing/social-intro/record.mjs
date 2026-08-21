import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFile, mkdir, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const DIST = path.join(ROOT, "dist");
const RAW = path.join(DIST, "raw.webm");
const OUT = path.join(DIST, "mds-intro-9x16.mp4");
const AUDIO = path.join(ROOT, "assets", "narration.mp3");
const PORT = 8768;
const WIDTH = 1080;
const HEIGHT = 1920;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".vtt": "text/vtt; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit" });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with ${code}`));
    });
  });
}

function startServer() {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", `http://127.0.0.1:${PORT}`);
      let rel = decodeURIComponent(url.pathname);
      if (rel === "/") rel = "/src/index.html";
      const filePath = path.join(ROOT, rel);
      if (!filePath.startsWith(ROOT)) {
        res.writeHead(403);
        res.end("forbidden");
        return;
      }
      const data = await readFile(filePath);
      const ext = path.extname(filePath);
      res.writeHead(200, {
        "Content-Type": MIME[ext] || "application/octet-stream",
        "Content-Length": data.length,
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-cache",
      });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end("not found");
    }
  });

  return new Promise((resolve) => {
    server.listen(PORT, "127.0.0.1", () => resolve(server));
  });
}

async function main() {
  if (!(await exists(AUDIO))) {
    throw new Error(`Missing narration audio: ${AUDIO}`);
  }
  await mkdir(DIST, { recursive: true });

  const server = await startServer();
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
  const recStartedAt = Date.now();

  // Do not autoplay — start narration only after recorder is ready (keeps A/V aligned)
  await page.goto(`http://127.0.0.1:${PORT}/src/index.html`, {
    waitUntil: "domcontentloaded",
  });

  await page.waitForFunction(
    () => window.__mdsPromo?.ready?.() === true && Number.isFinite(window.__mdsPromo.duration()) && window.__mdsPromo.duration() > 1,
    null,
    { timeout: 60000 }
  );

  // Ensure media element has a finite duration before we start
  await page.evaluate(async () => {
    const a = document.getElementById("voice");
    a.loop = false;
    if (!Number.isFinite(a.duration) || a.duration <= 0) {
      a.load();
      await new Promise((resolve, reject) => {
        const ok = () => resolve();
        const fail = () => reject(new Error("audio load failed"));
        a.addEventListener("loadedmetadata", ok, { once: true });
        a.addEventListener("error", fail, { once: true });
        setTimeout(ok, 3000);
      });
    }
  });

  const leadInSec = Math.max(0, (Date.now() - recStartedAt) / 1000);

  await page.evaluate(() => {
    const a = document.getElementById("voice");
    a.loop = false;
    a.currentTime = 0;
    return a.play();
  });

  await page.waitForFunction(() => (document.getElementById("voice")?.currentTime || 0) > 0.05, null, {
    timeout: 10000,
  });

  const durationSec = await page.evaluate(() => window.__mdsPromo.duration());
  console.log(`Recording audio ${durationSec.toFixed(2)}s (trim lead-in ${leadInSec.toFixed(2)}s)`);

  await page.waitForFunction(() => window.__mdsPromo.ended() === true, null, {
    timeout: Math.ceil(durationSec * 1000) + 15000,
  });
  await page.evaluate(() => window.__mdsPromo.freezeCta?.());
  await page.waitForTimeout(1500);

  await page.close();
  if (!video) throw new Error("No video object from Playwright");
  await video.saveAs(RAW);
  await context.close();
  await browser.close();
  server.close();
  await video.delete().catch(() => {});

  // Trim recorder lead-in, then mux with narration audio
  const trimStart = Math.min(Math.max(leadInSec, 0), 8);
  await run("ffmpeg", [
    "-y",
    "-ss",
    String(trimStart),
    "-i",
    RAW,
    "-i",
    AUDIO,
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-preset",
    "medium",
    "-crf",
    "18",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-t",
    String(durationSec),
    "-movflags",
    "+faststart",
    OUT,
  ]);

  console.log(`\nWrote ${OUT}`);
  console.log(`Raw capture: ${RAW}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
