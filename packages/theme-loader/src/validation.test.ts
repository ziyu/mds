import { describe, expect, it } from "vitest";
import {
  assertValidThemeSource,
  createThemeFromSources,
  formatThemeDiagnostic,
  isThemeDiagnostic,
  ThemeValidationError,
  validateThemeSource
} from "./index.js";

describe("theme validation", () => {
  it("recognizes serializable theme diagnostics", () => {
    expect(
      isThemeDiagnostic({
        severity: "warning",
        code: "duplicate-theme-block-template",
        message: "Theme block is defined more than once.",
        field: "blocks",
        path: "blocks/hero.html",
        block: "hero"
      })
    ).toBe(true);
    expect(
      isThemeDiagnostic({
        severity: "info",
        code: "theme-info",
        message: "Informational."
      })
    ).toBe(false);
    expect(
      isThemeDiagnostic({
        severity: "warning",
        code: "bad-theme-diagnostic",
        message: "Bad metadata.",
        path: 42
      })
    ).toBe(false);
  });

  it("reports missing asset and explicit block files as structured errors", () => {
    const diagnostics = validateThemeSource({
      manifest: {
        name: "broken",
        css: "missing.css",
        blocks: "missing-blocks.html"
      },
      files: {}
    });

    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "error",
        code: "missing-theme-file",
        path: "missing.css"
      })
    );
    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "error",
        code: "missing-theme-block-source",
        path: "missing-blocks.html"
      })
    );
  });

  it("warns about duplicate normalized asset references without blocking rendering", () => {
    const source = {
      manifest: {
        name: "duplicate-assets",
        css: ["./style.css", "style.css"]
      },
      files: {
        "style.css": ".page{}",
        "blocks/hero.html": "<section>{{ children }}</section>"
      }
    };
    const diagnostics = validateThemeSource(source);
    const theme = createThemeFromSources(source);

    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "warning",
        code: "duplicate-theme-asset-reference",
        field: "css",
        path: "style.css"
      })
    );
    expect(theme.css).toContain(".page{}");
  });

  it("keeps missing automatic block templates as a warning", () => {
    const diagnostics = validateThemeSource({
      manifest: {
        name: "metadata-only"
      },
      files: {}
    });

    expect(diagnostics).toEqual([
      expect.objectContaining({
        severity: "warning",
        code: "missing-theme-block-source"
      })
    ]);
    expect(createThemeFromSources({ manifest: { name: "metadata-only" }, files: {} }).name).toBe("metadata-only");
  });

  it("warns about duplicate and unusual block registrations without blocking rendering", () => {
    const source = {
      manifest: {
        name: "duplicates",
        blocks: ["base.html", "override.html"]
      },
      files: {
        "base.html": `<template data-block="hero invalid/block">
<section class="hero base">{{ children }}</section>
</template>`,
        "override.html": `<template data-block="hero">
<section class="hero override">{{ children }}</section>
</template>`
      }
    };

    const diagnostics = validateThemeSource(source);
    const theme = createThemeFromSources(source);

    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "warning",
        code: "invalid-theme-block-name",
        block: "invalid/block"
      })
    );
    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "warning",
        code: "duplicate-theme-block-template",
        block: "hero",
        path: "override.html"
      })
    );
    expect(theme.blockRenderers?.hero).toBeDefined();
  });

  it("uses filename fallback registrations for templates without data-block", () => {
    const diagnostics = validateThemeSource({
      manifest: {
        name: "fallback-duplicates",
        blocks: ["hero.html", "override.html"]
      },
      files: {
        "hero.html": `<template>
<section class="hero base">{{ children }}</section>
</template>`,
        "override.html": `<template data-block="hero">
<section class="hero override">{{ children }}</section>
</template>`
      }
    });

    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "warning",
        code: "duplicate-theme-block-template",
        block: "hero",
        path: "override.html"
      })
    );
  });

  it("throws a ThemeValidationError before rendering invalid source themes", () => {
    expect(() =>
      createThemeFromSources({
        manifest: {
          name: "invalid",
          css: "../outside.css"
        },
        files: {}
      })
    ).toThrow(ThemeValidationError);
  });

  it("keeps malformed manifest references on the structured validation path", () => {
    const source = {
      manifest: {
        name: "malformed-references",
        css: 42,
        js: ["script.js", 42],
        head: {},
        shell: 123,
        preview: 456,
        blocks: ["blocks", 789],
        actions: [123]
      },
      files: {
        "script.js": ""
      }
    } as unknown as Parameters<typeof validateThemeSource>[0];

    expect(() => validateThemeSource(source)).not.toThrow();
    const diagnostics = validateThemeSource(source);

    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "error",
        code: "invalid-theme-asset-reference",
        field: "css"
      })
    );
    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "error",
        code: "invalid-theme-asset-reference",
        field: "js"
      })
    );
    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "error",
        code: "invalid-theme-asset-reference",
        field: "head"
      })
    );
    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "error",
        code: "invalid-theme-field",
        field: "shell"
      })
    );
    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "error",
        code: "invalid-theme-field",
        field: "preview"
      })
    );
    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "error",
        code: "invalid-theme-blocks-reference",
        field: "blocks"
      })
    );
    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "error",
        code: "invalid-theme-actions",
        field: "actions"
      })
    );
    expect(() => createThemeFromSources(source)).toThrow(ThemeValidationError);
  });

  it("uses the same theme name fallback when asserting invalid source themes", () => {
    expect(() =>
      assertValidThemeSource({
        manifest: {
          name: " ",
          css: "../outside.css"
        },
        files: {},
        rootName: "fallback-root"
      })
    ).toThrow("Invalid fallback-root theme");
  });

  it("validates artifact file paths and keeps theme.json reserved for the manifest", () => {
    const diagnostics = validateThemeSource({
      manifest: {
        name: "invalid-files"
      },
      files: {
        "../escape.css": "",
        "theme.json": "{}",
        "./theme.json": "{}"
      }
    });

    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "error",
        code: "invalid-theme-path",
        field: "files",
        path: "../escape.css"
      })
    );
    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "error",
        code: "reserved-theme-file",
        field: "files",
        path: "theme.json"
      })
    );
    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "error",
        code: "reserved-theme-file",
        field: "files",
        path: "./theme.json"
      })
    );
  });

  it("rejects manifest references to the reserved theme manifest file", () => {
    const diagnostics = validateThemeSource({
      manifest: {
        name: "reserved-references",
        css: "./theme.json",
        shell: "theme.json",
        preview: "theme.json",
        blocks: {
          hero: "theme.json"
        }
      },
      files: {
        "blocks/hero.html": "<section>{{ children }}</section>"
      }
    });

    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "error",
        code: "reserved-theme-file-reference",
        field: "css",
        path: "theme.json"
      })
    );
    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "error",
        code: "reserved-theme-file-reference",
        field: "shell",
        path: "theme.json"
      })
    );
    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "error",
        code: "reserved-theme-file-reference",
        field: "preview",
        path: "theme.json"
      })
    );
    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "error",
        code: "reserved-theme-file-reference",
        field: "blocks",
        path: "theme.json"
      })
    );
    expect(diagnostics).not.toContainEqual(
      expect.objectContaining({
        code: "missing-theme-file",
        path: "theme.json"
      })
    );
  });

  it("reports non-text artifact file contents as structured errors", () => {
    const source = {
      manifest: {
        name: "invalid-file-content",
        blocks: "blocks"
      },
      files: {
        "blocks/hero.html": 42
      } as unknown as Record<string, string>
    };
    const diagnostics = validateThemeSource(source);

    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "error",
        code: "invalid-theme-file-content",
        field: "files",
        path: "blocks/hero.html"
      })
    );
    expect(() => createThemeFromSources(source)).toThrow(ThemeValidationError);
  });

  it("includes structured diagnostic details in validation error messages", () => {
    expect(() =>
      createThemeFromSources({
        manifest: {
          name: "invalid",
          css: "missing.css"
        },
        files: {}
      })
    ).toThrow("ERROR missing-theme-file: Theme css file is missing: missing.css. (field=css, path=missing.css)");
  });

  it("validates theme metadata and preview assets", () => {
    const validDiagnostics = validateThemeSource({
      manifest: {
        name: "metadata",
        label: "Metadata",
        description: "A descriptive theme.",
        author: "MDS",
        homepage: "https://example.com",
        preview: "preview.svg",
        tags: ["docs", "clean"],
        supportedBlocks: ["hero", "card"]
      },
      files: {
        "preview.svg": "<svg></svg>"
      }
    });

    expect(validDiagnostics).toEqual([
      expect.objectContaining({
        severity: "warning",
        code: "missing-theme-block-source"
      })
    ]);

    const invalidDiagnostics = validateThemeSource({
      manifest: {
        name: "invalid-metadata",
        preview: "missing.svg",
        tags: ["ok", 123] as unknown as string[],
        supportedBlocks: ["hero", "bad/block"]
      },
      files: {}
    });

    expect(invalidDiagnostics).toContainEqual(
      expect.objectContaining({
        severity: "error",
        code: "missing-theme-file",
        field: "preview",
        path: "missing.svg"
      })
    );
    expect(invalidDiagnostics).toContainEqual(
      expect.objectContaining({
        severity: "error",
        code: "invalid-theme-field",
        field: "tags"
      })
    );
    expect(invalidDiagnostics).toContainEqual(
      expect.objectContaining({
        severity: "warning",
        code: "invalid-theme-block-name",
        field: "supportedBlocks",
        block: "bad/block"
      })
    );
  });

  it("accepts v1 theme manifests and rejects unsupported manifest versions", () => {
    const validDiagnostics = validateThemeSource({
      manifest: {
        version: 1,
        name: "versioned",
        blocks: "blocks"
      },
      files: {
        "blocks/hero.html": "<section>{{ children }}</section>"
      }
    });

    expect(validDiagnostics).not.toContainEqual(
      expect.objectContaining({
        code: "unknown-theme-manifest-field",
        field: "version"
      })
    );

    const invalidTypeDiagnostics = validateThemeSource({
      manifest: {
        version: "1",
        name: "invalid-version-type"
      } as unknown as Parameters<typeof validateThemeSource>[0]["manifest"],
      files: {}
    });

    expect(invalidTypeDiagnostics).toContainEqual(
      expect.objectContaining({
        severity: "error",
        code: "invalid-theme-version",
        field: "version"
      })
    );

    const unsupportedDiagnostics = validateThemeSource({
      manifest: {
        version: 2,
        name: "unsupported-version"
      } as unknown as Parameters<typeof validateThemeSource>[0]["manifest"],
      files: {}
    });

    expect(unsupportedDiagnostics).toContainEqual(
      expect.objectContaining({
        severity: "error",
        code: "unsupported-theme-version",
        field: "version"
      })
    );
    expect(() =>
      createThemeFromSources({
        manifest: {
          version: 2,
          name: "unsupported-version"
        } as unknown as Parameters<typeof createThemeFromSources>[0]["manifest"],
        files: {}
      })
    ).toThrow(ThemeValidationError);
  });

  it("warns about unknown manifest fields without blocking rendering", () => {
    const source = {
      manifest: {
        name: "unknown-field",
        futureField: true
      },
      files: {
        "blocks/hero.html": "<section>{{ children }}</section>"
      }
    };
    const diagnostics = validateThemeSource(source);
    const theme = createThemeFromSources(source);

    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "warning",
        code: "unknown-theme-manifest-field",
        field: "futureField"
      })
    );
    expect(theme.name).toBe("unknown-field");
  });

  it("warns about duplicate metadata declarations without blocking rendering", () => {
    const source = {
      manifest: {
        name: "duplicate-metadata",
        supportedBlocks: ["hero", "card", "hero"],
        actions: ["toggle", "lead.submit", "toggle"]
      },
      files: {
        "blocks/hero.html": "<section>{{ children }}</section>"
      }
    };
    const diagnostics = validateThemeSource(source);
    const theme = createThemeFromSources(source);

    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "warning",
        code: "duplicate-theme-supported-block",
        field: "supportedBlocks",
        block: "hero"
      })
    );
    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "warning",
        code: "duplicate-theme-action",
        field: "actions"
      })
    );
    expect(theme.actions).toEqual(["toggle", "lead.submit"]);
    expect(theme.name).toBe("duplicate-metadata");
  });

  it("warns about empty theme names and falls back to the root name", () => {
    const source = {
      manifest: {
        name: " "
      },
      rootName: "fallback-theme",
      files: {
        "blocks/hero.html": "<section>{{ children }}</section>"
      }
    };
    const diagnostics = validateThemeSource(source);
    const theme = createThemeFromSources(source);

    expect(diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "warning",
        code: "empty-theme-name",
        field: "name"
      })
    );
    expect(theme.name).toBe("fallback-theme");
  });

  it("formats diagnostics with structured location details", () => {
    expect(
      formatThemeDiagnostic({
        severity: "warning",
        code: "duplicate-theme-block-template",
        message: "Theme block is defined more than once.",
        field: "blocks",
        path: "blocks/hero.html",
        block: "hero"
      })
    ).toBe(
      "WARNING duplicate-theme-block-template: Theme block is defined more than once. (field=blocks, path=blocks/hero.html, block=hero)"
    );
  });
});
