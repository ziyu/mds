# MDS 社交媒体介绍短视频

竖屏 **9:16** · **约 65 秒** · 中文口播（女声）+ 画面字幕

## 成品

| 文件 | 说明 |
|------|------|
| `dist/mds-intro-9x16.mp4` | 可直接发 抖音 / 小红书 / B 站短视频 / Reels / Shorts |
| `POST.md` | 各平台发布文案 |
| `assets/narration.txt` | 口播原文 |
| `src/index.html` | 动画源文件（可改文案后重录） |

## 重新生成

```sh
cd marketing/social-intro
npm install
npx playwright install chromium
# 可选：改口播后重新合成语音
# edge-tts --voice zh-CN-XiaoxiaoNeural --rate=+5% --file assets/narration.txt --write-media assets/narration.mp3 --write-subtitles assets/narration.vtt
npm run record
```

## 镜头结构

| 时间 | 画面 |
|------|------|
| 0–9s | 双痛点 Hook（单调 vs 复杂） |
| 9–16s | MDS +「一种新的标记语言」画面介绍 + Think in Markdown / Render in HTML（口播保留「消除这些烦恼」，画面不显示） |
| 16–27s | 核心机制（MDS 渲染器） |
| 27–38s | 示例 01：基础 Markdown → HTML 预览 |
| 38–47s | 示例 02：hero 语义块 → 页面预览 |
| 47–57s | 示例 03：button / slider / switch 控件 |
| 57–65s | 安装命令 + GitHub；License 在底部 |
