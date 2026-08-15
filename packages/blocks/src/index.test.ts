import { describe, expect, it } from "vitest";
import { composeThemeSource, createThemeFromSources } from "@mds-crate/theme-loader";
import {
  blockPacksByName,
  blockVocabulary,
  blockVocabularyByName,
  controlBlocks,
  coreBlocks,
  displayBlocks,
  formsBlocks,
  foundationBlocks,
  interactiveBlocks,
  mediaBlocks,
  menuBlocks,
  motionBlocks,
  navigationBlocks
} from "./index.js";

const sharedBlocks = [...foundationBlocks, mediaBlocks, motionBlocks] as const;

describe("MDS block packs", () => {
  it("composes a compact primitive layer", () => {
    const source = composeThemeSource(
      { manifest: { name: "primitives" }, files: {} },
      { blockPacks: sharedBlocks }
    );

    expect(source.manifest.supportedBlocks).toEqual(
      expect.arrayContaining([
        "page",
        "callout",
        "badge",
        "progress",
        "breadcrumb",
        "button",
        "input",
        "slider",
        "calendar",
        "dropdown",
        "context-menu",
        "popover",
        "figure",
        "motion"
      ])
    );
    expect(source.manifest.supportedBlocks).not.toEqual(
      expect.arrayContaining(["hero", "cards", "data-table", "terminal", "steps", "message"])
    );
    expect(source.manifest.actions).toEqual(["open", "close", "show", "hide", "toggle"]);

    const theme = createThemeFromSources(source);
    expect(theme.blockRenderers?.callout).toBeDefined();
    expect(theme.blockRenderers?.button).toBeDefined();
    expect(theme.blockRenderers?.calendar).toBeDefined();
    expect(theme.blockRenderers?.dropdown).toBeDefined();
    expect(theme.blockRenderers?.motion).toBeDefined();
    expect(theme.blockRenderers?.hero).toBeUndefined();
    expect(theme.js).toContain("setupCommands");
    expect(theme.js).toContain("setupCalendars");
    expect(theme.js).toContain("setupContextMenus");
    expect(theme.js).not.toContain("setupDataTables");
    expect(theme.js).not.toContain("setupMessageScrollers");
    expect(() => new Function(theme.js ?? "")).not.toThrow();
  });

  it("keeps progressive enhancements scoped to their owning pack", () => {
    const cases = [
      {
        pack: formsBlocks,
        setupFunctions: ["setupCalendars"],
        selector: ".calendar-enhanced",
        unrelatedSetup: "setupCommands"
      },
      {
        pack: interactiveBlocks,
        setupFunctions: ["setupCommands"],
        selector: ".command-input",
        unrelatedSetup: "setupCalendars"
      },
      {
        pack: menuBlocks,
        setupFunctions: ["setupContextMenus", "setupMenubars"],
        selector: ".context-menu-content",
        unrelatedSetup: "setupCommands"
      }
    ] as const;

    for (const { pack, setupFunctions, selector, unrelatedSetup } of cases) {
      const script = pack.files["runtime.js"];
      const styles = pack.files["runtime.css"];

      expect(script).toBeTypeOf("string");
      expect(styles).toBeTypeOf("string");
      if (script === undefined || styles === undefined) {
        throw new Error(`Expected runtime assets for ${pack.name}.`);
      }
      expect(() => new Function(script)).not.toThrow();
      expect(script).toContain("const truthy");
      for (const setupFunction of setupFunctions) {
        expect(script).toContain(setupFunction);
      }
      expect(script).not.toContain(unrelatedSetup);
      expect(styles).toContain(selector);
    }
  });

  it("exports only the nine reusable packs", () => {
    const supportedBlocks = sharedBlocks.flatMap((pack) => pack.supportedBlocks ?? []);
    const missingVocabulary = supportedBlocks.filter((block) => blockVocabularyByName[block] === undefined);

    expect(blockVocabulary).toHaveLength(63);
    expect(sharedBlocks).toHaveLength(9);
    expect(Object.keys(blockPacksByName)).toHaveLength(9);
    expect(supportedBlocks).toHaveLength(63);
    expect(new Set(supportedBlocks).size).toBe(63);
    expect(missingVocabulary).toEqual([]);
    expect(new Set(blockVocabulary.map((block) => block.name)).size).toBe(blockVocabulary.length);
  });

  it("keeps the primitive profiles focused", () => {
    expect(coreBlocks.supportedBlocks).toEqual([
      "page",
      "nav",
      "section",
      "aside",
      "footer",
      "card",
      "grid",
      "split",
      "callout",
      "quote",
      "details"
    ]);
    expect(displayBlocks.supportedBlocks).toEqual(["avatar", "empty", "item", "badge", "progress"]);
    expect(navigationBlocks.supportedBlocks).toEqual(["breadcrumb", "breadcrumb-item", "pagination"]);
    expect(controlBlocks.supportedBlocks).toEqual(["button", "toggle", "toggle-group"]);
    expect(mediaBlocks.supportedBlocks).toEqual(["figure", "caption", "video"]);
    expect(menuBlocks.supportedBlocks).not.toContain("dropdown-menu");
    expect(formsBlocks.supportedBlocks).toEqual(
      expect.arrayContaining(["input", "input-group", "input-otp", "combobox", "select", "slider", "switch"])
    );
  });

  it("preserves the action and motion contracts", () => {
    expect(interactiveBlocks.actions).toEqual(["open", "close", "show", "hide", "toggle"]);
    expect(motionBlocks.supportedBlocks).toEqual(["motion", "reveal", "scene"]);
    expect(blockVocabularyByName.callout).toMatchObject({ profile: "core", attrs: ["tone", "label"] });
    expect(blockVocabularyByName.badge).toMatchObject({ profile: "display" });
    expect(blockVocabularyByName.motion?.attrs).toEqual(["preset", "trigger", "delay", "duration", "stagger", "once"]);
    expect(blockVocabularyByName.reveal?.attrs).toEqual(["preset", "delay", "duration"]);
    expect(blockVocabularyByName.scene?.attrs).toEqual(["variant"]);
    expect(blockPacksByName["@mds-crate/blocks/core"]).toBe(coreBlocks);
  });
});
