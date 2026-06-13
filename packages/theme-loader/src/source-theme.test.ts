import type { HtmlRenderContext } from "@mds/html-types";
import { describe, expect, it } from "vitest";
import {
  createThemeFromSources,
  getThemeFilePaths,
  isThemeSourceInput,
  normalizeThemeSourceInput,
  THEME_BUILD_METADATA_FILE,
  ThemeValidationError
} from "./index.js";

describe("theme source normalization", () => {
  it("recognizes serialized theme source input shape", () => {
    expect(
      isThemeSourceInput({
        manifest: {
          name: "source"
        },
        files: {
          "blocks/hero.html": "<section>{{ children }}</section>"
        },
        rootName: "source-root"
      })
    ).toBe(true);
    expect(
      isThemeSourceInput({
        manifest: "source",
        files: {}
      })
    ).toBe(false);
    expect(
      isThemeSourceInput({
        manifest: {},
        files: {
          "blocks/hero.html": 42
        }
      })
    ).toBe(false);
    expect(
      isThemeSourceInput({
        manifest: {},
        files: {},
        rootName: 42
      })
    ).toBe(false);
  });

  it("normalizes manifest references and file keys before creating themes", () => {
    const theme = createThemeFromSources({
      manifest: {
        name: "normalized",
        css: "./style.css",
        blocks: "./blocks"
      },
      files: {
        "./style.css": ".hero{color:red}",
        "./blocks/hero.html": "<section>{{ children }}</section>"
      }
    });

    expect(theme.css).toBe(".hero{color:red}");
    expect(theme.blockRenderers?.hero).toBeDefined();
  });

  it("normalizes theme sources without mutating author input", () => {
    const source = {
      manifest: {
        name: "source",
        css: ["./base.css", "components/card.css"],
        shell: "./shell.html",
        preview: "./preview.svg",
        blocks: {
          hero: "./blocks/hero.html"
        }
      },
      files: {
        "./base.css": ".base{}",
        "components/card.css": ".card{}",
        "./shell.html": "{{ body }}",
        "./preview.svg": "<svg></svg>",
        "./blocks/hero.html": "<section>{{ children }}</section>"
      }
    };

    expect(normalizeThemeSourceInput(source)).toEqual({
      manifest: {
        name: "source",
        css: ["base.css", "components/card.css"],
        shell: "shell.html",
        preview: "preview.svg",
        blocks: {
          hero: "blocks/hero.html"
        }
      },
      files: {
        "base.css": ".base{}",
        "components/card.css": ".card{}",
        "shell.html": "{{ body }}",
        "preview.svg": "<svg></svg>",
        "blocks/hero.html": "<section>{{ children }}</section>"
      }
    });
    expect(source.manifest.css).toEqual(["./base.css", "components/card.css"]);
  });

  it("returns canonical manifest file paths", () => {
    expect(
      getThemeFilePaths({
        css: ["./style.css", "style.css"],
        js: ["./script.js"],
        head: "./head.html",
        shell: "./style.css",
        preview: "./preview.svg",
        blocks: {
          hero: "./overrides.html",
          card: "overrides.html"
        }
      })
    ).toEqual(["style.css", "script.js", "head.html", "preview.svg", "overrides.html"]);
  });

  it("rejects source files that normalize to the same artifact path", () => {
    expect(() =>
      createThemeFromSources({
        manifest: {
          name: "duplicates"
        },
        files: {
          "blocks//hero.html": "<section>a</section>",
          "blocks/./hero.html": "<section>b</section>"
        }
      })
    ).toThrow(ThemeValidationError);
  });

  it("does not allow development metadata to become runtime block templates", () => {
    expect(() =>
      createThemeFromSources({
        manifest: {
          name: "runtime-only",
          blocks: {
            metadata: THEME_BUILD_METADATA_FILE
          }
        },
        files: {
          [THEME_BUILD_METADATA_FILE]: "<template data-block=\"metadata\">{{ children }}</template>"
        }
      })
    ).toThrow(ThemeValidationError);
  });

  it("renders resolved ids and block attributes in templates", () => {
    const theme = createThemeFromSources({
      manifest: {
        name: "attrs",
        blocks: "blocks"
      },
      files: {
        "blocks/hero.html":
          '<section{{ attrs }} class="hero hero-{{ attr:tone }}" data-motion="{{ attr:motion:scale-in }}">{{ children }}</section>'
      }
    });

    const context: HtmlRenderContext = {
      states: new Map(),
      lists: new Map(),
      locals: new Map(),
      renderNode: () => "",
      renderChildren: () => "<h1>Intro</h1>",
      renderChildrenWithLocals: () => "",
      renderSlottedContainer: () => "",
      getSlots: () => [],
      getContentChildren: (block) => block.children,
      resolveValue: () => "",
      escapeHtml: (value) => value,
      escapeAttribute: (value) => value
    };

    const html = theme.blockRenderers?.hero?.(
      {
        type: "block",
        blockType: "hero",
        id: "intro",
        attrs: {
          tone: "dark",
          motion: "fade-up",
          onclick: "bad"
        },
        children: []
      },
      context
    );

    const fallbackHtml = theme.blockRenderers?.hero?.(
      {
        type: "block",
        blockType: "hero",
        attrs: {
          tone: "quiet"
        },
        children: []
      },
      context
    );

    expect(html).toContain('id="intro"');
    expect(html).toContain('data-attr-tone="dark"');
    expect(html).toContain('class="hero hero-dark"');
    expect(html).toContain('data-motion="fade-up"');
    expect(html).not.toContain("onclick");
    expect(fallbackHtml).toContain('data-motion="scale-in"');
  });
});
