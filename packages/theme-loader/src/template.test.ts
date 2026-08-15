import type { HtmlRenderContext } from "@mds-crate/html-types";
import { describe, expect, it } from "vitest";
import { createTemplateBlockRenderer, renderShellTemplate } from "./template.js";

describe("theme template escaping", () => {
  it("escapes author-controlled block, slot, and attribute placeholders", () => {
    const renderer = createTemplateBlockRenderer(
      '<section{{ attrs }} aria-label="{{ name }}" data-tone="{{ attr:tone }}" data-onclick="{{ attr:onclick }}">{{ slots }}{{ children }}</section>'
    );
    const context = createContext();
    const html = renderer(
      {
        type: "block",
        blockType: "hero",
        name: '</section><script>alert("name")</script>',
        id: 'hero" onmouseover="alert(1)',
        attrs: {
          tone: '"><img src=x onerror=alert("tone")>',
          onclick: "alert(1)"
        },
        children: [],
        slots: [
          {
            type: "slot",
            name: '"><img src=x onerror=alert("slot")>',
            children: []
          }
        ]
      },
      context
    );

    expect(html).toContain('id="hero&quot; onmouseover=&quot;alert(1)"');
    expect(html).toContain('aria-label="&lt;/section&gt;&lt;script&gt;alert(&quot;name&quot;)&lt;/script&gt;"');
    expect(html).toContain('data-tone="&quot;&gt;&lt;img src=x onerror=alert(&quot;tone&quot;)&gt;"');
    expect(html).toContain('data-onclick=""');
    expect(html).toContain('data-slot="&quot;&gt;&lt;img src=x onerror=alert(&quot;slot&quot;)&gt;"');
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("data-attr-onclick");
  });

  it("escapes shell metadata while preserving trusted theme and rendered HTML slots", () => {
    const html = renderShellTemplate(
      '<html lang="{{ lang }}"><head><title>{{ title }}</title><meta content="{{ description }}">{{ head }}</head><body>{{ body }}{{ scripts }}</body></html>',
      {
        title: "</title><script>alert(1)</script>",
        lang: 'en" onload="alert(1)',
        description: '"><img src=x onerror=alert(1)>',
        head: '<meta name="theme" content="trusted">',
        body: "<main>rendered</main>",
        scripts: "<script>trustedTheme()</script>"
      }
    );

    expect(html).toContain('lang="en&quot; onload=&quot;alert(1)"');
    expect(html).toContain("<title>&lt;/title&gt;&lt;script&gt;alert(1)&lt;/script&gt;</title>");
    expect(html).toContain('<meta content="&quot;&gt;&lt;img src=x onerror=alert(1)&gt;">');
    expect(html).toContain('<meta name="theme" content="trusted">');
    expect(html).toContain("<main>rendered</main>");
    expect(html).toContain("<script>trustedTheme()</script>");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).not.toContain("<img src=x onerror=alert(1)>");
  });

  it("renders safe optional and boolean native attributes", () => {
    const renderer = createTemplateBlockRenderer(
      '<input{{ optional:name:name }}{{ optional:action:data-action }}{{ bool:required }}{{ bool:disabled }}{{ optional:onclick:onfocus }}>'
    );
    const html = renderer(
      {
        type: "block",
        blockType: "input",
        attrs: {
          name: 'profile" autofocus="true',
          action: "lead.submit",
          required: true,
          disabled: "false",
          onclick: "alert(1)"
        },
        children: [],
        slots: []
      },
      createContext()
    );

    expect(html).toBe(
      '<input name="profile&quot; autofocus=&quot;true" data-action="lead.submit" required>'
    );
    expect(html).not.toContain("onfocus");
  });

  it("renders attribute fallbacks containing spaces, punctuation, and colons", () => {
    const renderer = createTemplateBlockRenderer(
      '<label aria-label="{{ attr:label:Choose one }}"><input placeholder="{{ attr:placeholder:Type a command or search... }}"><span>{{ attr:url:https://example.com/path }}</span></label>'
    );
    const html = renderer(
      {
        type: "block",
        blockType: "input",
        children: [],
        slots: []
      },
      createContext()
    );

    expect(html).toBe(
      '<label aria-label="Choose one"><input placeholder="Type a command or search..."><span>https://example.com/path</span></label>'
    );
    expect(html).not.toContain("{{");
  });
});

function createContext(): HtmlRenderContext {
  return {
    states: new Map(),
    lists: new Map(),
    locals: new Map(),
    renderNode: () => "",
    renderChildren: () => "<p>rendered</p>",
    renderChildrenWithLocals: () => "",
    renderSlottedContainer: () => "",
    getSlots: (block) => block.slots ?? [],
    getContentChildren: (block) => block.children,
    resolveValue: () => "",
    escapeHtml,
    escapeAttribute
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replaceAll("'", "&#39;");
}
