import { describe, expect, it } from "vitest";
import { createThemeFromSources } from "@mds/theme-loader";
import {
  createThemeFromHtmlTheme,
  createThemeSourceFromHtmlTheme,
  defineHtmlTheme,
  html,
  unsafeHtml,
  type HtmlThemeBlock
} from "./index.js";

describe("HTML theme SDK", () => {
  it("creates standard theme sources from tagged HTML templates", () => {
    const theme = defineHtmlTheme({
      name: "html-sdk-demo",
      css: ".hero{color:red}",
      actions: ["toggle"],
      blocks: {
        hero: (block) => html`<section${block.attrs} class="hero">${block.children}</section>`
      }
    });

    const source = createThemeSourceFromHtmlTheme(theme);

    expect(source.manifest).toEqual({
      version: 1,
      name: "html-sdk-demo",
      css: "style.css",
      actions: ["toggle"],
      blocks: "blocks"
    });
    expect(source.files["style.css"]).toContain(".hero");
    expect(source.files["blocks/hero.html"]).toBe('<section{{ attrs }} class="hero">{{ children }}</section>');
    expect(createThemeFromSources(source).blockRenderers?.hero).toBeDefined();
  });

  it("composes block packs into HTML theme sources", () => {
    const source = createThemeSourceFromHtmlTheme(
      defineHtmlTheme({
        name: "html-packed",
        blockPacks: [
          {
            name: "starter",
            supportedBlocks: ["hero", "note"],
            blocks: "blocks",
            files: {
              "blocks/hero.html": '<section{{ attrs }} class="pack-hero">{{ children }}</section>',
              "blocks/note.html": '<aside{{ attrs }} class="pack-note">{{ children }}</aside>'
            }
          }
        ],
        blocks: {
          hero: (block) => html`<section${block.attrs} class="theme-hero">${block.children}</section>`
        }
      })
    );

    expect(source.manifest.supportedBlocks).toEqual(["hero", "note"]);
    expect(source.files["blocks/hero.html"]).toContain("theme-hero");
    expect(source.files["blocks/note.html"]).toContain("pack-note");
    expect(createThemeFromSources(source).blockRenderers?.note).toBeDefined();
  });

  it("lets package themes compose local component functions", () => {
    function Surface(block: HtmlThemeBlock, className: string) {
      return html`<article${block.attrs} class=${unsafeHtml(`"${className}"`)}>${block.children}</article>`;
    }

    const source = createThemeSourceFromHtmlTheme(
      defineHtmlTheme({
        name: "component-html",
        blocks: {
          card: (block) => Surface(block, "card surface")
        }
      })
    );

    expect(source.files["blocks/card.html"]).toBe('<article{{ attrs }} class="card surface">{{ children }}</article>');
  });

  it("escapes primitive interpolations and preserves explicit raw HTML", () => {
    const escaped = html`<p>${"<script>alert(1)</script>"}</p>`;
    const raw = html`<p>${unsafeHtml("<strong>safe-by-author</strong>")}</p>`;

    expect(escaped.__rawHtml).toBe("<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>");
    expect(raw.__rawHtml).toBe("<p><strong>safe-by-author</strong></p>");
  });

  it("can create an HtmlTheme directly", () => {
    const theme = createThemeFromHtmlTheme(
      defineHtmlTheme({
        name: "direct-html",
        blocks: {
          note: (block) => html`<aside${block.attrs} class="note">${block.children}</aside>`
        }
      })
    );

    expect(theme.name).toBe("direct-html");
    expect(theme.blockRenderers?.note).toBeDefined();
  });
});
