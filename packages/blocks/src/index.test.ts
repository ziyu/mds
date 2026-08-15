import { describe, expect, it } from "vitest";
import { composeThemeSource, createThemeFromSources } from "@mds-crate/theme-loader";
import {
  blockVocabulary,
  blockVocabularyByName,
  blockPacksByName,
  chatBlocks,
  controlBlocks,
  coreBlocks,
  dataBlocks,
  displayBlocks,
  docsBlocks,
  foundationBlocks,
  formsBlocks,
  interactiveBlocks,
  marketingBlocks,
  menuBlocks,
  mediaBlocks,
  motionBlocks,
  navigationBlocks,
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
    expect(source.manifest.supportedBlocks).toContain("avatar");
    expect(source.manifest.supportedBlocks).toContain("breadcrumb");
    expect(source.manifest.supportedBlocks).toContain("pagination");
    expect(source.manifest.supportedBlocks).toContain("button");
    expect(source.manifest.supportedBlocks).toContain("slider");
    expect(source.manifest.supportedBlocks).toContain("dropdown");
    expect(source.manifest.supportedBlocks).toContain("popover");
    expect(source.manifest.supportedBlocks).toContain("calendar");
    expect(source.manifest.supportedBlocks).toContain("data-table");
    expect(source.manifest.supportedBlocks).toContain("chart");
    expect(source.manifest.supportedBlocks).toContain("context-menu");
    expect(source.manifest.supportedBlocks).toContain("menubar");
    expect(source.manifest.supportedBlocks).toContain("message-scroller");
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
    expect(theme.blockRenderers?.avatar).toBeDefined();
    expect(theme.blockRenderers?.breadcrumb).toBeDefined();
    expect(theme.blockRenderers?.pagination).toBeDefined();
    expect(theme.blockRenderers?.button).toBeDefined();
    expect(theme.blockRenderers?.slider).toBeDefined();
    expect(theme.blockRenderers?.dropdown).toBeDefined();
    expect(theme.blockRenderers?.popover).toBeDefined();
    expect(theme.blockRenderers?.calendar).toBeDefined();
    expect(theme.blockRenderers?.["data-table"]).toBeDefined();
    expect(theme.blockRenderers?.chart).toBeDefined();
    expect(theme.blockRenderers?.["context-menu"]).toBeDefined();
    expect(theme.blockRenderers?.menubar).toBeDefined();
    expect(theme.blockRenderers?.["message-scroller"]).toBeDefined();
    expect(theme.js).toContain("setupCalendars");
  });

  it("offers a foundation composition without marketing or motion profiles", () => {
    const supportedBlocks = foundationBlocks.flatMap((pack) => pack.supportedBlocks ?? []);

    expect(supportedBlocks).toEqual(
      expect.arrayContaining([
        "avatar",
        "breadcrumb",
        "pagination",
        "button",
        "input",
        "slider",
        "calendar",
        "dropdown",
        "context-menu",
        "menubar"
      ])
    );
    expect(supportedBlocks).not.toContain("pricing");
    expect(supportedBlocks).not.toContain("motion");
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
    expect(blockVocabularyByName.toggle).toMatchObject({
      profile: "controls"
    });
    expect(blockVocabularyByName.dropdown).toMatchObject({
      profile: "menus"
    });
    expect(blockVocabularyByName.avatar).toMatchObject({
      profile: "display"
    });
    expect(blockVocabularyByName.breadcrumb).toMatchObject({
      profile: "navigation"
    });
    expect(blockVocabularyByName["data-table"]).toMatchObject({
      profile: "data",
      slots: ["columns", "rows", "empty"]
    });
    expect(blockVocabularyByName["message-scroller"]).toMatchObject({
      profile: "chat"
    });

    const supportedBlocks = standardBlocks.flatMap((pack) => pack.supportedBlocks ?? []);
    const missingVocabulary = supportedBlocks.filter((block) => blockVocabularyByName[block] === undefined);

    expect(missingVocabulary).toEqual([]);
    expect(new Set(blockVocabulary.map((block) => block.name)).size).toBe(blockVocabulary.length);
  });

  it("keeps focused packs available for theme authors", () => {
    expect(mediaBlocks.supportedBlocks).toEqual(["media", "image", "video", "figure", "caption", "gallery"]);
    expect(controlBlocks.supportedBlocks).toEqual(["button", "toggle", "toggle-group"]);
    expect(displayBlocks.supportedBlocks).toEqual(["avatar", "empty", "item"]);
    expect(displayBlocks.files?.["blocks/avatar.html"]).toContain("<img");
    expect(navigationBlocks.supportedBlocks).toEqual(["breadcrumb", "breadcrumb-item", "pagination"]);
    expect(navigationBlocks.files?.["blocks/breadcrumb.html"]).toContain("<nav");
    expect(formsBlocks.supportedBlocks).toEqual(
      expect.arrayContaining(["button-group", "input", "input-group", "input-otp", "combobox", "select", "option", "slider", "switch"])
    );
    expect(formsBlocks.files?.["blocks/input.html"]).toContain("<input");
    expect(formsBlocks.files?.["blocks/input-group.html"]).toContain('class="input-group-control"');
    expect(formsBlocks.files?.["blocks/input-otp.html"]).toContain('autocomplete="one-time-code"');
    expect(formsBlocks.files?.["blocks/combobox.html"]).toContain("<datalist");
    expect(formsBlocks.files?.["blocks/calendar.html"]).toContain('class="calendar-days"');
    expect(formsBlocks.files?.["blocks/select.html"]).toContain("<select");
    expect(menuBlocks.supportedBlocks).toEqual(
      expect.arrayContaining(["dropdown", "dropdown-menu", "context-menu", "menubar", "menu", "menu-item"])
    );
    expect(interactiveBlocks.supportedBlocks).toContain("command");
    expect(interactiveBlocks.files?.["blocks/command.html"]).toContain('class="command-input"');
    expect(interactiveBlocks.actions).toEqual(["open", "close", "show", "hide", "toggle"]);
    expect(dataBlocks.supportedBlocks).toEqual(
      expect.arrayContaining(["data-table", "data-column", "data-row", "data-cell", "chart", "chart-series", "chart-point"])
    );
    expect(dataBlocks.files?.["blocks/data-table.html"]).toContain("<table");
    expect(dataBlocks.files?.["blocks/chart-point.html"]).toContain("<meter");
    expect(chatBlocks.supportedBlocks).toEqual(["attachment", "bubble", "marker", "message", "message-scroller"]);
    expect(chatBlocks.files?.["blocks/message-scroller.html"]).toContain('role="log"');
    expect(motionBlocks.supportedBlocks).toEqual(["motion", "reveal", "scene"]);
    expect(motionBlocks.files?.["blocks/motion.html"]).toContain('class="motion"');
    expect(blockVocabularyByName.motion!.attrs).toEqual(["preset", "trigger", "delay", "duration", "stagger", "once"]);
    expect(blockVocabularyByName.reveal!.attrs).toEqual(["preset", "delay", "duration"]);
    expect(blockVocabularyByName.scene!.attrs).toEqual(["variant"]);
    expect(blockPacksByName["@mds-crate/blocks/core"]).toBe(coreBlocks);
  });
});
