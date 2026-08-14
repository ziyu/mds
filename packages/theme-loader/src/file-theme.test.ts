import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { MdsBlockNode } from "@mds-crate/ast";
import type { HtmlRenderContext } from "@mds-crate/html-types";
import { describe, expect, it } from "vitest";
import { createFileThemeRegistry, createThemeFromSources, loadThemeDirectory, readThemeDirectory, readThemeRef } from "./index.js";

describe("loadThemeDirectory", () => {
  it("loads a file-based theme and renders block templates", async () => {
    const theme = await loadThemeDirectory(resolve("../..", "themes/default/src"));
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

  it("keeps theme.json out of theme source files", async () => {
    const source = await readThemeDirectory(resolve("../..", "themes/default/src"));

    expect(source.manifest.name).toBe("default");
    expect(source.files["theme.json"]).toBeUndefined();
    expect(source.files["style.css"]).toBeDefined();
  });

  it("renders named slots in block templates", async () => {
    const theme = await loadThemeDirectory(resolve("../..", "themes/default/src"));
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

  it("loads only theme-owned overrides from a separated source directory", async () => {
    const theme = await loadThemeDirectory(resolve("../..", "themes/default/src"));

    expect(theme.blockRenderers?.hero).toBeDefined();
    expect(theme.blockRenderers?.dialog).toBeDefined();
    expect(theme.blockRenderers?.sticky).toBeDefined();
    expect(theme.blockRenderers?.note).toBeUndefined();
    expect(theme.blockRenderers?.["grid-3"]).toBeUndefined();
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
        label: "Default",
        description: expect.any(String),
        preview: "preview.svg",
        tags: expect.arrayContaining(["starter"])
      })
    );
    expect(themes).toContainEqual(
      expect.objectContaining({
        name: "folio",
        label: "Folio"
      })
    );
    expect(themes).toContainEqual(
      expect.objectContaining({
        name: "atelier",
        label: "Atelier"
      })
    );
    expect(themes).toContainEqual(
      expect.objectContaining({
        name: "clarity",
        label: "Clarity"
      })
    );

    const theme = await registry.loadTheme("default");
    expect(theme.name).toBe("default");
    expect(theme.blockRenderers?.hero).toBeDefined();

    const folioTheme = await registry.loadTheme("folio");
    expect(folioTheme.name).toBe("folio");
    expect(folioTheme.css).toContain(".folio-frame");
    expect(folioTheme.blockRenderers?.hero).toBeDefined();

    const atelierTheme = await registry.loadTheme("atelier");
    expect(atelierTheme.name).toBe("atelier");
    expect(atelierTheme.css).toContain(".hero-media");
    expect(atelierTheme.blockRenderers?.warning).toBeDefined();

  });

  it("deduplicates supported block summaries from file registries", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-summary-duplicates-"));
    const themeDirectory = join(root, "themes/duplicate-summary");
    await mkdir(themeDirectory, { recursive: true });
    await writeFile(
      join(themeDirectory, "theme.json"),
      JSON.stringify(
        {
          name: "duplicate-summary",
          label: "Duplicate Summary",
          supportedBlocks: ["hero", "card", "hero"]
        },
        null,
        2
      ),
      "utf8"
    );
    const registry = createFileThemeRegistry({
      roots: [join(root, "themes")]
    });

    await expect(registry.listThemes()).resolves.toContainEqual(
      expect.objectContaining({
        name: "duplicate-summary",
        supportedBlocks: ["hero", "card"]
      })
    );
  });

  it("falls back to directory names when file theme manifests have empty names", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-empty-name-"));
    const themeDirectory = join(root, "themes/empty-name");
    await mkdir(join(themeDirectory, "blocks"), { recursive: true });
    await writeFile(
      join(themeDirectory, "theme.json"),
      JSON.stringify(
        {
          name: " ",
          blocks: "blocks"
        },
        null,
        2
      ),
      "utf8"
    );
    await writeFile(join(themeDirectory, "blocks/hero.html"), "<section>{{ children }}</section>", "utf8");
    const registry = createFileThemeRegistry({
      roots: [join(root, "themes")]
    });

    await expect(registry.listThemes()).resolves.toContainEqual(
      expect.objectContaining({
        name: "empty-name",
        label: "empty-name"
      })
    );
    await expect(registry.loadTheme("empty-name")).resolves.toMatchObject({
      name: "empty-name"
    });
    await expect(registry.loadThemeWithDiagnostics("empty-name")).resolves.toMatchObject({
      diagnostics: [
        expect.objectContaining({
          severity: "warning",
          code: "empty-theme-name"
        })
      ]
    });
  });

  it("resolves package-style theme directories to their built artifact", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-package-dir-"));
    await writePackageTheme(root, {
      packageName: "@acme/theme-clean",
      artifactName: "clean",
      packageDirectory: "themes/theme-package"
    });

    const registry = createFileThemeRegistry({
      roots: [join(root, "themes")],
      baseDirectory: root
    });

    const theme = await registry.loadTheme("./themes/theme-package");
    const themes = await registry.listThemes();

    expect(theme.name).toBe("clean");
    expect(theme.blockRenderers?.hero).toBeDefined();
    expect(themes).toContainEqual(
      expect.objectContaining({
        name: "clean",
        source: join(root, "themes/theme-package/dist/theme")
      })
    );
  });

  it("lists buildable package themes before their artifacts exist", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-unbuilt-package-list-"));
    const packageDirectory = join(root, "themes/future");
    await mkdir(packageDirectory, { recursive: true });
    await writeFile(
      join(packageDirectory, "package.json"),
      JSON.stringify(
        {
          name: "@acme/theme-future",
          description: "A package theme that still needs a build.",
          keywords: ["package", "preview"],
          mdsTheme: {
            source: "./src/theme.tsx",
            dist: "./dist/theme"
          }
        },
        null,
        2
      ),
      "utf8"
    );

    const registry = createFileThemeRegistry({
      roots: [join(root, "themes")],
      baseDirectory: root
    });

    await expect(registry.listThemes()).resolves.toContainEqual({
      name: "future",
      label: "Future",
      source: packageDirectory,
      buildable: true,
      description: "A package theme that still needs a build.",
      tags: ["package", "preview"]
    });
    await expect(registry.loadThemeWithDiagnostics("future")).rejects.toMatchObject({
      name: "ThemeValidationError",
      diagnostics: [
        expect.objectContaining({
          severity: "error",
          code: "missing-theme-manifest",
          path: join(packageDirectory, "dist/theme/theme.json")
        })
      ]
    });
  });

  it("resolves package theme names without executing source files", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-package-name-"));
    await writePackageTheme(root, {
      packageName: "@acme/theme-clean",
      artifactName: "package-clean",
      packageDirectory: "node_modules/@acme/theme-clean"
    });

    const registry = createFileThemeRegistry({
      roots: [join(root, "themes")],
      baseDirectory: root
    });
    const result = await registry.loadThemeWithDiagnostics("@acme/theme-clean");

    expect(result.theme.name).toBe("package-clean");
    expect(result.theme.blockRenderers?.hero).toBeDefined();
    expect(result.diagnostics).toEqual([]);
  });

  it("reports structured diagnostics when package artifacts have not been built", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-package-unbuilt-"));
    const packageDirectory = join(root, "node_modules/@acme/theme-unbuilt");
    await mkdir(packageDirectory, { recursive: true });
    await writeFile(
      join(packageDirectory, "package.json"),
      JSON.stringify(
        {
          name: "@acme/theme-unbuilt",
          type: "module",
          mdsTheme: {
            source: "./src/theme.tsx",
            dist: "./dist/theme"
          }
        },
        null,
        2
      ),
      "utf8"
    );
    const registry = createFileThemeRegistry({
      baseDirectory: root
    });

    await expect(registry.loadThemeWithDiagnostics("@acme/theme-unbuilt")).rejects.toMatchObject({
      name: "ThemeValidationError",
      diagnostics: [
        expect.objectContaining({
          severity: "error",
          code: "missing-theme-manifest",
          field: "theme.json",
          path: expect.stringContaining("node_modules/@acme/theme-unbuilt/dist/theme/theme.json")
        })
      ]
    });
  });

  it("reports structured diagnostics for unknown theme refs", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-unknown-ref-"));
    const registry = createFileThemeRegistry({
      roots: [join(root, "themes")],
      baseDirectory: root
    });

    await expect(registry.loadThemeWithDiagnostics("missing-theme")).rejects.toMatchObject({
      name: "ThemeValidationError",
      diagnostics: [
        expect.objectContaining({
          severity: "error",
          code: "unknown-theme",
          field: "theme ref"
        })
      ]
    });
    await expect(registry.loadTheme("missing-theme")).rejects.toMatchObject({
      name: "ThemeValidationError",
      diagnostics: [
        expect.objectContaining({
          severity: "error",
          code: "unknown-theme",
          field: "theme ref"
        })
      ]
    });
  });

  it("reports structured diagnostics for malformed package manifests during resolution", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-package-malformed-"));
    const packageDirectory = join(root, "themes/broken-package");
    await mkdir(packageDirectory, { recursive: true });
    await writeFile(join(packageDirectory, "package.json"), "{", "utf8");
    const registry = createFileThemeRegistry({
      roots: [join(root, "themes")],
      baseDirectory: root
    });

    await expect(registry.loadThemeWithDiagnostics("./themes/broken-package")).rejects.toMatchObject({
      name: "ThemeValidationError",
      diagnostics: [
        expect.objectContaining({
          severity: "error",
          code: "invalid-theme-package",
          field: "package.json",
          path: expect.stringContaining("themes/broken-package/package.json")
        })
      ]
    });
  });

  it("reports structured diagnostics for invalid package theme dist config", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-package-invalid-dist-"));
    const packageDirectory = join(root, "node_modules/@acme/theme-invalid-dist");
    await mkdir(packageDirectory, { recursive: true });
    await writeFile(
      join(packageDirectory, "package.json"),
      JSON.stringify(
        {
          name: "@acme/theme-invalid-dist",
          type: "module",
          mdsTheme: {
            dist: 123
          }
        },
        null,
        2
      ),
      "utf8"
    );
    const registry = createFileThemeRegistry({
      baseDirectory: root
    });

    await expect(registry.loadThemeWithDiagnostics("@acme/theme-invalid-dist")).rejects.toMatchObject({
      name: "ThemeValidationError",
      diagnostics: [
        expect.objectContaining({
          severity: "error",
          code: "invalid-theme-package",
          field: "package.json#mdsTheme.dist",
          path: expect.stringContaining("node_modules/@acme/theme-invalid-dist/package.json")
        })
      ]
    });
  });

  it("reports structured diagnostics from direct ref reads", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-ref-invalid-dist-"));
    const packageDirectory = join(root, "node_modules/@acme/theme-ref-invalid-dist");
    await mkdir(packageDirectory, { recursive: true });
    await writeFile(
      join(packageDirectory, "package.json"),
      JSON.stringify(
        {
          name: "@acme/theme-ref-invalid-dist",
          mdsTheme: {
            dist: 123
          }
        },
        null,
        2
      ),
      "utf8"
    );

    await expect(
      readThemeRef("@acme/theme-ref-invalid-dist", {
        baseDirectory: root
      })
    ).rejects.toMatchObject({
      name: "ThemeValidationError",
      diagnostics: [
        expect.objectContaining({
          severity: "error",
          code: "invalid-theme-package",
          field: "package.json#mdsTheme.dist"
        })
      ]
    });
  });

  it("reports structured diagnostics from regular registry loads", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-load-invalid-dist-"));
    const packageDirectory = join(root, "node_modules/@acme/theme-load-invalid-dist");
    await mkdir(packageDirectory, { recursive: true });
    await writeFile(
      join(packageDirectory, "package.json"),
      JSON.stringify(
        {
          name: "@acme/theme-load-invalid-dist",
          mdsTheme: {
            dist: 123
          }
        },
        null,
        2
      ),
      "utf8"
    );
    const registry = createFileThemeRegistry({
      baseDirectory: root
    });

    await expect(registry.loadTheme("@acme/theme-load-invalid-dist")).rejects.toMatchObject({
      name: "ThemeValidationError",
      diagnostics: [
        expect.objectContaining({
          severity: "error",
          code: "invalid-theme-package",
          field: "package.json#mdsTheme.dist"
        })
      ]
    });
  });

  it("reports structured diagnostics for malformed theme manifests", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-invalid-manifest-"));
    const themeDirectory = join(root, "themes/broken");
    await mkdir(themeDirectory, { recursive: true });
    await writeFile(join(themeDirectory, "theme.json"), "{", "utf8");
    const registry = createFileThemeRegistry({
      roots: [join(root, "themes")],
      baseDirectory: root
    });

    await expect(registry.loadThemeWithDiagnostics("broken")).rejects.toMatchObject({
      name: "ThemeValidationError",
      diagnostics: [
        expect.objectContaining({
          severity: "error",
          code: "invalid-theme-manifest",
          field: "theme.json",
          path: expect.stringContaining("themes/broken/theme.json")
        })
      ]
    });
  });

  it("reports structured diagnostics from direct directory loads", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-direct-invalid-"));
    await writeFile(join(root, "theme.json"), "{", "utf8");

    await expect(loadThemeDirectory(root)).rejects.toMatchObject({
      name: "ThemeValidationError",
      diagnostics: [
        expect.objectContaining({
          severity: "error",
          code: "invalid-theme-manifest",
          field: "theme.json",
          path: expect.stringContaining("mds-theme-direct-invalid-")
        })
      ]
    });
  });

  it("reports structured diagnostics for non-object theme manifests", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-non-object-manifest-"));
    await writeFile(join(root, "theme.json"), "null", "utf8");

    await expect(readThemeDirectory(root)).rejects.toMatchObject({
      name: "ThemeValidationError",
      diagnostics: [
        expect.objectContaining({
          severity: "error",
          code: "invalid-theme-manifest",
          field: "theme.json",
          path: join(root, "theme.json")
        })
      ]
    });
  });

  it("adds theme.json paths to manifest field validation diagnostics", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-invalid-manifest-field-"));
    await writeFile(
      join(root, "theme.json"),
      JSON.stringify({
        name: "invalid-field",
        css: 42
      }),
      "utf8"
    );

    await expect(readThemeDirectory(root)).rejects.toMatchObject({
      name: "ThemeValidationError",
      diagnostics: [
        expect.objectContaining({
          severity: "error",
          code: "invalid-theme-asset-reference",
          field: "css",
          path: join(root, "theme.json")
        })
      ]
    });
  });
});

async function writePackageTheme(
  root: string,
  options: {
    packageName: string;
    artifactName: string;
    packageDirectory?: string;
  }
): Promise<void> {
  const packageDirectory = join(root, options.packageDirectory ?? "theme-package");
  const artifactDirectory = join(packageDirectory, "dist/theme");
  await mkdir(join(artifactDirectory, "blocks"), { recursive: true });
  await writeFile(
    join(packageDirectory, "package.json"),
    JSON.stringify(
      {
        name: options.packageName,
        type: "module",
        mdsTheme: {
          source: "./src/theme.tsx",
          dist: "./dist/theme"
        }
      },
      null,
      2
    ),
    "utf8"
  );
  await writeFile(
    join(artifactDirectory, "theme.json"),
    JSON.stringify(
      {
        name: options.artifactName,
        blocks: "blocks"
      },
      null,
      2
    ),
    "utf8"
  );
  await writeFile(join(artifactDirectory, "blocks/hero.html"), `<section class="hero">{{ children }}</section>`, "utf8");
}

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
