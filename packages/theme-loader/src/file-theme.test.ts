import { resolve } from "node:path";
import type { MdsBlockNode } from "@mds/ast";
import type { HtmlRenderContext } from "@mds/html-types";
import { describe, expect, it } from "vitest";
import { createFileThemeRegistry, createThemeFromSources, loadThemeDirectory } from "./index.js";

describe("loadThemeDirectory", () => {
  it("loads a file-based theme and renders block templates", async () => {
    const theme = await loadThemeDirectory(resolve("../..", "themes/default"));
    const hero = theme.blockRenderers?.hero;
    const html = hero?.(
      {
        type: "block",
        blockType: "hero",
        children: [
          {
            type: "markdown",
            value: "# Hello",
            inlines: []
          }
        ]
      },
      {
        states: new Map(),
        lists: new Map(),
        locals: new Map(),
        renderNode: () => "",
        renderChildren: () => "<h1>Hello</h1>",
        renderChildrenWithLocals: () => "",
        renderSlottedContainer: () => "",
        getSlots: () => [],
        getContentChildren: (block) => block.children,
        resolveValue: () => "",
        escapeHtml: (value) => value,
        escapeAttribute: (value) => value
      }
    );

    expect(theme.name).toBe("default");
    expect(theme.css).toContain(".page");
    expect(theme.js).toContain("querySelectorAll");
    expect(theme.shell?.({
      title: "File <Theme>",
      lang: "en",
      head: "",
      body: "<main></main>",
      scripts: ""
    })).toContain("<title>File &lt;Theme&gt;</title>");
    expect(html).toContain('class="hero"');
    expect(html).toContain('<div class="hero-flow"><h1>Hello</h1></div>');
  });

  it("renders named slots in block templates", async () => {
    const theme = await loadThemeDirectory(resolve("../..", "themes/default"));
    const hero = theme.blockRenderers?.hero;
    const html = hero?.(
      {
        type: "block",
        blockType: "hero",
        children: [],
        slots: [
          {
            type: "slot",
            name: "title",
            children: [
              {
                type: "markdown",
                value: "# Slot Title",
                inlines: []
              }
            ]
          }
        ]
      },
      {
        states: new Map(),
        lists: new Map(),
        locals: new Map(),
        renderNode: () => "",
        renderChildren: () => "<h1>Slot Title</h1>",
        renderChildrenWithLocals: () => "",
        renderSlottedContainer: () => "",
        getSlots: (block) => block.slots ?? [],
        getContentChildren: (block) => block.children,
        resolveValue: () => "",
        escapeHtml: (value) => value,
        escapeAttribute: (value) => value
      }
    );

    expect(html).toContain('<div class="hero-title"><h1>Slot Title</h1></div>');
  });

  it("loads block templates from a directory and template data-block aliases", async () => {
    const theme = await loadThemeDirectory(resolve("../..", "themes/default"));

    expect(theme.blockRenderers?.note).toBeDefined();
    expect(theme.blockRenderers?.warning).toBeDefined();
    expect(theme.blockRenderers?.["grid-3"]).toBeDefined();
    expect(theme.blockRenderers?.reveal).toBeDefined();

    const warningHtml = theme.blockRenderers?.warning?.(
      {
        type: "block",
        blockType: "warning",
        children: []
      },
      createTestRenderContext()
    );
    const gridHtml = theme.blockRenderers?.["grid-3"]?.(
      {
        type: "block",
        blockType: "grid-3",
        children: []
      },
      createTestRenderContext()
    );

    expect(warningHtml).toContain('class="callout warning"');
    expect(gridHtml).toContain('class="grid grid-3"');
  });

  it("supports single-file block sources and automatic blocks directory discovery", () => {
    const explicitTheme = createThemeFromSources({
      manifest: {
        name: "single-file",
        blocks: "blocks.html"
      },
      files: {
        "blocks.html": `<template data-block="hero">
<section class="hero">{{ children }}</section>
</template>
<template data-block="note warning">
<aside class="callout {{ type }}">{{ children }}</aside>
</template>`
      }
    });

    const automaticTheme = createThemeFromSources({
      manifest: {
        name: "automatic"
      },
      files: {
        "blocks/card.html": `<article class="card">{{ children }}</article>`
      }
    });

    expect(explicitTheme.blockRenderers?.hero).toBeDefined();
    expect(explicitTheme.blockRenderers?.warning).toBeDefined();
    expect(automaticTheme.blockRenderers?.card).toBeDefined();
    expect(
      explicitTheme.blockRenderers?.warning?.(
        {
          type: "block",
          blockType: "warning",
          children: []
        },
        createTestRenderContext()
      )
    ).toContain('class="callout warning"');
  });

  it("lists and loads themes from a theme root", async () => {
    const registry = createFileThemeRegistry({
      roots: [resolve("../..", "themes")]
    });

    const themes = await registry.listThemes();
    expect(themes).toContainEqual(
      expect.objectContaining({
        name: "default",
        label: "default"
      })
    );
    expect(themes).toContainEqual(
      expect.objectContaining({
        name: "folio",
        label: "folio"
      })
    );

    const theme = await registry.loadTheme("default");
    expect(theme.name).toBe("default");
    expect(theme.blockRenderers?.hero).toBeDefined();

    const folioTheme = await registry.loadTheme("folio");
    expect(folioTheme.name).toBe("folio");
    expect(folioTheme.css).toContain(".folio-frame");
    expect(folioTheme.blockRenderers?.hero).toBeDefined();
  });
});

function createTestRenderContext(): HtmlRenderContext {
  return {
    states: new Map(),
    lists: new Map(),
    locals: new Map(),
    renderNode: () => "",
    renderChildren: () => "<p>Body</p>",
    renderChildrenWithLocals: () => "",
    renderSlottedContainer: () => "",
    getSlots: () => [],
    getContentChildren: (block: MdsBlockNode) => block.children,
    resolveValue: () => "",
    escapeHtml: (value: string) => value,
    escapeAttribute: (value: string) => value
  };
}
