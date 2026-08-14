import { describe, expect, it } from "vitest";
import { composeThemeSource, createThemeFromSources } from "@mds/theme-loader";
import {
  blockVocabulary,
  blockVocabularyByName,
  blockPacksByName,
  coreBlocks,
  docsBlocks,
  formsBlocks,
  interactiveBlocks,
  marketingBlocks,
  mediaBlocks,
  standardBlocks
} from "./index.js";

describe("MDS block packs", () => {
  it("exports standard packs as composable theme sources", () => {
    const source = composeThemeSource(
      {
        manifest: {
          name: "packed"
        },
        files: {}
      },
      {
        blockPacks: standardBlocks
      }
    );

    expect(source.manifest.supportedBlocks).toContain("hero");
    expect(source.manifest.supportedBlocks).toContain("pricing-plan");
    expect(source.manifest.supportedBlocks).toContain("steps");
    expect(source.manifest.supportedBlocks).toContain("figure");
    expect(source.manifest.supportedBlocks).toContain("terminal");
    expect(source.manifest.supportedBlocks).toContain("fieldset");
    expect(source.manifest.supportedBlocks).toContain("popover");
    expect(source.manifest.actions).toEqual(["open", "close", "show", "hide", "toggle"]);
    expect(source.files["blocks/hero.html"]).toContain("hero");
    expect(source.files["blocks/pricing-plan.html"]).toContain("pricing-plan");
    expect(source.files["blocks/terminal.html"]).toContain("terminal");

    const theme = createThemeFromSources(source);
    expect(theme.blockRenderers?.hero).toBeDefined();
    expect(theme.blockRenderers?.["pricing-plan"]).toBeDefined();
    expect(theme.blockRenderers?.steps).toBeDefined();
    expect(theme.blockRenderers?.figure).toBeDefined();
    expect(theme.blockRenderers?.terminal).toBeDefined();
    expect(theme.blockRenderers?.fieldset).toBeDefined();
    expect(theme.blockRenderers?.popover).toBeDefined();
  });

  it("lets themes choose individual block profiles", () => {
    const source = composeThemeSource(
      {
        manifest: {
          name: "core-only"
        },
        files: {}
      },
      {
        blockPacks: [coreBlocks]
      }
    );

    expect(source.manifest.supportedBlocks).toContain("details");
    expect(source.manifest.supportedBlocks).not.toContain("pricing");

    const marketingSource = composeThemeSource(
      {
        manifest: {
          name: "marketing-only"
        },
        files: {}
      },
      {
        blockPacks: [marketingBlocks]
      }
    );

    expect(marketingSource.manifest.supportedBlocks).toContain("pricing");
    expect(marketingSource.manifest.supportedBlocks).not.toContain("details");

    const docsSource = composeThemeSource(
      {
        manifest: {
          name: "docs-only"
        },
        files: {}
      },
      {
        blockPacks: [docsBlocks]
      }
    );

    expect(docsSource.manifest.supportedBlocks).toContain("terminal");
    expect(docsSource.manifest.supportedBlocks).not.toContain("pricing");
  });

  it("exports machine-readable vocabulary for generated authoring tools", () => {
    expect(blockVocabularyByName.hero).toMatchObject({
      profile: "core",
      slots: ["title", "body", "actions", "media"]
    });
    expect(blockVocabularyByName["pricing-plan"]).toMatchObject({
      profile: "marketing",
      attrs: ["price", "highlighted"]
    });
    expect(blockVocabularyByName["code-group"]).toMatchObject({
      profile: "docs"
    });

    const supportedBlocks = standardBlocks.flatMap((pack) => pack.supportedBlocks ?? []);
    const missingVocabulary = supportedBlocks.filter((block) => blockVocabularyByName[block] === undefined);

    expect(missingVocabulary).toEqual([]);
    expect(new Set(blockVocabulary.map((block) => block.name)).size).toBe(blockVocabulary.length);
  });

  it("keeps focused packs available for theme authors", () => {
    expect(mediaBlocks.supportedBlocks).toEqual(["media", "image", "video", "figure", "caption", "gallery"]);
    expect(formsBlocks.supportedBlocks).toContain("button-group");
    expect(interactiveBlocks.actions).toEqual(["open", "close", "show", "hide", "toggle"]);
    expect(blockPacksByName["@mds/blocks/core"]).toBe(coreBlocks);
  });
});
