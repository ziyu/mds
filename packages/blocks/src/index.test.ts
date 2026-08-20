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
    expect(theme.js).toContain("setupToggles");
    expect(theme.js).toContain("setupContextMenus");
    expect(theme.js).not.toContain("setupDataTables");
    expect(theme.js).not.toContain("setupMessageScrollers");
    expect(() => new Function(theme.js ?? "")).not.toThrow();
  });

  it("keeps progressive enhancements scoped to their owning pack", () => {
    const cases = [
      {
        pack: formsBlocks,
        setupFunctions: ["setupCalendars", "setupFormValidation"],
        selector: ".calendar-enhanced",
        unrelatedSetup: "setupCommands"
      },
      {
        pack: interactiveBlocks,
        setupFunctions: ["setupCommands", "setupTabs", "setupAccordions", "setupCarousels", "setupOverlays"],
        selector: "[data-mds-role=\"dialog\"]",
        unrelatedSetup: "setupCalendars"
      },
      {
        pack: menuBlocks,
        setupFunctions: ["setupFloatingMenus", "setupContextMenus", "setupMenubars"],
        selector: ".context-menu-content",
        unrelatedSetup: "setupCommands"
      },
      {
        pack: motionBlocks,
        setupFunctions: ["setupMotion"],
        selector: "data-motion-ready",
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

  it("scopes command enhancement to command blocks instead of command actions", () => {
    expect(interactiveBlocks.files["runtime.js"]).toContain("[data-mds-role='command']");
    expect(interactiveBlocks.files["runtime.css"]).toContain(":where(section.command)");
  });

  it("gives bare toggles intrinsic pressed-state behavior without hijacking target actions", () => {
    const script = controlBlocks.files["runtime.js"];

    expect(script).toBeTypeOf("string");
    if (script === undefined) {
      throw new Error("Expected the control pack runtime asset.");
    }
    expect(() => new Function(script)).not.toThrow();
    expect(script).toContain("setupToggles");
    expect(script).toContain("button[data-mds-role='toggle'][aria-pressed]");
    expect(script).toContain('toggle.dataset.action === "toggle" && Boolean(toggle.dataset.target)');
    expect(script).toContain('toggle.setAttribute("aria-pressed"');
  });

  it("does not invent visible labels for unlabeled controls", () => {
    const controlTemplates = ["blocks/button.html", "blocks/toggle.html"].map((path) => controlBlocks.files[path]);
    const formTemplates = [
      "blocks/label.html",
      "blocks/input.html",
      "blocks/input-group.html",
      "blocks/input-otp.html",
      "blocks/combobox.html",
      "blocks/calendar.html",
      "blocks/select.html",
      "blocks/option.html",
      "blocks/textarea.html",
      "blocks/checkbox.html",
      "blocks/radio.html",
      "blocks/radio-group.html",
      "blocks/slider.html",
      "blocks/switch.html"
    ].map((path) => formsBlocks.files[path]);

    expect([...controlTemplates, ...formTemplates].every((template) => typeof template === "string")).toBe(true);
    expect(controlTemplates.join("\n")).not.toMatch(/\{\{ attr:label:(?:Button|Toggle) \}\}/);
    expect(formsBlocks.files["blocks/input.html"]).toContain('<span class="field-label">{{ attr:label }}</span>');
    expect(formsBlocks.files["blocks/calendar.html"]).toContain('<span class="field-label">{{ attr:label }}</span>');
    expect(formsBlocks.files["blocks/radio-group.html"]).toContain("<legend>{{ attr:legend }}</legend>");
    expect(formsBlocks.files["blocks/slider.html"]).toContain("{{ attr:label }}");
    expect(formTemplates.join("\n")).not.toContain("{{ attr:label:Value }}");
  });

  it("keeps atomic progress output limited to its native semantic element", () => {
    const template = displayBlocks.files["blocks/progress.html"];

    expect(template).toBe(
      '<progress{{ attrs }} class="progress" value="{{ attr:value:0 }}" max="{{ attr:max:100 }}" aria-label="{{ attr:label:Progress }}"></progress>'
    );
    expect(template).not.toContain("<figure");
    expect(template).not.toContain("<figcaption");
    expect(template).not.toContain("{{ children }}");
    expect(template).not.toContain("{{ slots }}");
  });

  it("exports only the nine reusable packs", () => {
    const supportedBlocks = sharedBlocks.flatMap((pack) => pack.supportedBlocks ?? []);
    const missingVocabulary = supportedBlocks.filter((block) => blockVocabularyByName[block] === undefined);

    expect(blockVocabulary).toHaveLength(64);
    expect(sharedBlocks).toHaveLength(9);
    expect(Object.keys(blockPacksByName)).toHaveLength(9);
    expect(supportedBlocks).toHaveLength(64);
    expect(new Set(supportedBlocks).size).toBe(64);
    expect(missingVocabulary).toEqual([]);
    expect(new Set(blockVocabulary.map((block) => block.name)).size).toBe(blockVocabulary.length);
  });

  it("keeps the primitive profiles focused", () => {
    expect(coreBlocks.supportedBlocks).toEqual([
      "page",
      "header",
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

  it("never renders named slots again through the aggregate slots placeholder", () => {
    for (const pack of sharedBlocks) {
      for (const [path, source] of Object.entries(pack.files)) {
        if (!path.startsWith("blocks/") || !source.includes("{{ slot:")) {
          continue;
        }
        expect(source, `${pack.name}/${path}`).not.toContain("{{ slots }}");
      }
    }
  });

  it("preserves the action and motion contracts", () => {
    expect(interactiveBlocks.actions).toEqual(["open", "close", "show", "hide", "toggle"]);
    expect(motionBlocks.supportedBlocks).toEqual(["motion", "reveal", "scene"]);
    expect(blockVocabularyByName.callout).toMatchObject({ profile: "core", attrs: ["tone", "label"] });
    expect(blockVocabularyByName.details?.attrs).toEqual(["label", "open"]);
    expect(blockVocabularyByName.badge).toMatchObject({ profile: "display" });
    expect(blockVocabularyByName.motion?.attrs).toEqual(["preset", "trigger", "delay", "duration", "stagger", "once"]);
    expect(blockVocabularyByName.reveal?.attrs).toEqual(["preset", "delay", "duration"]);
    expect(blockVocabularyByName.scene?.attrs).toEqual(["variant"]);
    expect(blockPacksByName["@mds-crate/blocks/core"]).toBe(coreBlocks);
  });

  it("owns portable interaction state through stable runtime hooks", () => {
    const script = interactiveBlocks.files["runtime.js"];
    const styles = interactiveBlocks.files["runtime.css"];

    expect(script).toBeTypeOf("string");
    expect(styles).toBeTypeOf("string");
    if (script === undefined || styles === undefined) {
      throw new Error("Expected interactive runtime assets.");
    }

    expect(interactiveBlocks.files["blocks/tabs.html"]).toContain('data-mds-role="tabs"');
    expect(interactiveBlocks.files["blocks/carousel.html"]).toContain('data-mds-role="carousel-track"');
    expect(interactiveBlocks.files["blocks/dialog.html"]).toContain('data-mds-role="overlay-panel"');
    expect(interactiveBlocks.files["blocks/dialog.html"]).toContain(" hidden>");
    expect(script).toContain('new Set(["open", "close", "show", "hide", "toggle"])');
    expect(script).toContain('target instanceof HTMLDetailsElement');
    expect(script).toContain('target.hidden = !open');
    expect(script).toContain('document.body.append(overlay)');
    expect(script).toContain('sibling.inert = true');
    expect(script).toContain('focus({ preventScroll: true })');
    expect(script).toContain('update(0, false)');
    expect(styles).toContain('[data-mds-role="overlay-backdrop"]');
  });

  it("keeps motion lifecycle portable while leaving visual presets to themes", () => {
    const script = motionBlocks.files["runtime.js"];
    const styles = motionBlocks.files["runtime.css"];

    expect(script).toContain("IntersectionObserver");
    expect(script).toContain('window.matchMedia("(prefers-reduced-motion: reduce)")');
    expect(script).toContain('element.dataset.mdsState = "visible"');
    expect(script).toContain('element.dataset.motionState = "in"');
    expect(script).toContain('entry.target.dataset.motionOnce !== "false"');
    expect(styles).not.toContain("translate");
    expect(styles).not.toContain("opacity:");
  });
});
