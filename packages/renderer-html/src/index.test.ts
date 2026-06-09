import { describe, expect, it } from "vitest";
import { parseMds } from "@mds/parser";
import { renderHtml } from "./index.js";

describe("renderHtml", () => {
  it("renders a complete MDS document to semantic HTML", () => {
    const document = parseMds(`---
title: Demo
description: A demo page
lang: zh-CN
---

@state liked true
@list features
- 简洁
- 丰富

::: hero
# MDS

[开始 -> /docs]
[官网 >> https://example.com]
:::

::: tabs docs
--- 内容
Markdown 内容。

--- 渲染
输出 HTML。
:::

::: if liked
谢谢喜欢。
:::

::: each features
- {{ item }}
:::

::: form contact
? email 邮箱 邮箱地址
? message 长文本 留言内容
[提交 !submit contact]
:::
`);

    const html = renderHtml(document);

    expect(html).toContain('<html lang="zh-CN">');
    expect(html).toContain("<title>Demo</title>");
    expect(html).toContain('<meta name="description" content="A demo page">');
    expect(html).toContain('<section class="hero">');
    expect(html).toContain('<a class="action primary" href="/docs">开始</a>');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('<section class="tabs">');
    expect(html).toContain("谢谢喜欢。");
    expect(html).toContain("<li>简洁</li>");
    expect(html).toContain("<li>丰富</li>");
    expect(html).toContain('<form id="contact" class="form" method="post">');
    expect(html).toContain('<input id="field-email" name="email" type="email">');
    expect(html).toContain('<textarea id="field-message" name="message"></textarea>');
    expect(html).toContain('data-action="submit"');
    expect(html).not.toContain("mds-");
    expect(html).not.toContain("data-mds");
  });

  it("preserves command actions as HTML metadata without a runtime script", () => {
    const document = parseMds(`::: details faq
FAQ
:::

[展开 !toggle faq]
`);
    const html = renderHtml(document);

    expect(html).toContain('data-action="toggle"');
    expect(html).toContain('data-target="faq"');
    expect(html).not.toContain("mds-");
    expect(html).not.toContain("data-mds");
    expect(html).not.toContain("<script");
  });

  it("supports custom block renderers for theme and plugin extensions", () => {
    const document = parseMds(`::: x-feature
# Custom

Body
:::
`);
    const html = renderHtml(document, {
      blockRenderers: {
        "x-feature": (block, context) =>
          `<article class="feature-card">${context.renderChildren(block.children)}</article>`
      }
    });

    expect(html).toContain('<article class="feature-card"><h1>Custom</h1>');
    expect(html).not.toContain('data-block="x-feature"');
  });

  it("allows default block renderers to be disabled", () => {
    const document = parseMds(`::: hero
# Hero
:::
`);
    const html = renderHtml(document, {
      includeDefaultBlockRenderers: false
    });

    expect(html).toContain('<section class="block hero" data-block="hero">');
  });
});
