# MDS 社交媒体介绍短视频

| 版本 | 画幅 | 时长 | 语言 |
|------|------|------|------|
| 竖版 | **9:16** | ~73s | 中文女声 |
| 横版 | **16:9** | ~73s | 中文女声 |
| 英文横版 | **16:9** | ~71s | 英文女声 |
| **效果展示** | **16:9** | **~78s** | **无口播** |

## 成品

| 文件 | 说明 |
|------|------|
| `dist/mds-intro-9x16.mp4` | 竖版 · 抖音 / 小红书 / Shorts / Reels |
| `dist/mds-intro-16x9.mp4` | 横版中文 · B 站 / YouTube / 网站 |
| `dist/mds-intro-16x9-en.mp4` | 横版英文 |
| `dist/mds-showcase-16x9.mp4` | **Editor 录屏 · 无口播 · 示例滚动 + 实时预览** |
| `dist/cover-showcase-16x9.png` | 效果展示封面 |
| `POST.md` | 中文发布文案 |
| `assets/narration.txt` / `narration-en.txt` | 口播原文 |
| `src/index.html` | 竖版动画源 |
| `src/landscape.html` | 横版中文动画源 |
| `src/landscape-en.html` | 横版英文动画源 |
| `record-editor.mjs` | Editor 录屏（示例滚动 + 新建 MDS 实时预览） |

## 重新生成

```sh
cd marketing/social-intro
npm install
npx playwright install chromium

# 可选：改口播后重新合成语音
# edge-tts --voice zh-CN-XiaoxiaoNeural --rate=+5% --file assets/narration.txt --write-media assets/narration.mp3 --write-subtitles assets/narration.vtt
# edge-tts --voice en-US-JennyNeural --rate=+5% --file assets/narration-en.txt --write-media assets/narration-en.mp3 --write-subtitles assets/narration-en.vtt

npm run record              # 竖版 9:16 中文
npm run record:landscape    # 横版 16:9 中文
npm run record:landscape-en # 横版 16:9 英文
npm run record:showcase     # Editor 录屏 16:9 无口播
# 或一次全录：npm run record:all
```

## 效果展示（Editor 录屏 · 无口播 · ~60s）

1. 启动 MDS Editor，依次打开 **Landing → Basic → Motion** 三个内置示例
2. 每个示例在 Preview 面板中快速滚动浏览
3. 点击 **New** 新建本地 MDS 文档，逐段输入 Markdown / 语义块 / 控件，展示右侧实时预览

```sh
# 需先在仓库根目录 build 一次
cd /workspace && pnpm build
cd marketing/social-intro && npm run record:showcase
```

## 介绍视频镜头结构（中文）

| 时间 | 画面 |
|------|------|
| 0–9s | 双痛点 Hook（单调 vs 复杂） |
| 9–16s | MDS +「一种新的标记语言」+ Think in Markdown / Render in HTML |
| 16–27s | 核心机制（MDS 渲染器） |
| 27–38s | 示例 01：基础 Markdown → HTML 预览 |
| 38–47s | 示例 02：hero 语义块 → 页面预览 |
| 47–57s | 示例 03：button / slider / switch 控件 |
| 57–65s | 主题介绍：default / light / dark / rich，可定制 |
| 65–73s | 安装命令 + GitHub |
