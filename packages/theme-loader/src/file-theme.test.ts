import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createFileThemeRegistry, loadThemeDirectory } from "./index.js";

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
