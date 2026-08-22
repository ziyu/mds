import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFile, mkdir, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const DIST = path.join(ROOT, "dist");

const VARIANTS = {
  "9x16": {
    page: "/src/index.html",
    audio: "assets/narration.mp3",
    out: "mds-intro-9x16.mp4",
    cover: "cover.png",
    width: 1080,
    height: 1920,
    port: 8768,
  },
  "16x9-zh": {
    page: "/src/landscape.html",
    audio: "assets/narration.mp3",
    out: "mds-intro-16x9.mp4",
    cover: "cover-16x9.png",
    width: 1920,
    height: 1080,
    port: 8769,
  },
  "16x9-en": {
    page: "/src/landscape-en.html",
    audio: "assets/narration-en.mp3",
    out: "mds-intro-16x9-en.mp4",
    cover: "cover-16x9-en.png",
    width: 1920,
    height: 1080,
    port: 8770,
  },
};

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".vtt": "text/vtt; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function parseVariant() {
  const arg = process.argv.find((a) => a.startsWith("--variant="));
  const name = arg ? arg.slice("--variant=".length) : process.argv[2] || "9x16";
  if (!VARIANTS[name]) {
    throw new Error(`Unknown variant "${name}". Use: ${Object.keys(VARIANTS).join(", ")}`);
  }
  return { name, ...VARIANTS[name] };
}

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

function startServer(port) {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url || "/", `http://127.0.0.1:${port}`);
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
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

async function recordVariant(variant) {
  const silent = Boolean(variant.silent);
  const api = variant.api || "__mdsPromo";
  const AUDIO = variant.audio ? path.join(ROOT, variant.audio) : null;
  const RAW = path.join(DIST, `raw-${variant.name}.webm`);
  const OUT = path.join(DIST, variant.out);
  const COVER = path.join(DIST, variant.cover);
  const { width: WIDTH, height: HEIGHT, port: PORT } = variant;

  if (!silent && AUDIO && !(await exists(AUDIO))) {
    throw new Error(`Missing narration audio: ${AUDIO}`);
  }
  await mkdir(DIST, { recursive: true });

  const server = await startServer(PORT);
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

  await page.goto(`http://127.0.0.1:${PORT}${variant.page}`, {
    waitUntil: "domcontentloaded",
  });

  await page.waitForFunction(
    (apiName) => {
      const api = window[apiName];
      return api?.ready?.() === true && Number.isFinite(api.duration()) && api.duration() > 1;
    },
    api,
    { timeout: 60000 }
  );

  let durationSec;
  let leadInSec = 0;

  if (silent) {
    await page.evaluate((apiName) => window[apiName].play(), api);
    leadInSec = Math.max(0, (Date.now() - recStartedAt) / 1000);
    durationSec = await page.evaluate((apiName) => window[apiName].duration(), api);
    console.log(`[${variant.name}] Recording silent ${durationSec.toFixed(2)}s (trim lead-in ${leadInSec.toFixed(2)}s)`);
  } else {
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

    leadInSec = Math.max(0, (Date.now() - recStartedAt) / 1000);

    await page.evaluate(() => {
      const a = document.getElementById("voice");
      a.loop = false;
      a.currentTime = 0;
      return a.play();
    });

    await page.waitForFunction(() => (document.getElementById("voice")?.currentTime || 0) > 0.05, null, {
      timeout: 10000,
    });

    durationSec = await page.evaluate((apiName) => window[apiName].duration(), api);
    console.log(`[${variant.name}] Recording audio ${durationSec.toFixed(2)}s (trim lead-in ${leadInSec.toFixed(2)}s)`);
  }

  await page.waitForFunction((apiName) => window[apiName].ended() === true, api, {
    timeout: Math.ceil(durationSec * 1000) + 15000,
  });
  await page.evaluate((apiName) => window[apiName].freezeCta?.(), api);
  await page.waitForTimeout(1500);

  await page.close();
  if (!video) throw new Error("No video object from Playwright");
  await video.saveAs(RAW);
  await context.close();
  await browser.close();
  server.close();
  await video.delete().catch(() => {});

  const trimStart = Math.min(Math.max(leadInSec, 0), 8);
  const ffmpegArgs = silent
    ? [
        "-y",
        "-ss",
        String(trimStart),
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
        "-t",
        String(durationSec),
        "-movflags",
        "+faststart",
        OUT,
      ]
    : [
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
      ];
  await run("ffmpeg", ffmpegArgs);

  await run("ffmpeg", ["-y", "-ss", "1.2", "-i", OUT, "-frames:v", "1", COVER]);

  console.log(`\nWrote ${OUT}`);
  console.log(`Cover ${COVER}`);
  await access(RAW).then(() => run("rm", ["-f", RAW])).catch(() => {});
}

async function main() {
  const variant = parseVariant();
  await recordVariant(variant);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
