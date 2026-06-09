import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { loadThemeDirectory } from "./index.js";

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
    expect(theme.js).toContain("Default MDS theme");
    expect(theme.shell?.({
      title: "File <Theme>",
      lang: "en",
      head: "",
      body: "<main></main>",
      scripts: ""
    })).toContain("<title>File &lt;Theme&gt;</title>");
    expect(html?.trim()).toBe('<section class="hero"><h1>Hello</h1></section>');
  });
});
