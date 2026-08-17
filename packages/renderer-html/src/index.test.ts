import { describe, expect, it } from "vitest";
import { parseMds } from "@mds-crate/parser";
import { renderHtml, renderHtmlResult, renderMds, renderMdsResult } from "./index.js";

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
    expect(html).toContain('<section id="mds" class="hero">');
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

  it("renders header and footer as semantic landmarks", () => {
    const document = parseMds(`::: header siteHeader
# MDS
:::

::: footer siteFooter
Built with MDS.
:::
`);
    const html = renderHtml(document);

    expect(html).toContain('<header id="siteHeader" class="header"><h1>MDS</h1></header>');
    expect(html).toContain('<footer id="siteFooter" class="footer"><p>Built with MDS.</p></footer>');
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

  it("renders leaf and empty container syntax through the same block contract", () => {
    const leafHtml = renderMds(`:: button label="Create"`, {
      mode: "fragment",
      blockRenderers: {
        button: (block) => `<button>${String(block.attrs?.label)}</button>`
      }
    });
    const containerHtml = renderMds(`::: button label="Create"
:::`, {
      mode: "fragment",
      blockRenderers: {
        button: (block) => `<button>${String(block.attrs?.label)}</button>`
      }
    });

    expect(leafHtml).toContain('<button>Create</button>');
    expect(leafHtml).toBe(containerHtml);
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
    const result = renderHtmlResult(document, {
      includeDefaultBlockRenderers: false
    });

    expect(result.html).toContain('<section id="hero" class="block hero" data-block="hero">');
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "missing-block-renderer",
        severity: "warning"
      })
    );
  });

  it("renders resolved block ids and safe block attributes", () => {
    const document = parseMds(`::: card motion="fade-up" delay=120 once=false onclick="bad"
# Feature Card
:::
`);
    const result = renderHtmlResult(document);

    expect(result.html).toContain('<article id="feature-card" data-attr-motion="fade-up" data-attr-delay="120" data-attr-once="false" class="card">');
    expect(result.html).not.toContain("onclick");
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: "unsafe-block-attribute",
        severity: "warning"
      })
    );
  });
});

describe("renderMds", () => {
  it("parses source and renders a complete document by default", () => {
    const html = renderMds(`---
title: Source API
lang: zh-CN
---

# Hello
`);

    expect(html).toContain("<!doctype html>");
    expect(html).toContain('<html lang="zh-CN">');
    expect(html).toContain("<title>Source API</title>");
    expect(html).toContain("<h1>Hello</h1>");
  });

  it("returns embeddable body and theme assets in fragment mode", () => {
    const result = renderMdsResult(
      `---
title: Fragment
description: Fragment description
---

::: hero
# Embedded
:::
`,
      {
        mode: "fragment",
        theme: {
          name: "fragment-theme",
          head: '<meta name="theme-color" content="#123456">',
          css: ".hero{color:rebeccapurple}",
          js: "window.__fragmentTheme = true;",
          shell: () => "CUSTOM_SHELL"
        }
      }
    );

    expect(result.document.frontmatter).toMatchObject({ title: "Fragment" });
    expect(result.html).toBe(result.body);
    expect(result.body).toContain('<section id="embedded" class="hero">');
    expect(result.html).not.toContain("<!doctype html>");
    expect(result.html).not.toContain("CUSTOM_SHELL");
    expect(result.html).not.toContain("<script>");
    expect(result.head).toContain('<meta name="description" content="Fragment description">');
    expect(result.head).toContain('<meta name="theme-color" content="#123456">');
    expect(result.head).toContain("<style>.hero{color:rebeccapurple}</style>");
    expect(result.css).toBe(".hero{color:rebeccapurple}");
    expect(result.js).toBe("window.__fragmentTheme = true;");
    expect(result.diagnostics).toEqual([]);
  });

  it("returns raw css separately when css embedding is disabled", () => {
    const result = renderMdsResult("# Fragment", {
      mode: "fragment",
      includeCss: false,
      theme: {
        name: "assets",
        css: ".page{max-width:60rem}"
      }
    });

    expect(result.head).not.toContain("<style>");
    expect(result.css).toBe(".page{max-width:60rem}");
  });
});

describe("renderer security", () => {
  it("neutralizes mixed-case, encoded, and disallowed URL schemes", () => {
    const result = renderMdsResult(`[Markdown danger](JaVaScRiPt:alert(1))

![Image danger](%64ata:text/html,boom)

[Action danger -> %256aavascript%253Aalert(1)]

!embed data:text/html,boom
!video JaVaScRiPt:alert(1)
!download file:///tmp/secret
`);

    expect(result.html).toContain('<a href="#">Markdown danger</a>');
    expect(result.html).toContain('<img alt="Image danger">');
    expect(result.html).toContain('<a class="action primary" href="#">Action danger</a>');
    expect(result.html).toContain('<iframe class="media embed" loading="lazy"></iframe>');
    expect(result.html).toContain('<video class="media video" controls></video>');
    expect(result.html).toContain('<a class="media download" href="#" download>file:///tmp/secret</a>');
    expect(result.html).not.toMatch(/(?:href|src)="(?:javascript|data|file):/i);
    expect(result.diagnostics.filter((diagnostic) => diagnostic.code === "unsafe-url")).toHaveLength(6);
  });

  it("keeps relative, fragment, HTTPS, mail, and telephone navigation URLs", () => {
    const result = renderMdsResult(`[Relative -> /docs]
[Fragment => #intro]
[Website >> https://example.com]
[Email -> mailto:hello@example.com]
[Phone -> tel:+123456]

!video https://example.com/demo.mp4
!download /files/guide.pdf
`);

    expect(result.html).toContain('href="/docs"');
    expect(result.html).toContain('href="#intro"');
    expect(result.html).toContain('href="https://example.com"');
    expect(result.html).toContain('href="mailto:hello@example.com"');
    expect(result.html).toContain('href="tel:+123456"');
    expect(result.html).toContain('src="https://example.com/demo.mp4"');
    expect(result.html).toContain('href="/files/guide.pdf"');
    expect(result.diagnostics).toEqual([]);
  });

  it("escapes source content and drops raw Markdown HTML", () => {
    const result = renderMdsResult(`---
title: "</title><script>alert(1)</script>"
description: "\"><img src=x onerror=alert(1)>"
---

<script>alert(1)</script>

[<img src=x onerror=alert(1)> -> /safe]

::: data payload
{"value":"</script><script>alert(1)</script>"}
:::
`);

    expect(result.html).toContain("<title>&lt;/title&gt;&lt;script&gt;alert(1)&lt;/script&gt;</title>");
    expect(result.html).toContain(
      '<meta name="description" content="&quot;&gt;&lt;img src=x onerror=alert(1)&gt;">'
    );
    expect(result.html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(result.html).toContain("&lt;/script&gt;&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(result.html).not.toContain("<script>alert(1)</script>");
    expect(result.html).not.toContain("<img src=x onerror=alert(1)>");
  });
});
