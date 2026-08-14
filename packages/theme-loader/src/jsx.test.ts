import { describe, expect, it } from "vitest";
import { createThemeFromSources } from "./source-theme.js";
import {
  Content,
  createThemeFromJsxTheme,
  createThemeSourceFromJsxTheme,
  defineJsxTheme,
  isJsxThemeDefinition,
  jsx,
  Root,
  Slot
} from "./jsx.js";
import type { ThemeTemplateProps } from "./jsx.js";

describe("JSX themes", () => {
  it("recognizes JSX theme definition shapes", () => {
    expect(
      isJsxThemeDefinition({
        name: "shape",
        blocks: {
          hero: () => ""
        },
        tags: ["docs"],
        actions: ["lead.submit"]
      })
    ).toBe(true);
    expect(isJsxThemeDefinition({ name: "missing-blocks" })).toBe(false);
    expect(isJsxThemeDefinition({ name: "bad-block", blocks: { hero: "not a function" } })).toBe(false);
  });

  it("rejects invalid JSX theme definitions before rendering templates", () => {
    expect(() =>
      (createThemeSourceFromJsxTheme as (theme: unknown) => unknown)({
        name: "bad",
        blocks: {
          hero: "not a function"
        }
      })
    ).toThrow("JSX theme definition must include a string name and a blocks object whose values are functions.");
  });

  it("reports the block name when JSX block rendering fails", () => {
    expect(() =>
      createThemeSourceFromJsxTheme({
        name: "bad-render",
        blocks: {
          hero: () => {
            throw new Error("boom");
          }
        }
      })
    ).toThrow('Could not render JSX theme block "hero": boom');
  });

  it("turns JSX theme definitions into normal theme sources", () => {
    const theme = defineJsxTheme({
      name: "jsx-demo",
      css: ".hero{color:red}",
      actions: ["toggle"],
      blocks: {
        hero: ({ attrs, children }: ThemeTemplateProps) =>
          jsx("section", {
            rawAttrs: attrs,
            className: "hero",
            children
          }),
        "note warning": ({ attrs, children, type }: ThemeTemplateProps) =>
          jsx("aside", {
            rawAttrs: attrs,
            className: `callout ${type}`,
            role: "note",
            children
          })
      }
    });

    const source = createThemeSourceFromJsxTheme(theme);

    expect(source.manifest).toEqual({
      version: 1,
      name: "jsx-demo",
      css: "style.css",
      actions: ["toggle"],
      blocks: "blocks"
    });
    expect(source.files["style.css"]).toContain(".hero");
    expect(source.files["blocks/hero.html"]).toContain('class="hero"');
    expect(source.files["blocks/note.html"]).toContain('<template data-block="note warning">');

    const loadedTheme = createThemeFromSources(source);
    expect(loadedTheme.blockRenderers?.warning).toBeDefined();
    expect(loadedTheme.blockRenderers?.warning?.(
      {
        type: "block",
        blockType: "warning",
        children: []
      },
      {
        states: new Map(),
        lists: new Map(),
        locals: new Map(),
        renderNode: () => "",
        renderChildren: () => "<p>Careful</p>",
        renderChildrenWithLocals: () => "",
        renderSlottedContainer: () => "",
        getSlots: () => [],
        getContentChildren: (block) => block.children,
        resolveValue: () => "",
        escapeHtml: (value) => value,
        escapeAttribute: (value) => value
      }
    )).toContain('class="callout warning"');
  });

  it("composes block packs into JSX theme sources", () => {
    const source = createThemeSourceFromJsxTheme(
      defineJsxTheme({
        name: "jsx-packed",
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
          hero: ({ attrs, children }: ThemeTemplateProps) =>
            jsx("section", {
              rawAttrs: attrs,
              className: "theme-hero",
              children
            })
        }
      })
    );

    expect(source.manifest.supportedBlocks).toEqual(["hero", "note"]);
    expect(source.files["blocks/hero.html"]).toContain("theme-hero");
    expect(source.files["blocks/note.html"]).toContain("pack-note");
    expect(createThemeFromSources(source).blockRenderers?.note).toBeDefined();
  });

  it("can create an HtmlTheme directly from JSX definitions", () => {
    const htmlTheme = createThemeFromJsxTheme(
      defineJsxTheme({
        name: "direct",
        blocks: {
          card: ({ attrs, children }: ThemeTemplateProps) =>
            jsx("article", {
              rawAttrs: attrs,
              className: "card",
              children
            })
        }
      })
    );

    expect(htmlTheme.name).toBe("direct");
    expect(htmlTheme.blockRenderers?.card).toBeDefined();
  });

  it("supports classic JSX children arguments", () => {
    const theme = defineJsxTheme({
      name: "classic",
      blocks: {
        card: ({ attrs, children }: ThemeTemplateProps) =>
          jsx(
            "article",
            {
              rawAttrs: attrs,
              className: "card"
            },
            children
          )
      }
    });

    const source = createThemeSourceFromJsxTheme(theme);

    expect(source.files["blocks/card.html"]).toContain("{{ children }}");
  });

  it("supports semantic template helpers for block roots and slots", () => {
    const theme = defineJsxTheme({
      name: "helpers",
      blocks: {
        hero: (block: ThemeTemplateProps) =>
          jsx(
            Root,
            {
              block,
              as: "section",
              className: "hero"
            },
            jsx("div", { className: "hero-title", children: jsx(Slot, { block, name: "title" }) }),
            jsx("div", { className: "hero-body", children: jsx(Content, { block }) })
          )
      }
    });

    const source = createThemeSourceFromJsxTheme(theme);

    expect(source.files["blocks/hero.html"]).toContain('<section class="hero"{{ attrs }}>');
    expect(source.files["blocks/hero.html"]).toContain("{{ slot:title }}");
    expect(source.files["blocks/hero.html"]).toContain("{{ children }}");
  });

  it("exposes block attribute placeholders", () => {
    const theme = defineJsxTheme({
      name: "attrs",
      blocks: {
        card: (block: ThemeTemplateProps) =>
          jsx(Root, {
            block,
            className: `card tone-${block.attr("tone")} motion-${block.attr("motion", "fade-up")}`,
            children: jsx(Content, { block })
          })
      }
    });

    const source = createThemeSourceFromJsxTheme(theme);

    expect(source.files["blocks/card.html"]).toContain("tone-{{ attr:tone }}");
    expect(source.files["blocks/card.html"]).toContain("motion-{{ attr:motion:fade-up }}");
  });
});
