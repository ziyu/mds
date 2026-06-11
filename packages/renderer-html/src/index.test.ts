import { describe, expect, it } from "vitest";
import { parseMds } from "@mds/parser";
import { renderHtml, renderHtmlResult } from "./index.js";

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

::: nav main
[Docs -> #docs]
[Contact => #contact]
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
    expect(html).toContain('<nav id="main" class="nav" aria-label="main">');
    expect(html).toContain('href="#docs" data-nav-target="docs"');
    expect(html).toContain('<span class="nav-target">#contact</span>');
    expect(html).toContain('<section id="docs" class="tabs">');
    expect(html).toContain("谢谢喜欢。");
    expect(html).toContain("<li>简洁</li>");
    expect(html).toContain("<li>丰富</li>");
    expect(html).toContain('<form id="contact" class="form" method="post">');
    expect(html).toContain('<input id="field-email" name="email" type="email">');
    expect(html).toContain('<textarea id="field-message" name="message"></textarea>');
    expect(html).toContain('data-action="submit"');
    expect(html).toContain('form="contact"');
    expect(html).not.toContain("mds-");
    expect(html).not.toContain("data-mds");
  });

  it("marks page-local links inside nav blocks as block navigation targets", () => {
    const document = parseMds(`::: nav pageNav
[Overview -> #overview]
[Docs => /docs]
:::

::: section overview
# Overview
:::
`);
    const html = renderHtml(document);

    expect(html).toContain('class="action primary block-link" href="#overview" data-nav-target="overview"');
    expect(html).toContain('<span class="nav-target">#overview</span>');
    expect(html).toContain('<a class="action secondary" href="/docs">Docs</a>');
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

  it("reports command actions without a known handler as warnings", () => {
    const document = parseMds(`[发送 !lead.submit contact primary]`);
    const result = renderHtmlResult(document);

    expect(result.html).toContain('data-action="lead.submit"');
    expect(result.html).toContain('data-args="[&quot;contact&quot;,&quot;primary&quot;]"');
    expect(result.html).toContain('data-action-missing="true"');
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "missing-action-handler",
        severity: "warning"
      })
    );
  });

  it("does not warn for actions provided by the theme or render options", () => {
    const document = parseMds(`[展开 !toggle faq]\n[发送 !lead.submit contact]`);
    const result = renderHtmlResult(document, {
      theme: {
        name: "actions",
        actions: ["toggle"]
      },
      knownActions: ["lead.submit"]
    });

    expect(result.html).toContain('data-action="toggle"');
    expect(result.html).toContain('data-action="lead.submit"');
    expect(result.html).not.toContain('data-action-missing="true"');
    expect(result.diagnostics).toEqual([]);
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

  it("supports custom themes with css and block renderers", () => {
    const document = parseMds(`::: hero
# Themed
:::
`);
    const html = renderHtml(document, {
      theme: {
        name: "custom",
        css: ".hero-custom{color:red}",
        blockRenderers: {
          hero: (block, context) =>
            `<section class="hero-custom">${context.renderChildren(block.children)}</section>`
        }
      }
    });

    expect(html).toContain("<style>.hero-custom{color:red}</style>");
    expect(html).toContain('<section class="hero-custom"><h1>Themed</h1>');
    expect(html).not.toContain('<section class="hero">');
  });

  it("supports theme head, scripts, and custom shells", () => {
    const document = parseMds(`---
title: Shell
---

::: hero
# Themed
:::
`);
    const html = renderHtml(document, {
      theme: {
        name: "full-theme",
        head: '<meta name="theme-color" content="#111111">',
        css: ".hero{color:red}",
        js: "window.__theme = true;",
        shell: (input) =>
          `<!doctype html><html lang="${input.lang}"><head><title>${input.title}</title>${input.head}</head><body data-theme="full-theme">${input.body}${input.scripts}</body></html>`
      }
    });

    expect(html).toContain('<meta name="theme-color" content="#111111">');
    expect(html).toContain("<style>.hero{color:red}</style>");
    expect(html).toContain("<script>window.__theme = true;</script>");
    expect(html).toContain('body data-theme="full-theme"');
  });

  it("lets explicit block renderers override theme renderers", () => {
    const document = parseMds(`::: hero
# Override
:::
`);
    const html = renderHtml(document, {
      theme: {
        name: "custom",
        blockRenderers: {
          hero: () => '<section class="from-theme"></section>'
        }
      },
      blockRenderers: {
        hero: (block, context) =>
          `<section class="from-options">${context.renderChildren(block.children)}</section>`
      }
    });

    expect(html).toContain('<section class="from-options"><h1>Override</h1>');
    expect(html).not.toContain("from-theme");
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
