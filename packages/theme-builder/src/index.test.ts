import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { EventEmitter } from "node:events";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ThemeValidationError } from "@mds/theme-loader";
import { describe, expect, it } from "vitest";
import { runThemeCli } from "./cli-runner.js";
import {
  buildPackageTheme,
  formatThemeBuildDiagnostic,
  inspectThemeArtifact,
  packThemeArtifact,
  ThemeBuildError,
  themeBuildErrorToDiagnostics,
  watchPackageTheme,
  writeThemeSource
} from "./index.js";

describe("theme builder", () => {
  it("writes a standard theme artifact", async () => {
    const outputDirectory = await mkdtemp(join(tmpdir(), "mds-theme-artifact-"));
    const files = await writeThemeSource(outputDirectory, {
      manifest: {
        name: "artifact",
        css: "style.css",
        blocks: "blocks"
      },
      files: {
        "style.css": ".card{color:red}",
        "blocks/card.html": "<article>{{ children }}</article>"
      }
    });

    expect(files).toContain("theme.json");
    expect(files).toContain("blocks/card.html");
    await expect(readJson(join(outputDirectory, "theme.json"))).resolves.toMatchObject({
      version: 1,
      name: "artifact"
    });
  });

  it("returns written artifact files in shared artifact order", async () => {
    const outputDirectory = await mkdtemp(join(tmpdir(), "mds-theme-artifact-order-"));
    const files = await writeThemeSource(outputDirectory, {
      manifest: {
        name: "artifact-order",
        css: "style.css",
        blocks: "blocks"
      },
      files: {
        ".mds-theme-build.json": "{}",
        "style.css": ".card{color:red}",
        "blocks/hero.html": "<section>{{ children }}</section>",
        "blocks/card.html": "<article>{{ children }}</article>"
      }
    });

    expect(files).toEqual(["theme.json", "blocks/card.html", "blocks/hero.html", "style.css", ".mds-theme-build.json"]);
  });

  it("preserves block metadata when converting bare theme validation errors", () => {
    const diagnostics = themeBuildErrorToDiagnostics(
      new ThemeValidationError(
        [
          {
            severity: "warning",
            code: "duplicate-theme-block-template",
            message: "Theme block is defined more than once.",
            field: "blocks",
            path: "blocks/hero.html",
            block: "hero"
          }
        ],
        "diagnostic-theme"
      )
    );

    expect(diagnostics).toEqual([
      {
        severity: "warning",
        code: "duplicate-theme-block-template",
        message: "Theme block is defined more than once.",
        field: "blocks",
        path: "blocks/hero.html",
        block: "hero"
      }
    ]);
  });

  it("writes canonical artifact manifest references and file paths", async () => {
    const outputDirectory = await mkdtemp(join(tmpdir(), "mds-theme-artifact-normalized-"));
    const files = await writeThemeSource(outputDirectory, {
      manifest: {
        name: "normalized-artifact",
        css: "./style.css",
        blocks: "./blocks"
      },
      files: {
        "./style.css": ".hero{color:red}",
        "./blocks/hero.html": "<section>{{ children }}</section>"
      }
    });

    expect(files).toContain("style.css");
    expect(files).toContain("blocks/hero.html");
    await expect(readJson(join(outputDirectory, "theme.json"))).resolves.toMatchObject({
      version: 1,
      css: "style.css",
      blocks: "blocks"
    });
    await expect(readFile(join(outputDirectory, "style.css"), "utf8")).resolves.toContain(".hero");
  });

  it("rejects artifact file paths that escape the output directory through validation", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-artifact-escape-"));
    const outputDirectory = join(root, "theme");

    await expect(
      writeThemeSource(outputDirectory, {
        manifest: {
          name: "escape"
        },
        files: {
          "../escape.css": ".escape{}"
        }
      })
    ).rejects.toMatchObject({
      name: "ThemeValidationError",
      diagnostics: [
        expect.objectContaining({
          severity: "error",
          code: "invalid-theme-path",
          field: "files",
          path: "../escape.css"
        })
      ]
    } satisfies Partial<ThemeValidationError>);
    await expect(readFile(join(root, "escape.css"), "utf8")).rejects.toThrow();
  });

  it("keeps theme.json reserved for artifact manifests through validation", async () => {
    const outputDirectory = await mkdtemp(join(tmpdir(), "mds-theme-artifact-reserved-"));

    await expect(
      writeThemeSource(outputDirectory, {
        manifest: {
          name: "reserved"
        },
        files: {
          "theme.json": "{}"
        }
      })
    ).rejects.toMatchObject({
      name: "ThemeValidationError",
      diagnostics: [
        expect.objectContaining({
          severity: "error",
          code: "reserved-theme-file",
          field: "files",
          path: "theme.json"
        })
      ]
    } satisfies Partial<ThemeValidationError>);
  });

  it("rejects malformed manifest references before writing artifacts", async () => {
    const outputDirectory = await mkdtemp(join(tmpdir(), "mds-theme-artifact-invalid-manifest-"));

    await expect(
      writeThemeSource(outputDirectory, {
        manifest: {
          name: "invalid-manifest",
          css: 42,
          blocks: ["blocks", 123]
        },
        files: {
          "blocks/hero.html": "<section>{{ children }}</section>"
        }
      } as unknown as Parameters<typeof writeThemeSource>[1])
    ).rejects.toMatchObject({
      name: "ThemeValidationError",
      diagnostics: [
        expect.objectContaining({
          severity: "error",
          code: "invalid-theme-asset-reference",
          field: "css"
        }),
        expect.objectContaining({
          severity: "error",
          code: "invalid-theme-blocks-reference",
          field: "blocks"
        })
      ]
    } satisfies Partial<ThemeValidationError>);
    await expect(readFile(join(outputDirectory, "theme.json"), "utf8")).rejects.toThrow();
  });

  it("rejects non-posix artifact file paths before writing artifacts", async () => {
    const outputDirectory = await mkdtemp(join(tmpdir(), "mds-theme-artifact-non-posix-"));

    await expect(
      writeThemeSource(outputDirectory, {
        manifest: {
          name: "non-posix"
        },
        files: {
          "blocks\\hero.html": "<section>{{ children }}</section>"
        }
      })
    ).rejects.toMatchObject({
      name: "ThemeValidationError",
      diagnostics: [
        expect.objectContaining({
          severity: "error",
          code: "invalid-theme-path",
          field: "files",
          path: "blocks\\hero.html"
        })
      ]
    } satisfies Partial<ThemeValidationError>);
    await expect(readFile(join(outputDirectory, "theme.json"), "utf8")).rejects.toThrow();
  });

  it("rejects duplicate normalized artifact file paths before writing artifacts", async () => {
    const outputDirectory = await mkdtemp(join(tmpdir(), "mds-theme-artifact-duplicate-path-"));

    await expect(
      writeThemeSource(outputDirectory, {
        manifest: {
          name: "duplicate-path"
        },
        files: {
          "./style.css": ".hero{}",
          "style.css": ".card{}"
        }
      })
    ).rejects.toMatchObject({
      name: "ThemeValidationError",
      diagnostics: [
        expect.objectContaining({
          severity: "error",
          code: "duplicate-theme-file",
          field: "files",
          path: "style.css"
        })
      ]
    } satisfies Partial<ThemeValidationError>);
    await expect(readFile(join(outputDirectory, "theme.json"), "utf8")).rejects.toThrow();
  });

  it("builds a package theme from package.json#mdsTheme", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-package-"));
    await mkdir(join(root, "src/assets"), { recursive: true });
    await writeFile(
      join(root, "package.json"),
      JSON.stringify(
        {
          type: "module",
          mdsTheme: {
            source: "./src/theme.ts",
            dist: "./dist/theme",
            assets: {
              css: "./src/assets/style.css",
              preview: "./src/assets/preview.svg"
            }
          }
        },
        null,
        2
      ),
      "utf8"
    );
    await writeFile(join(root, "src/assets/style.css"), ".hero{color:red}", "utf8");
    await writeFile(join(root, "src/assets/preview.svg"), "<svg></svg>", "utf8");
    await writeFile(
      join(root, "src/theme.ts"),
      `import { Content, defineJsxTheme, jsx, Root } from "${join(process.cwd(), "../theme-loader/src/jsx.js")}";
export default defineJsxTheme({
  name: "pkg",
  label: "Package Theme",
  description: "Built from a package.",
  author: "MDS",
  homepage: "https://example.com/mds-theme",
  tags: ["package", "test"],
  supportedBlocks: ["hero"],
  blocks: {
    hero: (block) => jsx(Root, { block, className: "hero" }, jsx(Content, { block }))
  }
});`,
      "utf8"
    );

    const result = await buildPackageTheme(root);

    expect(result.filesWritten).toEqual([
      "theme.json",
      "assets/preview.svg",
      "assets/style.css",
      "blocks/hero.html",
      ".mds-theme-build.json"
    ]);
    expect(result.metadataPath).toBe(".mds-theme-build.json");
    const manifest = JSON.parse(await readFile(join(root, "dist/theme/theme.json"), "utf8")) as Record<string, unknown>;
    expect(manifest).toMatchObject({
      version: 1,
      name: "pkg",
      css: "assets/style.css",
      preview: "assets/preview.svg"
    });
    await expect(readFile(join(root, "dist/theme/blocks/hero.html"), "utf8")).resolves.toContain("{{ children }}");
    await expect(readFile(join(root, "dist/theme/assets/style.css"), "utf8")).resolves.toContain(".hero");
    await expect(readFile(join(root, "dist/theme/assets/preview.svg"), "utf8")).resolves.toContain("<svg");
    await expect(readJson(join(root, "dist/theme/.mds-theme-build.json"))).resolves.toEqual({
      version: 1,
      source: "src/theme.ts",
      output: "dist/theme",
      inputFiles: ["package.json", "src/assets/preview.svg", "src/assets/style.css", "src/theme.ts"],
      artifactFiles: ["theme.json", "assets/preview.svg", "assets/style.css", "blocks/hero.html"],
      templates: [
        {
          file: "blocks/hero.html",
          blocks: ["hero"]
        }
      ]
    });
  });

  it("loads TSX theme sources with local component imports", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-components-"));
    const jsxImport = join(process.cwd(), "../theme-loader/src/jsx.js");
    await mkdir(join(root, "src/components"), { recursive: true });
    await writeFile(
      join(root, "package.json"),
      JSON.stringify(
        {
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
      join(root, "src/components/Surface.tsx"),
      `/** @jsx jsx */
import { Content, Root, jsx, type TemplateBlock } from "${jsxImport}";

export function Surface(props: { block: TemplateBlock }) {
  return <Root block={props.block} className="surface"><Content block={props.block} /></Root>;
}
`,
      "utf8"
    );
    await writeFile(
      join(root, "src/theme.tsx"),
      `/** @jsx jsx */
import { defineJsxTheme, jsx } from "${jsxImport}";
import { Surface } from "./components/Surface.tsx";

export default defineJsxTheme({
  name: "component-theme",
  blocks: {
    hero: (block) => <Surface block={block} />
  }
});
`,
      "utf8"
    );

    const result = await buildPackageTheme(root);

    expect(result.filesWritten).toContain("blocks/hero.html");
    await expect(readFile(join(root, "dist/theme/theme.json"), "utf8")).resolves.toContain('"name": "component-theme"');
    await expect(readFile(join(root, "dist/theme/blocks/hero.html"), "utf8")).resolves.toContain('class="surface"');
  });

  it("builds package themes authored with the HTML SDK adapter", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-html-sdk-"));
    const htmlSdkImport = join(process.cwd(), "../theme-sdk-html/src/index.js");
    await mkdir(join(root, "src/components"), { recursive: true });
    await writeFile(
      join(root, "package.json"),
      JSON.stringify(
        {
          type: "module",
          mdsTheme: {
            source: "./src/theme.ts",
            dist: "./dist/theme"
          }
        },
        null,
        2
      ),
      "utf8"
    );
    await writeFile(
      join(root, "src/components/Surface.ts"),
      `import { html, type HtmlThemeBlock } from "${htmlSdkImport}";

export function Surface(block: HtmlThemeBlock, className: string) {
  return html\`<article\${block.attrs} class="\${className}">\${block.children}</article>\`;
}
`,
      "utf8"
    );
    await writeFile(
      join(root, "src/theme.ts"),
      `import { defineHtmlTheme } from "${htmlSdkImport}";
import { Surface } from "./components/Surface.ts";

export default defineHtmlTheme({
  name: "html-sdk-theme",
  blocks: {
    card: (block) => Surface(block, "card surface")
  }
});
`,
      "utf8"
    );

    const result = await buildPackageTheme(root);

    expect(result.filesWritten).toContain("blocks/card.html");
    await expect(readFile(join(root, "dist/theme/theme.json"), "utf8")).resolves.toContain('"name": "html-sdk-theme"');
    await expect(readFile(join(root, "dist/theme/blocks/card.html"), "utf8")).resolves.toContain('class="card surface"');
  });

  it("builds package themes authored with the React SDK adapter and local components", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-react-sdk-"));
    const reactImport = join(process.cwd(), "../theme-sdk-react/node_modules/react/index.js");
    const reactSdkImport = join(process.cwd(), "../theme-sdk-react/src/index.js");
    await mkdir(join(root, "src/components"), { recursive: true });
    await writeFile(
      join(root, "package.json"),
      JSON.stringify(
        {
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
      join(root, "src/components/Button.tsx"),
      `import React from "${reactImport}";

export function Button(props: { className?: string; children?: React.ReactNode }) {
  return <button className={\`inline-flex rounded-md \${props.className ?? ""}\`}>{props.children}</button>;
}
`,
      "utf8"
    );
    await writeFile(
      join(root, "src/theme.tsx"),
      `import React from "${reactImport}";
import { Content, Root, defineReactTheme } from "${reactSdkImport}";
import { Button } from "./components/Button.tsx";

export default defineReactTheme({
  name: "react-sdk-theme",
  blocks: {
    card: (block) => (
      <Root block={block} className="rounded-xl border bg-card text-card-foreground">
        <Button className="bg-primary px-4 py-2 text-primary-foreground">
          <Content block={block} />
        </Button>
      </Root>
    )
  }
});
`,
      "utf8"
    );

    const result = await buildPackageTheme(root);

    expect(result.filesWritten).toContain("blocks/card.html");
    await expect(readFile(join(root, "dist/theme/theme.json"), "utf8")).resolves.toContain('"name": "react-sdk-theme"');
    await expect(readFile(join(root, "dist/theme/blocks/card.html"), "utf8")).resolves.toContain(
      "inline-flex rounded-md bg-primary"
    );
  });

  it("bundles TypeScript theme scripts into plain artifact JavaScript", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-script-bundle-"));
    await mkdir(join(root, "src/lib"), { recursive: true });
    await writeFile(
      join(root, "package.json"),
      JSON.stringify(
        {
          type: "module",
          mdsTheme: {
            source: "./src/theme.ts",
            dist: "./dist/theme",
            assets: {
              js: "./src/script.ts"
            }
          }
        },
        null,
        2
      ),
      "utf8"
    );
    await writeFile(
      join(root, "src/theme.ts"),
      `import { Content, defineJsxTheme, jsx, Root } from "${join(process.cwd(), "../theme-loader/src/jsx.js")}";
export default defineJsxTheme({
  name: "script-theme",
  blocks: {
    hero: (block) => jsx(Root, { block, className: "hero" }, jsx(Content, { block }))
  }
});`,
      "utf8"
    );
    await writeFile(join(root, "src/lib/message.ts"), `export const message: string = "bundled";`, "utf8");
    await writeFile(
      join(root, "src/script.ts"),
      `import { message } from "./lib/message";
document.documentElement.dataset.themeScript = message;
`,
      "utf8"
    );

    const result = await buildPackageTheme(root);
    const bundledScript = await readFile(join(root, "dist/theme/script.js"), "utf8");

    expect(result.filesWritten).toContain("script.js");
    expect(result.inputFiles).toContain(join(root, "src/script.ts"));
    expect(result.inputFiles).toContain(join(root, "src/lib/message.ts"));
    await expect(readFile(join(root, "dist/theme/theme.json"), "utf8")).resolves.toContain('"js": "script.js"');
    expect(bundledScript).toContain("bundled");
    expect(bundledScript).not.toContain(": string");
  });

  it("bundles CSS imports into artifact stylesheets", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-style-bundle-"));
    await mkdir(join(root, "src/styles"), { recursive: true });
    await writeFile(
      join(root, "package.json"),
      JSON.stringify(
        {
          type: "module",
          mdsTheme: {
            source: "./src/theme.ts",
            dist: "./dist/theme",
            assets: {
              css: "./src/style.css"
            }
          }
        },
        null,
        2
      ),
      "utf8"
    );
    await writeFile(
      join(root, "src/theme.ts"),
      `import { Content, defineJsxTheme, jsx, Root } from "${join(process.cwd(), "../theme-loader/src/jsx.js")}";
export default defineJsxTheme({
  name: "style-theme",
  blocks: {
    hero: (block) => jsx(Root, { block, className: "hero" }, jsx(Content, { block }))
  }
});`,
      "utf8"
    );
    await writeFile(join(root, "src/styles/tokens.css"), `:root { --brand: #236b5e; }`, "utf8");
    await writeFile(
      join(root, "src/style.css"),
      `@import "./styles/tokens.css";
.hero { color: var(--brand); }
`,
      "utf8"
    );

    const result = await buildPackageTheme(root);
    const bundledStyle = await readFile(join(root, "dist/theme/style.css"), "utf8");

    expect(result.filesWritten).toContain("style.css");
    expect(result.inputFiles).toContain(join(root, "src/style.css"));
    expect(result.inputFiles).toContain(join(root, "src/styles/tokens.css"));
    await expect(readFile(join(root, "dist/theme/theme.json"), "utf8")).resolves.toContain('"css": "style.css"');
    expect(bundledStyle).toContain("--brand");
    expect(bundledStyle).toContain(".hero");
    expect(bundledStyle).not.toContain("@import");
  });

  it("builds Tailwind CSS pipeline styles from package theme sources", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-tailwind-style-"));
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(
      join(root, "package.json"),
      JSON.stringify(
        {
          type: "module",
          mdsTheme: {
            source: "./src/theme.ts",
            dist: "./dist/theme",
            pipeline: {
              css: "tailwind"
            },
            assets: {
              css: "./src/style.css"
            }
          }
        },
        null,
        2
      ),
      "utf8"
    );
    await writeFile(
      join(root, "src/theme.ts"),
      `import { Content, defineJsxTheme, jsx, Root } from "${join(process.cwd(), "../theme-loader/src/jsx.js")}";
export default defineJsxTheme({
  name: "tailwind-theme",
  blocks: {
    hero: (block) => jsx(Root, { block, className: "rounded-xl bg-zinc-950 px-6 py-4 text-white" }, jsx(Content, { block }))
  }
});`,
      "utf8"
    );
    await writeFile(
      join(root, "src/style.css"),
      `@import "tailwindcss";
@source "./theme.ts";
`,
      "utf8"
    );

    const result = await buildPackageTheme(root);
    const bundledStyle = await readFile(join(root, "dist/theme/style.css"), "utf8");

    expect(result.filesWritten).toContain("style.css");
    expect(result.inputFiles).toContain(join(root, "src/style.css"));
    await expect(readFile(join(root, "dist/theme/theme.json"), "utf8")).resolves.toContain('"css": "style.css"');
    expect(bundledStyle).toContain(".rounded-xl");
    expect(bundledStyle).toContain(".bg-zinc-950");
    expect(bundledStyle).not.toContain("@source");
  });

  it("preserves multi-entry package asset lists in generated manifests", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-multi-assets-"));
    await mkdir(join(root, "src/styles/components"), { recursive: true });
    await mkdir(join(root, "src/scripts"), { recursive: true });
    await writeFile(
      join(root, "package.json"),
      JSON.stringify(
        {
          type: "module",
          mdsTheme: {
            source: "./src/theme.ts",
            dist: "./dist/theme",
            assets: {
              css: ["./src/base.css", "./src/styles/components/button.css"],
              js: ["./src/scripts/boot.ts", "./src/scripts/enhance.js"]
            }
          }
        },
        null,
        2
      ),
      "utf8"
    );
    await writeFile(
      join(root, "src/theme.ts"),
      `import { Content, defineJsxTheme, jsx, Root } from "${join(process.cwd(), "../theme-loader/src/jsx.js")}";
export default defineJsxTheme({
  name: "multi-assets",
  blocks: {
    hero: (block) => jsx(Root, { block, className: "hero" }, jsx(Content, { block }))
  }
});`,
      "utf8"
    );
    await writeFile(join(root, "src/base.css"), ".hero { color: #123456; }", "utf8");
    await writeFile(join(root, "src/styles/components/button.css"), ".button { border: 1px solid; }", "utf8");
    await writeFile(join(root, "src/scripts/boot.ts"), "document.documentElement.dataset.booted = 'true';", "utf8");
    await writeFile(join(root, "src/scripts/enhance.js"), "document.documentElement.dataset.enhanced = 'true';", "utf8");

    const result = await buildPackageTheme(root);
    const manifest = JSON.parse(await readFile(join(root, "dist/theme/theme.json"), "utf8")) as {
      css: string[];
      js: string[];
    };

    expect(manifest.css).toEqual(["base.css", "styles/components/button.css"]);
    expect(manifest.js).toEqual(["scripts/boot.js", "scripts/enhance.js"]);
    expect(result.filesWritten).toEqual(
      expect.arrayContaining([
        "base.css",
        "styles/components/button.css",
        "scripts/boot.js",
        "scripts/enhance.js"
      ])
    );
    expect(result.inputFiles).toEqual(
      expect.arrayContaining([
        join(root, "src/base.css"),
        join(root, "src/styles/components/button.css"),
        join(root, "src/scripts/boot.ts"),
        join(root, "src/scripts/enhance.js")
      ])
    );
    await expect(readFile(join(root, "dist/theme/scripts/boot.js"), "utf8")).resolves.toContain("booted");
    await expect(readFile(join(root, "dist/theme/scripts/enhance.js"), "utf8")).resolves.toContain("enhanced");
  });

  it("allocates stable artifact paths for colliding package assets", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-colliding-assets-"));
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(
      join(root, "package.json"),
      JSON.stringify(
        {
          type: "module",
          mdsTheme: {
            source: "./src/theme.ts",
            dist: "./dist/theme",
            assets: {
              css: ["./src/style.css", "./style.css"]
            }
          }
        },
        null,
        2
      ),
      "utf8"
    );
    await writeFile(
      join(root, "src/theme.ts"),
      `import { Content, defineJsxTheme, jsx, Root } from "${join(process.cwd(), "../theme-loader/src/jsx.js")}";
export default defineJsxTheme({
  name: "colliding-assets",
  blocks: {
    hero: (block) => jsx(Root, { block, className: "hero" }, jsx(Content, { block }))
  }
});`,
      "utf8"
    );
    await writeFile(join(root, "src/style.css"), ".hero { color: red; }", "utf8");
    await writeFile(join(root, "style.css"), ".hero { color: blue; }", "utf8");

    const result = await buildPackageTheme(root);
    const manifest = JSON.parse(await readFile(join(root, "dist/theme/theme.json"), "utf8")) as {
      css: string[];
    };

    expect(manifest.css).toEqual(["style.css", "2-style.css"]);
    expect(result.filesWritten).toEqual(expect.arrayContaining(["style.css", "2-style.css"]));
    await expect(readFile(join(root, "dist/theme/style.css"), "utf8")).resolves.toContain("red");
    await expect(readFile(join(root, "dist/theme/2-style.css"), "utf8")).resolves.toContain("blue");
  });

  it("inspects built package artifacts without loading theme source", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-inspect-"));
    await mkdir(join(root, "src/assets"), { recursive: true });
    await writeFile(
      join(root, "package.json"),
      JSON.stringify(
        {
          type: "module",
          mdsTheme: {
            source: "./src/theme.ts",
            dist: "./dist/theme",
            assets: {
              css: "./src/assets/style.css",
              js: "./src/assets/script.js",
              preview: "./src/assets/preview.svg"
            }
          }
        },
        null,
        2
      ),
      "utf8"
    );
    await writeFile(join(root, "src/assets/style.css"), ".hero{color:red}", "utf8");
    await writeFile(join(root, "src/assets/script.js"), "console.log('theme')", "utf8");
    await writeFile(join(root, "src/assets/preview.svg"), "<svg></svg>", "utf8");
    await writeFile(
      join(root, "src/theme.ts"),
      `import { Content, defineJsxTheme, jsx, Root } from "${join(process.cwd(), "../theme-loader/src/jsx.js")}";
export default defineJsxTheme({
  name: "inspectable",
  label: "Inspectable Theme",
  description: "A theme that can be inspected.",
  author: "MDS",
  homepage: "https://example.com/inspectable",
  tags: ["inspect"],
  supportedBlocks: ["hero"],
  actions: ["toggle"],
  blocks: {
    hero: (block) => jsx(Root, { block, className: "hero" }, jsx(Content, { block }))
  }
});`,
      "utf8"
    );

    await buildPackageTheme(root);
    await writeFile(join(root, "src/theme.ts"), "throw new Error('source should not load during inspect');", "utf8");

    const inspection = await inspectThemeArtifact(root);

    expect(inspection.name).toBe("inspectable");
    expect(inspection.label).toBe("Inspectable Theme");
    expect(inspection.description).toBe("A theme that can be inspected.");
    expect(inspection.author).toBe("MDS");
    expect(inspection.homepage).toBe("https://example.com/inspectable");
    expect(inspection.preview).toBe("assets/preview.svg");
    expect(inspection.tags).toEqual(["inspect"]);
    expect(inspection.supportedBlocks).toEqual(["hero"]);
    expect(inspection.artifactDirectory).toBe(join(root, "dist/theme"));
    expect(inspection.blocks).toEqual(["hero"]);
    expect(inspection.actions).toEqual(["toggle"]);
    expect(inspection.assets).toEqual({
      css: ["assets/style.css"],
      js: ["assets/script.js"],
      head: []
    });
    expect(inspection.files.filter((file) => file === "theme.json")).toHaveLength(1);
    expect(inspection.files).toContain(".mds-theme-build.json");
    expect(inspection.runtimeFiles).toEqual([
      "theme.json",
      "assets/preview.svg",
      "assets/script.js",
      "assets/style.css",
      "blocks/hero.html"
    ]);
    expect(inspection.developmentFiles).toEqual([".mds-theme-build.json"]);
    expect(inspection.metadata).toMatchObject({
      version: 1,
      source: "src/theme.ts",
      output: "dist/theme",
      inputFiles: [
        "package.json",
        "src/assets/preview.svg",
        "src/assets/script.js",
        "src/assets/style.css",
        "src/theme.ts"
      ]
    });
    expect(inspection.diagnostics).toEqual([]);
  });

  it("reports canonical manifest asset references during artifact inspection", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-inspect-canonical-assets-"));
    await mkdir(join(root, "assets"), { recursive: true });
    await mkdir(join(root, "blocks"), { recursive: true });
    await writeFile(
      join(root, "theme.json"),
      JSON.stringify(
        {
          name: "canonical-assets",
          css: ["./assets//base.css"],
          js: "./assets//script.js",
          head: "./assets//head.html",
          preview: "./assets//preview.svg",
          shell: "./assets//shell.html",
          blocks: "blocks"
        },
        null,
        2
      ),
      "utf8"
    );
    await writeFile(join(root, "assets/base.css"), ".page{}", "utf8");
    await writeFile(join(root, "assets/script.js"), "console.log('theme')", "utf8");
    await writeFile(join(root, "assets/head.html"), "<meta name=\"theme\" content=\"canonical\">", "utf8");
    await writeFile(join(root, "assets/preview.svg"), "<svg></svg>", "utf8");
    await writeFile(join(root, "assets/shell.html"), "{{ body }}", "utf8");
    await writeFile(join(root, "blocks/hero.html"), "<section>{{ children }}</section>", "utf8");

    const inspection = await inspectThemeArtifact(root);

    expect(inspection.preview).toBe("assets/preview.svg");
    expect(inspection.assets).toEqual({
      css: ["assets/base.css"],
      js: ["assets/script.js"],
      head: ["assets/head.html"],
      shell: "assets/shell.html"
    });
    expect(inspection.diagnostics).toEqual([]);
  });

  it("omits empty manifest asset references during artifact inspection", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-inspect-empty-assets-"));
    await mkdir(join(root, "blocks"), { recursive: true });
    await writeFile(
      join(root, "theme.json"),
      JSON.stringify(
        {
          name: "empty-assets",
          css: "",
          js: "",
          head: "",
          preview: "",
          shell: "",
          blocks: "blocks"
        },
        null,
        2
      ),
      "utf8"
    );
    await writeFile(join(root, "blocks/hero.html"), "<section>{{ children }}</section>", "utf8");

    const inspection = await inspectThemeArtifact(root);

    expect(inspection.preview).toBeUndefined();
    expect(inspection.assets).toEqual({
      css: [],
      js: [],
      head: []
    });
    expect(inspection.diagnostics).toEqual([]);
  });

  it("reports validation diagnostics when inspecting invalid artifacts", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-inspect-invalid-"));
    await mkdir(root, { recursive: true });
    await writeFile(
      join(root, "theme.json"),
      JSON.stringify(
        {
          name: "invalid",
          css: "missing.css",
          blocks: "blocks"
        },
        null,
        2
      ),
      "utf8"
    );

    const inspection = await inspectThemeArtifact(root);

    expect(inspection.name).toBe("invalid");
    expect(inspection.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "error",
        code: "missing-theme-file",
        field: "css",
        path: "missing.css"
      })
    );
  });

  it("deduplicates inspection capability lists while keeping duplicate diagnostics", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-inspect-duplicates-"));
    await mkdir(join(root, "blocks"), { recursive: true });
    await writeFile(
      join(root, "theme.json"),
      JSON.stringify(
        {
          name: "inspect-duplicates",
          supportedBlocks: ["hero", "card", "hero"],
          actions: ["toggle", "lead.submit", "toggle"],
          blocks: "blocks"
        },
        null,
        2
      ),
      "utf8"
    );
    await writeFile(join(root, "blocks/hero.html"), "<section>{{ children }}</section>", "utf8");

    const inspection = await inspectThemeArtifact(root);

    expect(inspection.supportedBlocks).toEqual(["hero", "card"]);
    expect(inspection.actions).toEqual(["toggle", "lead.submit"]);
    expect(inspection.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "warning",
        code: "duplicate-theme-supported-block",
        block: "hero"
      })
    );
    expect(inspection.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "warning",
        code: "duplicate-theme-action",
        field: "actions"
      })
    );
  });

  it("falls back to artifact directory names when inspecting artifacts with empty names", async () => {
    const parent = await mkdtemp(join(tmpdir(), "mds-theme-inspect-empty-name-"));
    const root = join(parent, "empty-name-artifact");
    await mkdir(join(root, "blocks"), { recursive: true });
    await writeFile(
      join(root, "theme.json"),
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
    await writeFile(join(root, "blocks/hero.html"), "<section>{{ children }}</section>", "utf8");

    const inspection = await inspectThemeArtifact(root);

    expect(inspection.name).toBe("empty-name-artifact");
    expect(inspection.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "warning",
        code: "empty-theme-name",
        field: "name"
      })
    );
  });

  it("uses artifact directory names when packing artifacts with empty names", async () => {
    const parent = await mkdtemp(join(tmpdir(), "mds-theme-pack-empty-name-"));
    const root = join(parent, "empty-name-packable");
    const packed = join(parent, "packed");
    await mkdir(join(root, "blocks"), { recursive: true });
    await writeFile(
      join(root, "theme.json"),
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
    await writeFile(join(root, "blocks/hero.html"), "<section>{{ children }}</section>", "utf8");

    const result = await packThemeArtifact(root, packed);

    expect(result.name).toBe("empty-name-packable");
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "warning",
        code: "empty-theme-name",
        field: "name"
      })
    );
  });

  it("adds build stage context when inspecting artifacts with unreadable manifests", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-inspect-unreadable-"));
    await writeFile(join(root, "theme.json"), "null", "utf8");

    await expect(inspectThemeArtifact(root)).rejects.toMatchObject({
      name: "ThemeBuildError",
      stage: "read-artifact",
      field: "theme artifact",
      filePath: root
    } satisfies Partial<ThemeBuildError>);
    await expect(inspectThemeArtifact(root)).rejects.toThrow("invalid-theme-manifest");
  });

  it("adds build stage context when inspecting packages with invalid artifact config", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-inspect-bad-package-"));
    await writeFile(
      join(root, "package.json"),
      JSON.stringify(
        {
          mdsTheme: {
            dist: 42
          }
        },
        null,
        2
      ),
      "utf8"
    );

    await expect(inspectThemeArtifact(root)).rejects.toMatchObject({
      name: "ThemeBuildError",
      stage: "resolve-artifact",
      field: "theme ref"
    } satisfies Partial<ThemeBuildError>);
    await expect(inspectThemeArtifact(root)).rejects.toThrow("mdsTheme.dist");
  });

  it("reports diagnostics for invalid build metadata during inspect", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-inspect-bad-metadata-"));
    await mkdir(join(root, "blocks"), { recursive: true });
    await writeFile(
      join(root, "theme.json"),
      JSON.stringify(
        {
          name: "bad-metadata",
          blocks: "blocks"
        },
        null,
        2
      ),
      "utf8"
    );
    await writeFile(join(root, "blocks/hero.html"), "<section>{{ children }}</section>", "utf8");
    await writeFile(join(root, ".mds-theme-build.json"), "{", "utf8");

    const inspection = await inspectThemeArtifact(root);

    expect(inspection.metadata).toBeUndefined();
    expect(inspection.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "warning",
        code: "invalid-theme-build-metadata",
        path: ".mds-theme-build.json"
      })
    );
  });

  it("reports diagnostics for invalid build metadata shape during inspect", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-inspect-bad-metadata-shape-"));
    await mkdir(join(root, "blocks"), { recursive: true });
    await writeFile(
      join(root, "theme.json"),
      JSON.stringify(
        {
          name: "bad-metadata-shape",
          blocks: "blocks"
        },
        null,
        2
      ),
      "utf8"
    );
    await writeFile(join(root, "blocks/hero.html"), "<section>{{ children }}</section>", "utf8");
    await writeFile(
      join(root, ".mds-theme-build.json"),
      JSON.stringify(
        {
          version: 1,
          source: "src/theme.tsx",
          output: "dist/theme",
          inputFiles: "package.json",
          artifactFiles: ["theme.json"],
          templates: []
        },
        null,
        2
      ),
      "utf8"
    );

    const inspection = await inspectThemeArtifact(root);

    expect(inspection.metadata).toBeUndefined();
    expect(inspection.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "warning",
        code: "invalid-theme-build-metadata",
        message: "Theme build metadata inputFiles must be a string array.",
        path: ".mds-theme-build.json"
      })
    );
  });

  it("reports diagnostics for duplicate package paths in build metadata during inspect", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-inspect-duplicate-metadata-inputs-"));
    await writeInspectableThemeArtifact(root, {
      version: 1,
      source: "src/theme.tsx",
      output: "dist/theme",
      inputFiles: ["package.json", "src/theme.tsx", "src/theme.tsx"],
      artifactFiles: ["theme.json", "blocks/hero.html"],
      templates: [
        {
          file: "blocks/hero.html",
          blocks: ["hero"]
        }
      ]
    });

    const inspection = await inspectThemeArtifact(root);

    expect(inspection.metadata).toBeUndefined();
    expect(inspection.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "warning",
        code: "invalid-theme-build-metadata",
        message: "Theme build metadata inputFiles must not contain duplicate paths: src/theme.tsx.",
        path: ".mds-theme-build.json"
      })
    );
  });

  it("reports diagnostics for duplicate artifact template metadata during inspect", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-inspect-duplicate-metadata-artifacts-"));
    await writeInspectableThemeArtifact(root, {
      version: 1,
      source: "src/theme.tsx",
      output: "dist/theme",
      inputFiles: ["package.json", "src/theme.tsx"],
      artifactFiles: ["theme.json", "blocks/hero.html", "blocks/hero.html"],
      templates: [
        {
          file: "blocks/hero.html",
          blocks: ["hero"]
        }
      ]
    });

    const inspection = await inspectThemeArtifact(root);

    expect(inspection.metadata).toBeUndefined();
    expect(inspection.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "warning",
        code: "invalid-theme-build-metadata",
        message: "Theme build metadata artifactFiles must not contain duplicate paths: blocks/hero.html.",
        path: ".mds-theme-build.json"
      })
    );
  });

  it("reports diagnostics for duplicate template files in build metadata during inspect", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-inspect-duplicate-metadata-templates-"));
    await writeInspectableThemeArtifact(root, {
      version: 1,
      source: "src/theme.tsx",
      output: "dist/theme",
      inputFiles: ["package.json", "src/theme.tsx"],
      artifactFiles: ["theme.json", "blocks/hero.html"],
      templates: [
        {
          file: "blocks/hero.html",
          blocks: ["hero"]
        },
        {
          file: "blocks/hero.html",
          blocks: ["hero"]
        }
      ]
    });

    const inspection = await inspectThemeArtifact(root);

    expect(inspection.metadata).toBeUndefined();
    expect(inspection.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "warning",
        code: "invalid-theme-build-metadata",
        message: "Theme build metadata templates.file must not contain duplicate paths: blocks/hero.html.",
        path: ".mds-theme-build.json"
      })
    );
  });

  it("reports diagnostics for duplicate template blocks in build metadata during inspect", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-inspect-duplicate-metadata-template-blocks-"));
    await writeInspectableThemeArtifact(root, {
      version: 1,
      source: "src/theme.tsx",
      output: "dist/theme",
      inputFiles: ["package.json", "src/theme.tsx"],
      artifactFiles: ["theme.json", "blocks/hero.html"],
      templates: [
        {
          file: "blocks/hero.html",
          blocks: ["hero", "hero"]
        }
      ]
    });

    const inspection = await inspectThemeArtifact(root);

    expect(inspection.metadata).toBeUndefined();
    expect(inspection.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "warning",
        code: "invalid-theme-build-metadata",
        message: "Theme build metadata templates.blocks must not contain duplicate blocks: hero.",
        path: ".mds-theme-build.json"
      })
    );
  });

  it("reports diagnostics for unsorted input files in build metadata during inspect", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-inspect-unsorted-metadata-inputs-"));
    await writeInspectableThemeArtifact(root, {
      version: 1,
      source: "src/theme.tsx",
      output: "dist/theme",
      inputFiles: ["src/theme.tsx", "package.json"],
      artifactFiles: ["theme.json", "blocks/hero.html"],
      templates: [
        {
          file: "blocks/hero.html",
          blocks: ["hero"]
        }
      ]
    });

    const inspection = await inspectThemeArtifact(root);

    expect(inspection.metadata).toBeUndefined();
    expect(inspection.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "warning",
        code: "invalid-theme-build-metadata",
        message: "Theme build metadata inputFiles must be sorted.",
        path: ".mds-theme-build.json"
      })
    );
  });

  it("reports diagnostics for unsorted artifact files in build metadata during inspect", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-inspect-unsorted-metadata-artifacts-"));
    await writeInspectableThemeArtifact(root, {
      version: 1,
      source: "src/theme.tsx",
      output: "dist/theme",
      inputFiles: ["package.json", "src/theme.tsx"],
      artifactFiles: ["blocks/hero.html", "theme.json"],
      templates: [
        {
          file: "blocks/hero.html",
          blocks: ["hero"]
        }
      ]
    });

    const inspection = await inspectThemeArtifact(root);

    expect(inspection.metadata).toBeUndefined();
    expect(inspection.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "warning",
        code: "invalid-theme-build-metadata",
        message: "Theme build metadata artifactFiles must be sorted with theme.json first.",
        path: ".mds-theme-build.json"
      })
    );
  });

  it("reports diagnostics for unsorted template files in build metadata during inspect", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-inspect-unsorted-metadata-templates-"));
    await writeInspectableThemeArtifact(root, {
      version: 1,
      source: "src/theme.tsx",
      output: "dist/theme",
      inputFiles: ["package.json", "src/theme.tsx"],
      artifactFiles: ["theme.json", "blocks/card.html", "blocks/hero.html"],
      templates: [
        {
          file: "blocks/hero.html",
          blocks: ["hero"]
        },
        {
          file: "blocks/card.html",
          blocks: ["card"]
        }
      ]
    });

    const inspection = await inspectThemeArtifact(root);

    expect(inspection.metadata).toBeUndefined();
    expect(inspection.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "warning",
        code: "invalid-theme-build-metadata",
        message: "Theme build metadata templates must be sorted by file.",
        path: ".mds-theme-build.json"
      })
    );
  });

  it("reports diagnostics for unsorted template blocks in build metadata during inspect", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-inspect-unsorted-metadata-template-blocks-"));
    await writeInspectableThemeArtifact(root, {
      version: 1,
      source: "src/theme.tsx",
      output: "dist/theme",
      inputFiles: ["package.json", "src/theme.tsx"],
      artifactFiles: ["theme.json", "blocks/hero.html"],
      templates: [
        {
          file: "blocks/hero.html",
          blocks: ["note", "hero"]
        }
      ]
    });

    const inspection = await inspectThemeArtifact(root);

    expect(inspection.metadata).toBeUndefined();
    expect(inspection.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "warning",
        code: "invalid-theme-build-metadata",
        message: "Theme build metadata templates.blocks must be sorted for blocks/hero.html.",
        path: ".mds-theme-build.json"
      })
    );
  });

  it("reports diagnostics for escaped package paths in build metadata during inspect", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-inspect-bad-metadata-package-path-"));
    await mkdir(join(root, "blocks"), { recursive: true });
    await writeFile(
      join(root, "theme.json"),
      JSON.stringify(
        {
          name: "bad-metadata-package-path",
          blocks: "blocks"
        },
        null,
        2
      ),
      "utf8"
    );
    await writeFile(join(root, "blocks/hero.html"), "<section>{{ children }}</section>", "utf8");
    await writeFile(
      join(root, ".mds-theme-build.json"),
      JSON.stringify(
        {
          version: 1,
          source: "../src/theme.tsx",
          output: "dist/theme",
          inputFiles: ["package.json", "src/theme.tsx"],
          artifactFiles: ["theme.json", "blocks/hero.html"],
          templates: [
            {
              file: "blocks/hero.html",
              blocks: ["hero"]
            }
          ]
        },
        null,
        2
      ),
      "utf8"
    );

    const inspection = await inspectThemeArtifact(root);

    expect(inspection.metadata).toBeUndefined();
    expect(inspection.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "warning",
        code: "invalid-theme-build-metadata",
        message: "Theme build metadata source cannot escape the package directory: ../src/theme.tsx.",
        path: ".mds-theme-build.json"
      })
    );
  });

  it("reports diagnostics for unsafe package paths in build metadata during inspect", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-inspect-unsafe-metadata-package-path-"));
    await mkdir(join(root, "blocks"), { recursive: true });
    await writeFile(
      join(root, "theme.json"),
      JSON.stringify(
        {
          name: "unsafe-metadata-package-path",
          blocks: "blocks"
        },
        null,
        2
      ),
      "utf8"
    );
    await writeFile(join(root, "blocks/hero.html"), "<section>{{ children }}</section>", "utf8");
    await writeFile(
      join(root, ".mds-theme-build.json"),
      JSON.stringify(
        {
          version: 1,
          source: "src\\theme.tsx",
          output: "dist/theme",
          inputFiles: ["package.json", "src/theme.tsx"],
          artifactFiles: ["theme.json", "blocks/hero.html"],
          templates: [
            {
              file: "blocks/hero.html",
              blocks: ["hero"]
            }
          ]
        },
        null,
        2
      ),
      "utf8"
    );

    const inspection = await inspectThemeArtifact(root);

    expect(inspection.metadata).toBeUndefined();
    expect(inspection.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "warning",
        code: "invalid-theme-build-metadata",
        message: "Theme build metadata source must be a relative POSIX path inside the package: src\\theme.tsx.",
        path: ".mds-theme-build.json"
      })
    );
  });

  it("reports diagnostics for non-canonical package paths in build metadata during inspect", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-inspect-noncanonical-metadata-package-path-"));
    await mkdir(join(root, "blocks"), { recursive: true });
    await writeFile(
      join(root, "theme.json"),
      JSON.stringify(
        {
          name: "noncanonical-metadata-package-path",
          blocks: "blocks"
        },
        null,
        2
      ),
      "utf8"
    );
    await writeFile(join(root, "blocks/hero.html"), "<section>{{ children }}</section>", "utf8");
    await writeFile(
      join(root, ".mds-theme-build.json"),
      JSON.stringify(
        {
          version: 1,
          source: "./src//./theme.tsx",
          output: "dist/theme",
          inputFiles: ["package.json", "src/theme.tsx"],
          artifactFiles: ["theme.json", "blocks/hero.html"],
          templates: [
            {
              file: "blocks/hero.html",
              blocks: ["hero"]
            }
          ]
        },
        null,
        2
      ),
      "utf8"
    );

    const inspection = await inspectThemeArtifact(root);

    expect(inspection.metadata).toBeUndefined();
    expect(inspection.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "warning",
        code: "invalid-theme-build-metadata",
        message: "Theme build metadata source must use a canonical package path: ./src//./theme.tsx -> src/theme.tsx.",
        path: ".mds-theme-build.json"
      })
    );
  });

  it("reports diagnostics for escaped artifact paths in build metadata during inspect", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-inspect-bad-metadata-artifact-path-"));
    await mkdir(join(root, "blocks"), { recursive: true });
    await writeFile(
      join(root, "theme.json"),
      JSON.stringify(
        {
          name: "bad-metadata-artifact-path",
          blocks: "blocks"
        },
        null,
        2
      ),
      "utf8"
    );
    await writeFile(join(root, "blocks/hero.html"), "<section>{{ children }}</section>", "utf8");
    await writeFile(
      join(root, ".mds-theme-build.json"),
      JSON.stringify(
        {
          version: 1,
          source: "src/theme.tsx",
          output: "dist/theme",
          inputFiles: ["package.json", "src/theme.tsx"],
          artifactFiles: ["theme.json", "../escape.css"],
          templates: [
            {
              file: "blocks/hero.html",
              blocks: ["hero"]
            }
          ]
        },
        null,
        2
      ),
      "utf8"
    );

    const inspection = await inspectThemeArtifact(root);

    expect(inspection.metadata).toBeUndefined();
    expect(inspection.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "warning",
        code: "invalid-theme-build-metadata",
        message: "Theme build metadata artifactFiles path cannot escape the artifact directory: ../escape.css.",
        path: ".mds-theme-build.json"
      })
    );
  });

  it("reports diagnostics for non-canonical artifact paths in build metadata during inspect", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-inspect-noncanonical-metadata-artifact-path-"));
    await mkdir(join(root, "blocks"), { recursive: true });
    await writeFile(
      join(root, "theme.json"),
      JSON.stringify(
        {
          name: "noncanonical-metadata-artifact-path",
          blocks: "blocks"
        },
        null,
        2
      ),
      "utf8"
    );
    await writeFile(join(root, "blocks/hero.html"), "<section>{{ children }}</section>", "utf8");
    await writeFile(
      join(root, ".mds-theme-build.json"),
      JSON.stringify(
        {
          version: 1,
          source: "src/theme.tsx",
          output: "dist/theme",
          inputFiles: ["package.json", "src/theme.tsx"],
          artifactFiles: ["theme.json", "blocks//./hero.html"],
          templates: [
            {
              file: "blocks/hero.html",
              blocks: ["hero"]
            }
          ]
        },
        null,
        2
      ),
      "utf8"
    );

    const inspection = await inspectThemeArtifact(root);

    expect(inspection.metadata).toBeUndefined();
    expect(inspection.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "warning",
        code: "invalid-theme-build-metadata",
        message: "Theme build metadata artifactFiles path must be canonical: blocks//./hero.html -> blocks/hero.html.",
        path: ".mds-theme-build.json"
      })
    );
  });

  it("reports diagnostics for unsafe artifact paths in build metadata during inspect", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-inspect-unsafe-metadata-artifact-path-"));
    await mkdir(join(root, "blocks"), { recursive: true });
    await writeFile(
      join(root, "theme.json"),
      JSON.stringify(
        {
          name: "unsafe-metadata-artifact-path",
          blocks: "blocks"
        },
        null,
        2
      ),
      "utf8"
    );
    await writeFile(join(root, "blocks/hero.html"), "<section>{{ children }}</section>", "utf8");
    await writeFile(
      join(root, ".mds-theme-build.json"),
      JSON.stringify(
        {
          version: 1,
          source: "src/theme.tsx",
          output: "dist/theme",
          inputFiles: ["package.json", "src/theme.tsx"],
          artifactFiles: ["theme.json", "blocks\\hero.html"],
          templates: [
            {
              file: "blocks/hero.html",
              blocks: ["hero"]
            }
          ]
        },
        null,
        2
      ),
      "utf8"
    );

    const inspection = await inspectThemeArtifact(root);

    expect(inspection.metadata).toBeUndefined();
    expect(inspection.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "warning",
        code: "invalid-theme-build-metadata",
        message: "Theme build metadata artifactFiles path must be a relative POSIX artifact path: blocks\\hero.html.",
        path: ".mds-theme-build.json"
      })
    );
  });

  it("reports diagnostics for development metadata paths in build metadata artifact files", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-inspect-development-metadata-artifact-path-"));
    await writeInspectableThemeArtifact(root, {
      version: 1,
      source: "src/theme.tsx",
      output: "dist/theme",
      inputFiles: ["package.json", "src/theme.tsx"],
      artifactFiles: ["theme.json", "blocks/hero.html", ".mds-theme-build.json"],
      templates: [
        {
          file: "blocks/hero.html",
          blocks: ["hero"]
        }
      ]
    });

    const inspection = await inspectThemeArtifact(root);

    expect(inspection.metadata).toBeUndefined();
    expect(inspection.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "warning",
        code: "invalid-theme-build-metadata",
        message:
          "Theme build metadata artifactFiles path must not reference development metadata: .mds-theme-build.json.",
        path: ".mds-theme-build.json"
      })
    );
  });

  it("reports diagnostics for development metadata paths in build metadata template files", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-inspect-development-metadata-template-path-"));
    await writeInspectableThemeArtifact(root, {
      version: 1,
      source: "src/theme.tsx",
      output: "dist/theme",
      inputFiles: ["package.json", "src/theme.tsx"],
      artifactFiles: ["theme.json", "blocks/hero.html"],
      templates: [
        {
          file: ".mds-theme-build.json",
          blocks: ["hero"]
        }
      ]
    });

    const inspection = await inspectThemeArtifact(root);

    expect(inspection.metadata).toBeUndefined();
    expect(inspection.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "warning",
        code: "invalid-theme-build-metadata",
        message:
          "Theme build metadata templates.file path must not reference development metadata: .mds-theme-build.json.",
        path: ".mds-theme-build.json"
      })
    );
  });

  it("accepts current-directory output paths in build metadata during inspect", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-inspect-current-output-metadata-"));
    await mkdir(join(root, "blocks"), { recursive: true });
    await writeFile(
      join(root, "theme.json"),
      JSON.stringify(
        {
          name: "current-output-metadata",
          blocks: "blocks"
        },
        null,
        2
      ),
      "utf8"
    );
    await writeFile(join(root, "blocks/hero.html"), "<section>{{ children }}</section>", "utf8");
    await writeFile(
      join(root, ".mds-theme-build.json"),
      JSON.stringify(
        {
          version: 1,
          source: "src/theme.tsx",
          output: ".",
          inputFiles: ["package.json", "src/theme.tsx"],
          artifactFiles: ["theme.json", "blocks/hero.html"],
          templates: [
            {
              file: "blocks/hero.html",
              blocks: ["hero"]
            }
          ]
        },
        null,
        2
      ),
      "utf8"
    );

    const inspection = await inspectThemeArtifact(root);

    expect(inspection.metadata).toMatchObject({
      version: 1,
      source: "src/theme.tsx",
      output: "."
    });
    expect(inspection.diagnostics).toEqual([]);
  });

  it("reports diagnostics for non-canonical current-directory output paths in build metadata during inspect", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-inspect-current-output-noncanonical-metadata-"));
    await writeInspectableThemeArtifact(root, {
      version: 1,
      source: "src/theme.tsx",
      output: "./.",
      inputFiles: ["package.json", "src/theme.tsx"],
      artifactFiles: ["theme.json", "blocks/hero.html"],
      templates: [
        {
          file: "blocks/hero.html",
          blocks: ["hero"]
        }
      ]
    });

    const inspection = await inspectThemeArtifact(root);

    expect(inspection.metadata).toBeUndefined();
    expect(inspection.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "warning",
        code: "invalid-theme-build-metadata",
        message: "Theme build metadata output must use a canonical package path: ./. -> .",
        path: ".mds-theme-build.json"
      })
    );
  });

  it("reports diagnostics for stale build metadata during inspect", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-inspect-stale-metadata-"));
    await mkdir(join(root, "blocks"), { recursive: true });
    await writeFile(
      join(root, "theme.json"),
      JSON.stringify(
        {
          name: "stale-metadata",
          blocks: "blocks"
        },
        null,
        2
      ),
      "utf8"
    );
    await writeFile(join(root, "blocks/hero.html"), "<section>{{ children }}</section>", "utf8");
    await writeFile(
      join(root, ".mds-theme-build.json"),
      JSON.stringify(
        {
          version: 1,
          source: "src/theme.tsx",
          output: "dist/theme",
          inputFiles: ["package.json", "src/theme.tsx"],
          artifactFiles: ["theme.json"],
          templates: []
        },
        null,
        2
      ),
      "utf8"
    );

    const inspection = await inspectThemeArtifact(root);

    expect(inspection.metadata).toMatchObject({
      version: 1,
      source: "src/theme.tsx",
      output: "dist/theme"
    });
    expect(inspection.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "warning",
        code: "stale-theme-build-metadata",
        message: "Theme build metadata artifactFiles do not match the current artifact files.",
        path: ".mds-theme-build.json"
      })
    );
    expect(inspection.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "warning",
        code: "stale-theme-build-metadata",
        message: "Theme build metadata templates do not match the current block templates.",
        path: ".mds-theme-build.json"
      })
    );
  });

  it("runs shared theme CLI commands with injected IO", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-cli-runner-"));
    await writeThemeSource(root, {
      manifest: {
        name: "cli-runner",
        blocks: "blocks"
      },
      files: {
        "blocks/hero.html": "<section>{{ children }}</section>"
      }
    });
    const stdout: string[] = [];
    const stderr: string[] = [];

    const result = await runThemeCli(["inspect", "."], {
      cwd: root,
      stdout: {
        log(value: string) {
          stdout.push(value);
        }
      },
      stderr: {
        error(value: string) {
          stderr.push(value);
        }
      }
    });

    expect(result.exitCode).toBe(0);
    expect(stdout).toContain("MDS theme: cli-runner");
    expect(stdout).toContain("Blocks: hero");
    expect(stderr).toEqual([]);

    const missingOutput = await runThemeCli(["pack", "."], {
      cwd: root,
      commandName: "mds theme",
      stderr: {
        error(value: string) {
          stderr.push(value);
        }
      }
    });

    expect(missingOutput.exitCode).toBe(1);
    expect(stderr).toContain("Usage: mds theme pack <theme-package-or-artifact> <output-directory>");

    const invalidRoot = await mkdtemp(join(tmpdir(), "mds-theme-cli-invalid-"));
    await writeFile(
      join(invalidRoot, "theme.json"),
      JSON.stringify(
        {
          name: "cli-invalid",
          css: "missing.css"
        },
        null,
        2
      ),
      "utf8"
    );
    const invalidInspection = await runThemeCli(["inspect", invalidRoot], {
      stdout: {
        log(value: string) {
          stdout.push(value);
        }
      },
      stderr: {
        error(value: string) {
          stderr.push(value);
        }
      }
    });

    expect(invalidInspection.exitCode).toBe(1);
    expect(stderr).toContain(
      "ERROR missing-theme-file: Theme css file is missing: missing.css. (field=css, path=missing.css)"
    );
  });

  it("prints inspect results as JSON for tooling", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-cli-json-inspect-"));
    await writeThemeSource(root, {
      manifest: {
        name: "cli-json",
        label: "CLI JSON",
        preview: "./preview.svg",
        blocks: "blocks"
      },
      files: {
        "preview.svg": "<svg></svg>",
        "blocks/hero.html": "<section>{{ children }}</section>"
      }
    });
    const stdout: string[] = [];
    const stderr: string[] = [];

    const result = await runThemeCli(["inspect", ".", "--json"], {
      cwd: root,
      stdout: {
        log(value: string) {
          stdout.push(value);
        }
      },
      stderr: {
        error(value: string) {
          stderr.push(value);
        }
      }
    });
    const inspection = JSON.parse(stdout[0] ?? "{}") as {
      name: string;
      label: string;
      preview: string;
      blocks: string[];
      runtimeFiles: string[];
      diagnostics: unknown[];
    };

    expect(result.exitCode).toBe(0);
    expect(stdout).toHaveLength(1);
    expect(inspection.name).toBe("cli-json");
    expect(inspection.label).toBe("CLI JSON");
    expect(inspection.preview).toBe("preview.svg");
    expect(inspection.blocks).toEqual(["hero"]);
    expect(inspection.runtimeFiles).toEqual(["theme.json", "blocks/hero.html", "preview.svg"]);
    expect(inspection.diagnostics).toEqual([]);
    expect(stderr).toEqual([]);
  });

  it("prints inspect failures as JSON diagnostics for tooling", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-cli-json-inspect-error-"));
    await writeFile(join(root, "theme.json"), "{", "utf8");
    const stdout: string[] = [];
    const stderr: string[] = [];

    const result = await runThemeCli(["inspect", ".", "--json"], {
      cwd: root,
      stdout: {
        log(value: string) {
          stdout.push(value);
        }
      },
      stderr: {
        error(value: string) {
          stderr.push(value);
        }
      }
    });
    const output = JSON.parse(stdout[0] ?? "{}") as {
      diagnostics: Array<{
        severity: string;
        code: string;
        stage?: string;
        field?: string;
      }>;
    };

    expect(result.exitCode).toBe(1);
    expect(stdout).toHaveLength(1);
    expect(output.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "error",
        code: "theme-build-error",
        stage: "read-artifact",
        field: "theme artifact"
      })
    );
    expect(output.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "error",
        code: "invalid-theme-manifest",
        stage: "read-artifact",
        field: "theme.json"
      })
    );
    expect(stderr).toEqual([]);
  });

  it("prints build results as JSON for tooling", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-cli-json-build-"));
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(
      join(root, "package.json"),
      JSON.stringify(
        {
          type: "module",
          mdsTheme: {
            source: "./src/theme.ts",
            dist: "./dist/theme"
          }
        },
        null,
        2
      ),
      "utf8"
    );
    await writeFile(
      join(root, "src/theme.ts"),
      `import { Content, defineJsxTheme, jsx, Root } from "${join(process.cwd(), "../theme-loader/src/jsx.js")}";
export default defineJsxTheme({
  name: "json-build",
  blocks: {
    hero: (block) => jsx(Root, { block, className: "hero" }, jsx(Content, { block }))
  }
});`,
      "utf8"
    );
    const stdout: string[] = [];
    const stderr: string[] = [];

    const result = await runThemeCli(["build", ".", "--json"], {
      cwd: root,
      stdout: {
        log(value: string) {
          stdout.push(value);
        }
      },
      stderr: {
        error(value: string) {
          stderr.push(value);
        }
      }
    });
    const output = JSON.parse(stdout[0] ?? "{}") as {
      outputDirectory: string;
      sourcePath: string;
      filesWritten: string[];
      diagnostics: unknown[];
      metadataPath?: string;
    };

    expect(result.exitCode).toBe(0);
    expect(stdout).toHaveLength(1);
    expect(output.outputDirectory).toBe(join(root, "dist/theme"));
    expect(output.sourcePath).toBe(join(root, "src/theme.ts"));
    expect(output.filesWritten).toEqual(
      expect.arrayContaining(["theme.json", "blocks/hero.html", ".mds-theme-build.json"])
    );
    expect(output.diagnostics).toEqual([]);
    expect(output.metadataPath).toBe(".mds-theme-build.json");
    expect(stderr).toEqual([]);
  });

  it("prints build failures as JSON diagnostics for tooling", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-cli-json-build-error-"));
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(
      join(root, "package.json"),
      JSON.stringify(
        {
          type: "module",
          mdsTheme: {
            source: "./src/theme.ts",
            assets: {
              css: "./src/missing.css"
            }
          }
        },
        null,
        2
      ),
      "utf8"
    );
    await writeFile(
      join(root, "src/theme.ts"),
      `import { Content, defineJsxTheme, jsx, Root } from "${join(process.cwd(), "../theme-loader/src/jsx.js")}";
export default defineJsxTheme({
  name: "json-build-error",
  blocks: {
    hero: (block) => jsx(Root, { block, className: "hero" }, jsx(Content, { block }))
  }
});`,
      "utf8"
    );
    const stdout: string[] = [];
    const stderr: string[] = [];

    const result = await runThemeCli(["build", ".", "--json"], {
      cwd: root,
      stdout: {
        log(value: string) {
          stdout.push(value);
        }
      },
      stderr: {
        error(value: string) {
          stderr.push(value);
        }
      }
    });
    const output = JSON.parse(stdout[0] ?? "{}") as {
      diagnostics: Array<{
        severity: string;
        code: string;
        stage?: string;
        field?: string;
      }>;
    };

    expect(result.exitCode).toBe(1);
    expect(stdout).toHaveLength(1);
    expect(output.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "error",
        code: "theme-build-error",
        stage: "merge-assets",
        field: "mdsTheme.assets.css"
      })
    );
    expect(stderr).toEqual([]);
  });

  it("prints structured builder diagnostics from CLI build failures", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-cli-build-error-"));
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(
      join(root, "package.json"),
      JSON.stringify(
        {
          type: "module",
          mdsTheme: {
            source: "./src/theme.ts",
            assets: {
              css: "./src/missing.css"
            }
          }
        },
        null,
        2
      ),
      "utf8"
    );
    await writeFile(
      join(root, "src/theme.ts"),
      `import { Content, defineJsxTheme, jsx, Root } from "${join(process.cwd(), "../theme-loader/src/jsx.js")}";
export default defineJsxTheme({
  name: "cli-build-error",
  blocks: {
    hero: (block) => jsx(Root, { block, className: "hero" }, jsx(Content, { block }))
  }
});`,
      "utf8"
    );
    const stderr: string[] = [];

    const result = await runThemeCli(["build", "."], {
      cwd: root,
      stderr: {
        error(value: string) {
          stderr.push(value);
        }
      }
    });

    expect(result.exitCode).toBe(1);
    expect(stderr).toContainEqual(
      expect.stringContaining("ERROR theme-build-error:")
    );
    expect(stderr).toContainEqual(expect.stringContaining(join(root, "src/missing.css")));
    expect(stderr).toContainEqual(
      expect.stringContaining(`stage=merge-assets, field=mdsTheme.assets.css, path=${join(root, "src/missing.css")}`)
    );
  });

  it("prints inspect metadata and packs clean artifacts through the shared CLI", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-cli-distribution-"));
    const packed = join(root, "packed");
    await mkdir(join(root, "src/assets"), { recursive: true });
    await writeFile(
      join(root, "package.json"),
      JSON.stringify(
        {
          type: "module",
          mdsTheme: {
            source: "./src/theme.ts",
            dist: "./dist/theme",
            assets: {
              css: "./src/assets/style.css"
            }
          }
        },
        null,
        2
      ),
      "utf8"
    );
    await writeFile(join(root, "src/assets/style.css"), ".hero{color:red}", "utf8");
    await writeFile(
      join(root, "src/theme.ts"),
      `import { Content, defineJsxTheme, jsx, Root } from "${join(process.cwd(), "../theme-loader/src/jsx.js")}";
export default defineJsxTheme({
  name: "cli-distribution",
  blocks: {
    hero: (block) => jsx(Root, { block, className: "hero" }, jsx(Content, { block }))
  }
});`,
      "utf8"
    );
    await buildPackageTheme(root);
    await writeFile(join(root, "src/theme.ts"), "throw new Error('source should not load during CLI inspect or pack');", "utf8");
    const stdout: string[] = [];
    const stderr: string[] = [];

    const inspectResult = await runThemeCli(["inspect", "."], {
      cwd: root,
      stdout: {
        log(value: string) {
          stdout.push(value);
        }
      },
      stderr: {
        error(value: string) {
          stderr.push(value);
        }
      }
    });

    expect(inspectResult.exitCode).toBe(0);
    expect(stdout).toContain("MDS theme: cli-distribution");
    expect(stdout).toContain("Development files: .mds-theme-build.json");
    expect(stdout).toContain("Build metadata: src/theme.ts -> dist/theme");
    expect(stdout).toContain("Build inputs: package.json, src/assets/style.css, src/theme.ts");
    expect(stderr).toEqual([]);

    stdout.length = 0;
    const packResult = await runThemeCli(["pack", ".", packed], {
      cwd: root,
      stdout: {
        log(value: string) {
          stdout.push(value);
        }
      },
      stderr: {
        error(value: string) {
          stderr.push(value);
        }
      }
    });

    expect(packResult.exitCode).toBe(0);
    expect(stdout).toContain("Packed MDS theme cli-distribution from dist/theme -> packed (3 files)");
    expect(stderr).toEqual([]);
    await expect(readJson(join(packed, "theme.json"))).resolves.toMatchObject({
      version: 1,
      name: "cli-distribution"
    });
    await expect(readFile(join(packed, ".mds-theme-build.json"), "utf8")).rejects.toThrow();
  });

  it("prints pack results as JSON for tooling", async () => {
    const parent = await mkdtemp(join(tmpdir(), "mds-theme-cli-json-pack-"));
    const root = join(parent, "artifact");
    const packed = join(parent, "packed");
    await writeThemeSource(root, {
      manifest: {
        name: "json-pack",
        blocks: "blocks"
      },
      files: {
        "blocks/hero.html": "<section>{{ children }}</section>",
        ".mds-theme-build.json": "{}"
      }
    });
    const stdout: string[] = [];
    const stderr: string[] = [];

    const result = await runThemeCli(["pack", ".", packed, "--json"], {
      cwd: root,
      stdout: {
        log(value: string) {
          stdout.push(value);
        }
      },
      stderr: {
        error(value: string) {
          stderr.push(value);
        }
      }
    });
    const output = JSON.parse(stdout[0] ?? "{}") as {
      name: string;
      outputDirectory: string;
      filesWritten: string[];
      diagnostics: unknown[];
    };

    expect(result.exitCode).toBe(0);
    expect(stdout).toHaveLength(1);
    expect(output.name).toBe("json-pack");
    expect(output.outputDirectory).toBe(packed);
    expect(output.filesWritten).toHaveLength(2);
    expect(output.filesWritten).toEqual(expect.arrayContaining(["theme.json", "blocks/hero.html"]));
    expect(output.diagnostics).toEqual([]);
    expect(stderr).toEqual([]);
    await expect(readFile(join(packed, ".mds-theme-build.json"), "utf8")).rejects.toThrow();
  });

  it("prints pack failures as JSON diagnostics for tooling", async () => {
    const parent = await mkdtemp(join(tmpdir(), "mds-theme-cli-json-pack-error-"));
    const root = join(parent, "artifact");
    const packed = join(parent, "packed");
    await mkdir(root, { recursive: true });
    await writeFile(
      join(root, "theme.json"),
      JSON.stringify(
        {
          name: "invalid-json-pack",
          css: "missing.css"
        },
        null,
        2
      ),
      "utf8"
    );
    const stdout: string[] = [];
    const stderr: string[] = [];

    const result = await runThemeCli(["pack", root, packed, "--json"], {
      stdout: {
        log(value: string) {
          stdout.push(value);
        }
      },
      stderr: {
        error(value: string) {
          stderr.push(value);
        }
      }
    });
    const output = JSON.parse(stdout[0] ?? "{}") as {
      diagnostics: Array<{
        severity: string;
        code: string;
        stage?: string;
        field?: string;
      }>;
    };

    expect(result.exitCode).toBe(1);
    expect(stdout).toHaveLength(1);
    expect(output.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "error",
        code: "theme-build-error",
        stage: "validate-artifact",
        field: "theme artifact"
      })
    );
    expect(output.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "error",
        code: "missing-theme-file",
        stage: "validate-artifact",
        field: "css"
      })
    );
    expect(stderr).toEqual([]);
  });

  it("packs built theme artifacts without development metadata", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-pack-"));
    const packed = await mkdtemp(join(tmpdir(), "mds-theme-packed-"));
    await mkdir(join(root, "src/assets"), { recursive: true });
    await writeFile(
      join(root, "package.json"),
      JSON.stringify(
        {
          type: "module",
          mdsTheme: {
            source: "./src/theme.ts",
            dist: "./dist/theme",
            assets: {
              css: "./src/assets/style.css",
              preview: "./src/assets/preview.svg"
            }
          }
        },
        null,
        2
      ),
      "utf8"
    );
    await writeFile(join(root, "src/assets/style.css"), ".hero{color:red}", "utf8");
    await writeFile(join(root, "src/assets/preview.svg"), "<svg></svg>", "utf8");
    await writeFile(
      join(root, "src/theme.ts"),
      `import { Content, defineJsxTheme, jsx, Root } from "${join(process.cwd(), "../theme-loader/src/jsx.js")}";
export default defineJsxTheme({
  name: "packable",
  preview: "assets/preview.svg",
  blocks: {
    hero: (block) => jsx(Root, { block, className: "hero" }, jsx(Content, { block }))
  }
});`,
      "utf8"
    );
    await buildPackageTheme(root);
    await writeFile(join(root, "src/theme.ts"), "throw new Error('source should not load during pack');", "utf8");

    const result = await packThemeArtifact(root, packed);

    expect(result.name).toBe("packable");
    expect(result.artifactDirectory).toBe(join(root, "dist/theme"));
    expect(result.outputDirectory).toBe(packed);
    expect(result.filesWritten).toContain("theme.json");
    expect(result.filesWritten).toContain("blocks/hero.html");
    expect(result.filesWritten).toContain("assets/style.css");
    expect(result.filesWritten).toContain("assets/preview.svg");
    expect(result.filesWritten).not.toContain(".mds-theme-build.json");
    await expect(readJson(join(packed, "theme.json"))).resolves.toMatchObject({
      version: 1,
      name: "packable"
    });
    await expect(readFile(join(packed, ".mds-theme-build.json"), "utf8")).rejects.toThrow();
  });

  it("rejects pack outputs that overlap the source artifact", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-pack-overlap-"));
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(
      join(root, "package.json"),
      JSON.stringify(
        {
          type: "module",
          mdsTheme: {
            source: "./src/theme.ts",
            dist: "./dist/theme"
          }
        },
        null,
        2
      ),
      "utf8"
    );
    await writeFile(
      join(root, "src/theme.ts"),
      `import { Content, defineJsxTheme, jsx, Root } from "${join(process.cwd(), "../theme-loader/src/jsx.js")}";
export default defineJsxTheme({
  name: "overlap",
  blocks: {
    hero: (block) => jsx(Root, { block, className: "hero" }, jsx(Content, { block }))
  }
});`,
      "utf8"
    );
    await buildPackageTheme(root);

    await expect(packThemeArtifact(root, root)).rejects.toMatchObject({
      name: "ThemeBuildError",
      stage: "write-artifact",
      field: "outputDirectory",
      filePath: root
    } satisfies Partial<ThemeBuildError>);
    await expect(packThemeArtifact(root, root)).rejects.toThrow("must not overlap");
    await expect(packThemeArtifact(root, join(root, "dist/theme"))).rejects.toThrow("must not overlap");
    await expect(packThemeArtifact(root, join(root, "dist/theme/packed"))).rejects.toThrow("must not overlap");
  });

  it("adds build stage context when packing invalid artifacts", async () => {
    const parent = await mkdtemp(join(tmpdir(), "mds-theme-pack-invalid-"));
    const root = join(parent, "artifact");
    const packed = join(parent, "packed");
    await mkdir(root, { recursive: true });
    await writeFile(
      join(root, "theme.json"),
      JSON.stringify(
        {
          name: "invalid-pack",
          css: "missing.css"
        },
        null,
        2
      ),
      "utf8"
    );

    await expect(packThemeArtifact(root, packed)).rejects.toMatchObject({
      name: "ThemeBuildError",
      stage: "validate-artifact",
      field: "theme artifact",
      filePath: root
    } satisfies Partial<ThemeBuildError>);
    await expect(packThemeArtifact(root, packed)).rejects.toThrow("missing.css");
  });

  it("returns validation warnings without blocking artifact output", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-validation-warning-"));
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(
      join(root, "package.json"),
      JSON.stringify(
        {
          type: "module",
          mdsTheme: {
            source: "./src/theme.ts",
            dist: "./dist/theme"
          }
        },
        null,
        2
      ),
      "utf8"
    );
    await writeFile(
      join(root, "src/theme.ts"),
      `import { Content, defineJsxTheme, jsx, Root } from "${join(process.cwd(), "../theme-loader/src/jsx.js")}";
export default defineJsxTheme({
  name: "warning-theme",
  actions: ["bad action"],
  blocks: {
    hero: (block) => jsx(Root, { block, className: "hero" }, jsx(Content, { block }))
  }
});`,
      "utf8"
    );

    const result = await buildPackageTheme(root);

    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        severity: "warning",
        code: "invalid-theme-action-name"
      })
    );
    await expect(readFile(join(root, "dist/theme/theme.json"), "utf8")).resolves.toContain('"name": "warning-theme"');
  });

  it("fails before writing artifacts when generated source has validation errors", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-validation-error-"));
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(
      join(root, "package.json"),
      JSON.stringify(
        {
          type: "module",
          mdsTheme: {
            source: "./src/theme.ts",
            dist: "./dist/theme"
          }
        },
        null,
        2
      ),
      "utf8"
    );
    await writeFile(
      join(root, "src/theme.ts"),
      `import { Content, defineJsxTheme, jsx, Root } from "${join(process.cwd(), "../theme-loader/src/jsx.js")}";
export default defineJsxTheme({
  name: "invalid-theme",
  actions: [123],
  blocks: {
    hero: (block) => jsx(Root, { block, className: "hero" }, jsx(Content, { block }))
  }
});`,
      "utf8"
    );

    await expect(buildPackageTheme(root)).rejects.toMatchObject({
      name: "ThemeBuildError",
      stage: "validate-artifact",
      field: "generated theme artifact",
      filePath: join(root, "src/theme.ts")
    } satisfies Partial<ThemeBuildError>);
    await expect(readFile(join(root, "dist/theme/theme.json"), "utf8")).rejects.toThrow();
  });

  it("reports invalid source default exports during load-source", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-invalid-source-default-"));
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(
      join(root, "package.json"),
      JSON.stringify(
        {
          type: "module",
          mdsTheme: {
            source: "./src/theme.ts",
            dist: "./dist/theme"
          }
        },
        null,
        2
      ),
      "utf8"
    );
    await writeFile(
      join(root, "src/theme.ts"),
      `export default {
  name: "invalid-default",
  blocks: {
    hero: "not a component"
  }
};`,
      "utf8"
    );

    await expect(buildPackageTheme(root)).rejects.toMatchObject({
      name: "ThemeBuildError",
      stage: "load-source",
      field: "mdsTheme.source",
      filePath: join(root, "src/theme.ts")
    } satisfies Partial<ThemeBuildError>);
    await expect(buildPackageTheme(root)).rejects.toThrow(
      "Theme source must export a default ThemeSourceInput or JSX theme definition"
    );
  });

  it("reports the block name when JSX source block rendering fails", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-failing-source-block-"));
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(
      join(root, "package.json"),
      JSON.stringify(
        {
          type: "module",
          mdsTheme: {
            source: "./src/theme.ts",
            dist: "./dist/theme"
          }
        },
        null,
        2
      ),
      "utf8"
    );
    await writeFile(
      join(root, "src/theme.ts"),
      `import { defineJsxTheme } from "${join(process.cwd(), "../theme-loader/src/jsx.js")}";
export default defineJsxTheme({
  name: "failing-block",
  blocks: {
    hero: () => {
      throw new Error("boom");
    }
  }
});`,
      "utf8"
    );

    try {
      await buildPackageTheme(root);
      throw new Error("Expected build to fail.");
    } catch (error) {
      expect(error).toMatchObject({
        name: "ThemeBuildError",
        stage: "load-source",
        field: "mdsTheme.source",
        filePath: join(root, "src/theme.ts"),
        block: "hero"
      } satisfies Partial<ThemeBuildError>);
      expect(themeBuildErrorToDiagnostics(error)).toEqual([
        expect.objectContaining({
          severity: "error",
          code: "theme-build-error",
          stage: "load-source",
          field: "mdsTheme.source",
          path: join(root, "src/theme.ts"),
          block: "hero"
        })
      ]);
    }
  });

  it("reports invalid package source config during read-config", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-invalid-source-config-"));
    await writeFile(
      join(root, "package.json"),
      JSON.stringify(
        {
          type: "module",
          mdsTheme: {
            source: 123
          }
        },
        null,
        2
      ),
      "utf8"
    );

    await expect(buildPackageTheme(root)).rejects.toMatchObject({
      name: "ThemeBuildError",
      stage: "read-config",
      field: "mdsTheme.source",
      filePath: join(root, "package.json")
    } satisfies Partial<ThemeBuildError>);
    await expect(buildPackageTheme(root)).rejects.toThrow("mdsTheme.source must be a string");
  });

  it("reports non-object package.json during read-package", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-invalid-package-json-shape-"));
    await writeFile(join(root, "package.json"), JSON.stringify(["not", "an", "object"]), "utf8");

    await expect(buildPackageTheme(root)).rejects.toMatchObject({
      name: "ThemeBuildError",
      stage: "read-package",
      filePath: join(root, "package.json")
    } satisfies Partial<ThemeBuildError>);
    await expect(buildPackageTheme(root)).rejects.toThrow("Theme package.json must be a JSON object.");
  });

  it("reports malformed package.json during read-package", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-malformed-package-json-"));
    await writeFile(join(root, "package.json"), "{", "utf8");

    await expect(buildPackageTheme(root)).rejects.toMatchObject({
      name: "ThemeBuildError",
      stage: "read-package",
      filePath: join(root, "package.json")
    } satisfies Partial<ThemeBuildError>);
    await expect(buildPackageTheme(root)).rejects.toThrow("Theme package.json cannot be parsed:");
  });

  it("reports missing package.json during read-package", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-missing-package-json-"));

    await expect(buildPackageTheme(root)).rejects.toMatchObject({
      name: "ThemeBuildError",
      stage: "read-package",
      filePath: join(root, "package.json")
    } satisfies Partial<ThemeBuildError>);
    await expect(buildPackageTheme(root)).rejects.toThrow("Theme package must include package.json.");
  });

  it("reports invalid package dist paths during read-config", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-invalid-dist-config-"));
    await writeFile(
      join(root, "package.json"),
      JSON.stringify(
        {
          type: "module",
          mdsTheme: {
            dist: "../outside"
          }
        },
        null,
        2
      ),
      "utf8"
    );

    await expect(buildPackageTheme(root)).rejects.toMatchObject({
      name: "ThemeBuildError",
      stage: "read-config",
      field: "mdsTheme.dist",
      filePath: join(root, "package.json")
    } satisfies Partial<ThemeBuildError>);
    await expect(buildPackageTheme(root)).rejects.toThrow("mdsTheme.dist cannot escape the theme package directory");
  });

  it("rejects current-directory package source paths during read-config", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-current-source-config-"));
    await writeFile(
      join(root, "package.json"),
      JSON.stringify(
        {
          type: "module",
          mdsTheme: {
            source: "."
          }
        },
        null,
        2
      ),
      "utf8"
    );

    await expect(buildPackageTheme(root)).rejects.toMatchObject({
      name: "ThemeBuildError",
      stage: "read-config",
      field: "mdsTheme.source",
      filePath: join(root, "package.json")
    } satisfies Partial<ThemeBuildError>);
    await expect(buildPackageTheme(root)).rejects.toThrow(
      "mdsTheme.source must point to a file inside the theme package: ."
    );
  });

  it("reports invalid package asset config during read-config", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-invalid-assets-config-"));
    await writeFile(
      join(root, "package.json"),
      JSON.stringify(
        {
          type: "module",
          mdsTheme: {
            assets: {
              css: ["./src/style.css", 123]
            }
          }
        },
        null,
        2
      ),
      "utf8"
    );

    await expect(buildPackageTheme(root)).rejects.toMatchObject({
      name: "ThemeBuildError",
      stage: "read-config",
      field: "mdsTheme.assets.css",
      filePath: join(root, "package.json")
    } satisfies Partial<ThemeBuildError>);
    await expect(buildPackageTheme(root)).rejects.toThrow("mdsTheme.assets.css must be a string or string array");
  });

  it("reports invalid package pipeline config during read-config", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-invalid-pipeline-config-"));
    await writeFile(
      join(root, "package.json"),
      JSON.stringify(
        {
          type: "module",
          mdsTheme: {
            pipeline: {
              css: "unknown"
            }
          }
        },
        null,
        2
      ),
      "utf8"
    );

    await expect(buildPackageTheme(root)).rejects.toMatchObject({
      name: "ThemeBuildError",
      stage: "read-config",
      field: "mdsTheme.pipeline.css",
      filePath: join(root, "package.json")
    } satisfies Partial<ThemeBuildError>);
    await expect(buildPackageTheme(root)).rejects.toThrow('mdsTheme.pipeline.css must be "esbuild" or "tailwind"');
  });

  it("rejects current-directory package asset paths during merge-assets", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-current-asset-config-"));
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(
      join(root, "package.json"),
      JSON.stringify(
        {
          type: "module",
          mdsTheme: {
            source: "./src/theme.ts",
            assets: {
              css: "."
            }
          }
        },
        null,
        2
      ),
      "utf8"
    );
    await writeFile(
      join(root, "src/theme.ts"),
      `import { Content, defineJsxTheme, jsx, Root } from "${join(process.cwd(), "../theme-loader/src/jsx.js")}";
export default defineJsxTheme({
  name: "current-asset",
  blocks: {
    hero: (block) => jsx(Root, { block, className: "hero" }, jsx(Content, { block }))
  }
});`,
      "utf8"
    );

    await expect(buildPackageTheme(root)).rejects.toMatchObject({
      name: "ThemeBuildError",
      stage: "merge-assets",
      field: "mdsTheme.assets.css",
      filePath: join(root, "package.json")
    } satisfies Partial<ThemeBuildError>);
    await expect(buildPackageTheme(root)).rejects.toThrow(
      "mdsTheme.assets.css must point to a file inside the theme package: ."
    );
  });

  it("cleans stale files when writing package artifacts to a generated dist directory", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-clean-"));
    await mkdir(join(root, "src"), { recursive: true });
    await mkdir(join(root, "dist/theme/blocks"), { recursive: true });
    await writeFile(join(root, "dist/theme/blocks/stale.html"), "<section>stale</section>", "utf8");
    await writeFile(join(root, "dist/theme/stale.css"), ".stale{}", "utf8");
    await writeFile(
      join(root, "package.json"),
      JSON.stringify(
        {
          type: "module",
          mdsTheme: {
            source: "./src/theme.ts",
            dist: "./dist/theme"
          }
        },
        null,
        2
      ),
      "utf8"
    );
    await writeFile(
      join(root, "src/theme.ts"),
      `import { Content, defineJsxTheme, jsx, Root } from "${join(process.cwd(), "../theme-loader/src/jsx.js")}";
export default defineJsxTheme({
  name: "clean",
  blocks: {
    hero: (block) => jsx(Root, { block, className: "hero" }, jsx(Content, { block }))
  }
});`,
      "utf8"
    );

    await buildPackageTheme(root);

    await expect(readFile(join(root, "dist/theme/blocks/stale.html"), "utf8")).rejects.toThrow();
    await expect(readFile(join(root, "dist/theme/stale.css"), "utf8")).rejects.toThrow();
    await expect(readFile(join(root, "dist/theme/blocks/hero.html"), "utf8")).resolves.toContain("hero");
  });

  it("adds build stage context when package assets fail", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-error-"));
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(
      join(root, "package.json"),
      JSON.stringify(
        {
          type: "module",
          mdsTheme: {
            source: "./src/theme.ts",
            assets: {
              css: "./src/missing.css"
            }
          }
        },
        null,
        2
      ),
      "utf8"
    );
    await writeFile(
      join(root, "src/theme.ts"),
      `import { Content, defineJsxTheme, jsx, Root } from "${join(process.cwd(), "../theme-loader/src/jsx.js")}";
export default defineJsxTheme({
  name: "error",
  blocks: {
    hero: (block) => jsx(Root, { block, className: "hero" }, jsx(Content, { block }))
  }
});`,
      "utf8"
    );

    await expect(buildPackageTheme(root)).rejects.toMatchObject({
      name: "ThemeBuildError",
      stage: "merge-assets",
      field: "mdsTheme.assets.css",
      filePath: join(root, "src/missing.css")
    } satisfies Partial<ThemeBuildError>);
    await expect(buildPackageTheme(root)).rejects.toThrow("field mdsTheme.assets.css");
    await expect(buildPackageTheme(root)).rejects.toThrow(join(root, "src/missing.css"));
  });

  it("reports the exact package asset field when head assets fail", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-missing-head-asset-"));
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(
      join(root, "package.json"),
      JSON.stringify(
        {
          type: "module",
          mdsTheme: {
            source: "./src/theme.ts",
            dist: "./dist/theme",
            assets: {
              head: "./src/missing-head.html"
            }
          }
        },
        null,
        2
      ),
      "utf8"
    );
    await writeFile(
      join(root, "src/theme.ts"),
      `import { Content, defineJsxTheme, jsx, Root } from "${join(process.cwd(), "../theme-loader/src/jsx.js")}";
export default defineJsxTheme({
  name: "missing-head",
  blocks: {
    hero: (block) => jsx(Root, { block, className: "hero" }, jsx(Content, { block }))
  }
});`,
      "utf8"
    );

    await expect(buildPackageTheme(root)).rejects.toMatchObject({
      name: "ThemeBuildError",
      stage: "merge-assets",
      field: "mdsTheme.assets.head",
      filePath: join(root, "src/missing-head.html")
    } satisfies Partial<ThemeBuildError>);
    await expect(buildPackageTheme(root)).rejects.toThrow(join(root, "src/missing-head.html"));
  });

  it("converts package build failures to structured diagnostics", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-structured-error-"));
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(
      join(root, "package.json"),
      JSON.stringify(
        {
          type: "module",
          mdsTheme: {
            source: "./src/theme.ts",
            assets: {
              css: "./src/missing.css"
            }
          }
        },
        null,
        2
      ),
      "utf8"
    );
    await writeFile(
      join(root, "src/theme.ts"),
      `import { Content, defineJsxTheme, jsx, Root } from "${join(process.cwd(), "../theme-loader/src/jsx.js")}";
export default defineJsxTheme({
  name: "structured-error",
  blocks: {
    hero: (block) => jsx(Root, { block, className: "hero" }, jsx(Content, { block }))
  }
});`,
      "utf8"
    );

    try {
      await buildPackageTheme(root);
      throw new Error("Expected build to fail.");
    } catch (error) {
      const diagnostics = themeBuildErrorToDiagnostics(error);

      expect(diagnostics).toEqual([
        expect.objectContaining({
          severity: "error",
          code: "theme-build-error",
          stage: "merge-assets",
          field: "mdsTheme.assets.css",
          path: join(root, "src/missing.css")
        })
      ]);
      expect(formatThemeBuildDiagnostic(diagnostics[0]!)).toContain(
        `stage=merge-assets, field=mdsTheme.assets.css, path=${join(root, "src/missing.css")}`
      );
    }
  });

  it("watches package source files and rebuilds after changes", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-watch-"));
    const sourcePath = join(root, "src/theme.ts");
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(
      join(root, "package.json"),
      JSON.stringify(
        {
          type: "module",
          mdsTheme: {
            source: "./src/theme.ts",
            dist: "./dist/theme"
          }
        },
        null,
        2
      ),
      "utf8"
    );
    await writeThemeSourceFile(sourcePath, "first");

    const nextBuild = createDeferred<void>();
    let buildCount = 0;
    const watcher = watchPackageTheme(root, {
      debounceMs: 20,
      onBuild(result) {
        buildCount += 1;
        if (buildCount > 1 && result.filesWritten.includes("blocks/hero.html")) {
          nextBuild.resolve();
        }
      },
      onError(error) {
        nextBuild.reject(error);
      }
    });

    try {
      await watcher.ready;
      await writeThemeSourceFile(sourcePath, "second");
      await withTimeout(nextBuild.promise, 2000);

      expect(buildCount).toBeGreaterThanOrEqual(2);
      await expect(readFile(join(root, "dist/theme/blocks/hero.html"), "utf8")).resolves.toContain("second");
      const closed = watcher.closed.then(() => true);
      watcher.close();
      await expect(withTimeout(closed, 1000)).resolves.toBe(true);
    } finally {
      watcher.close();
    }
  });

  it("keeps CLI watch running until a shutdown signal closes it", async () => {
    const root = await mkdtemp(join(tmpdir(), "mds-theme-cli-watch-"));
    const sourcePath = join(root, "src/theme.ts");
    await mkdir(join(root, "src"), { recursive: true });
    await writeFile(
      join(root, "package.json"),
      JSON.stringify(
        {
          type: "module",
          mdsTheme: {
            source: "./src/theme.ts",
            dist: "./dist/theme"
          }
        },
        null,
        2
      ),
      "utf8"
    );
    await writeThemeSourceFile(sourcePath, "cli-watch");
    const signals = new EventEmitter() as NodeJS.Process;
    const stdout: string[] = [];
    const stderr: string[] = [];

    const run = runThemeCli(["watch", "."], {
      cwd: root,
      watchSignals: signals,
      stdout: {
        log(value: string) {
          stdout.push(value);
        }
      },
      stderr: {
        error(value: string) {
          stderr.push(value);
        }
      }
    });

    await waitFor(() => stdout.some((line) => line.startsWith("Built MDS theme package")), 2000);
    let settled = false;
    run.then(() => {
      settled = true;
    });
    await delay(50);
    expect(settled).toBe(false);

    signals.emit("SIGINT");

    await expect(withTimeout(run, 1000)).resolves.toEqual({ exitCode: 0 });
    expect(stderr).toEqual([]);
  });
});

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8")) as unknown;
}

async function writeInspectableThemeArtifact(root: string, metadata: unknown): Promise<void> {
  await mkdir(join(root, "blocks"), { recursive: true });
  await writeFile(
    join(root, "theme.json"),
    JSON.stringify(
      {
        name: "inspectable-metadata",
        blocks: "blocks"
      },
      null,
      2
    ),
    "utf8"
  );
  await writeFile(join(root, "blocks/hero.html"), "<section>{{ children }}</section>", "utf8");
  await writeFile(join(root, ".mds-theme-build.json"), `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
}

async function writeThemeSourceFile(path: string, className: string): Promise<void> {
  await writeFile(
    path,
    `import { Content, defineJsxTheme, jsx, Root } from "${join(process.cwd(), "../theme-loader/src/jsx.js")}";
export default defineJsxTheme({
  name: "watch-theme",
  blocks: {
    hero: (block) => jsx(Root, { block, className: "${className}" }, jsx(Content, { block }))
  }
});`,
    "utf8"
  );
}

function createDeferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
} {
  let resolveValue: (value: T) => void = () => {};
  let rejectValue: (error: unknown) => void = () => {};
  const promise = new Promise<T>((resolve, reject) => {
    resolveValue = resolve;
    rejectValue = reject;
  });

  return {
    promise,
    resolve: resolveValue,
    reject: rejectValue
  };
}

async function waitFor(predicate: () => boolean, timeoutMs: number): Promise<void> {
  const started = Date.now();
  while (!predicate()) {
    if (Date.now() - started > timeoutMs) {
      throw new Error("Timed out waiting for condition.");
    }
    await delay(10);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms.`)), timeoutMs);
      })
    ]);
  } finally {
    if (timeout !== undefined) {
      clearTimeout(timeout);
    }
  }
}
