import type { HtmlRenderContext } from "@mds-crate/html-types";
import { describe, expect, it } from "vitest";
import {
  composeThemeSource,
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

  it("composes shared block packs before theme block templates", () => {
    const source = composeThemeSource(
      {
        manifest: {
          name: "composed",
          supportedBlocks: ["custom"],
          actions: ["theme.action"],
          blocks: "blocks"
        },
        files: {
          "blocks/hero.html": '<section{{ attrs }} class="theme-hero">{{ children }}</section>'
        }
      },
      {
        blockPacks: [
          {
            name: "starter",
            supportedBlocks: ["hero", "note"],
            actions: ["pack.action"],
            blocks: "blocks",
            files: {
              "blocks/hero.html": '<section{{ attrs }} class="pack-hero">{{ children }}</section>',
              "blocks/note.html": '<aside{{ attrs }} class="pack-note">{{ children }}</aside>'
            }
          }
        ]
      }
    );

    expect(source.manifest).toMatchObject({
      blocks: "blocks",
      supportedBlocks: ["hero", "note", "custom"],
      actions: ["pack.action", "theme.action"]
    });
    expect(source.files["blocks/hero.html"]).toContain("theme-hero");
    expect(source.files["blocks/note.html"]).toContain("pack-note");
    expect(source.composition).toEqual({
      blockPacks: [
        {
          name: "starter",
          profiles: [],
          supportedBlocks: ["hero", "note"]
        }
      ],
      templateSources: [
        { block: "hero", source: "theme" },
        { block: "note", source: "starter" }
      ]
    });

    const theme = createThemeFromSources(source);
    expect(theme.blockRenderers?.hero).toBeDefined();
    expect(theme.blockRenderers?.note).toBeDefined();
  });

  it("composes and de-duplicates progressive enhancement scripts before theme JavaScript", () => {
    const styles = ".calendar { display: grid; }";
    const runtime = "document.documentElement.dataset.blocks = 'ready';";
    const source = composeThemeSource(
      {
        manifest: {
          name: "scripted",
          css: "theme.css",
          js: "theme.js"
        },
        files: {
          "theme.css": ".page { color: canvastext; }",
          "theme.js": "document.documentElement.dataset.theme = 'ready';"
        }
      },
      {
        blockPacks: [
          {
            name: "forms",
            css: "runtime.css",
            js: "runtime.js",
            files: { "runtime.css": styles, "runtime.js": runtime }
          },
          {
            name: "data",
            css: "runtime.css",
            js: "runtime.js",
            files: { "runtime.css": styles, "runtime.js": runtime }
          }
        ]
      }
    );

    expect(source.manifest.css).toEqual(["assets/mds-blocks.css", "theme.css"]);
    expect(source.manifest.js).toEqual(["assets/mds-blocks.js", "theme.js"]);
    expect(source.files["assets/mds-blocks.css"]).toBe(styles);
    expect(source.files["assets/mds-blocks.js"]).toBe(runtime);
    expect(createThemeFromSources(source).css).toBe(
      `${styles}\n.page { color: canvastext; }`
    );
    expect(createThemeFromSources(source).js).toBe(
      `${runtime}\ndocument.documentElement.dataset.theme = 'ready';`
    );
  });

  it("turns grouped pack templates into final block files", () => {
    const source = composeThemeSource(
      {
        manifest: {
          name: "grouped"
        },
        files: {}
      },
      {
        blockPacks: [
          {
            name: "callouts",
            supportedBlocks: ["note", "warning"],
            blocks: "blocks",
            files: {
              "blocks/callout.html":
                '<template data-block="note warning"><aside{{ attrs }} class="callout {{ type }}">{{ children }}</aside></template>'
            }
          }
        ]
      }
    );

    expect(source.files["blocks/note.html"]).toContain('data-block="note"');
    expect(source.files["blocks/warning.html"]).toContain('data-block="warning"');
    expect(createThemeFromSources(source).blockRenderers?.warning).toBeDefined();
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
