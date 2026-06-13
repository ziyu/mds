import { describe, expect, it } from "vitest";
import {
  getThemeRuntimeFiles,
  getThemeRuntimeSourceInput,
  getThemeArtifactFileLists,
  getThemeDevelopmentFiles,
  isThemeBuildMetadataPath,
  isThemeDevelopmentMetadataPath,
  isThemeManifestPath,
  normalizeThemeFiles,
  normalizeThemeArtifactOutputPath,
  normalizeThemeArtifactPath,
  normalizeThemeManifestReferences,
  sortThemeArtifactFilePaths,
  THEME_BUILD_METADATA_FILE,
  THEME_MANIFEST_FILE
} from "./index.js";

describe("theme artifact contract", () => {
  it("exports canonical artifact file names", () => {
    expect(THEME_MANIFEST_FILE).toBe("theme.json");
    expect(THEME_BUILD_METADATA_FILE).toBe(".mds-theme-build.json");
  });

  it("normalizes relative POSIX artifact paths", () => {
    expect(normalizeThemeArtifactPath("./style.css")).toEqual({
      path: "./style.css",
      normalizedPath: "style.css"
    });
    expect(normalizeThemeArtifactPath("blocks//./hero.html")).toEqual({
      path: "blocks//./hero.html",
      normalizedPath: "blocks/hero.html"
    });
    expect(isThemeManifestPath("./theme.json")).toBe(true);
    expect(isThemeBuildMetadataPath("./.mds-theme-build.json")).toBe(true);
  });

  it("normalizes manifest references and file keys through the artifact contract", () => {
    expect(
      normalizeThemeManifestReferences({
        css: "./style.css",
        js: ["./script.js"],
        head: "./head.html",
        shell: "./shell.html",
        preview: "./preview.svg",
        blocks: {
          hero: "./blocks//./hero.html"
        }
      })
    ).toEqual({
      css: "style.css",
      js: ["script.js"],
      head: "head.html",
      shell: "shell.html",
      preview: "preview.svg",
      blocks: {
        hero: "blocks/hero.html"
      }
    });
    expect(
      normalizeThemeFiles({
        "./style.css": ".page{}",
        "./blocks//./hero.html": "<section>{{ children }}</section>"
      })
    ).toEqual({
      "style.css": ".page{}",
      "blocks/hero.html": "<section>{{ children }}</section>"
    });
  });

  it("reports artifact path violations without throwing", () => {
    expect(normalizeThemeArtifactPath("")).toMatchObject({
      error: {
        code: "empty"
      }
    });
    expect(normalizeThemeArtifactPath("../escape.css")).toMatchObject({
      error: {
        code: "escape"
      }
    });
    expect(normalizeThemeArtifactPath("blocks\\hero.html")).toMatchObject({
      error: {
        code: "non-posix"
      }
    });
  });

  it("normalizes artifact output paths through write-oriented categories", () => {
    expect(normalizeThemeArtifactOutputPath("./blocks/hero.html")).toEqual({
      path: "./blocks/hero.html",
      normalizedPath: "blocks/hero.html"
    });
    expect(normalizeThemeArtifactOutputPath("")).toMatchObject({
      error: {
        code: "empty"
      }
    });
    expect(normalizeThemeArtifactOutputPath("blocks\\hero.html")).toMatchObject({
      error: {
        code: "unsafe"
      }
    });
    expect(normalizeThemeArtifactOutputPath("../escape.css")).toMatchObject({
      error: {
        code: "escape"
      }
    });
  });

  it("filters development metadata from runtime artifact files", () => {
    const files = {
      "style.css": ".page{}",
      [THEME_BUILD_METADATA_FILE]: "{}"
    };

    expect(getThemeRuntimeFiles(files)).toEqual({
      "style.css": ".page{}"
    });
    expect(
      getThemeDevelopmentFiles(files)
    ).toEqual({
      [THEME_BUILD_METADATA_FILE]: "{}"
    });
    expect(getThemeArtifactFileLists(files)).toEqual({
      files: ["theme.json", "style.css", THEME_BUILD_METADATA_FILE],
      runtimeFiles: ["theme.json", "style.css"],
      developmentFiles: [THEME_BUILD_METADATA_FILE]
    });
    expect(isThemeDevelopmentMetadataPath(THEME_BUILD_METADATA_FILE)).toBe(true);
    expect(isThemeDevelopmentMetadataPath("style.css")).toBe(false);
  });

  it("sorts artifact file paths with manifest first and development metadata last", () => {
    expect(
      sortThemeArtifactFilePaths([
        THEME_BUILD_METADATA_FILE,
        "blocks/hero.html",
        THEME_MANIFEST_FILE,
        "style.css",
        "blocks/card.html"
      ])
    ).toEqual([THEME_MANIFEST_FILE, "blocks/card.html", "blocks/hero.html", "style.css", THEME_BUILD_METADATA_FILE]);
  });

  it("creates runtime theme source inputs without development metadata", () => {
    expect(
      getThemeRuntimeSourceInput({
        manifest: {
          name: "runtime-source"
        },
        rootName: "runtime-source",
        files: {
          "style.css": ".page{}",
          [THEME_BUILD_METADATA_FILE]: "{}"
        }
      })
    ).toEqual({
      manifest: {
        name: "runtime-source"
      },
      rootName: "runtime-source",
      files: {
        "style.css": ".page{}"
      }
    });
  });
});
