import { describe, expect, it } from "vitest";
import { blockTypeFromPath, collectTemplateEntries } from "./block-template.js";

describe("block template parsing", () => {
  it("collects data-block aliases from template elements", () => {
    expect(
      collectTemplateEntries(
        `<template data-block="note warning">
<aside>{{ children }}</aside>
</template>`,
        "fallback"
      )
    ).toEqual([
      {
        blockType: "note",
        template: "\n<aside>{{ children }}</aside>\n"
      },
      {
        blockType: "warning",
        template: "\n<aside>{{ children }}</aside>\n"
      }
    ]);
  });

  it("uses the filename fallback only when no data-block template is registered", () => {
    const template = `<template>
<section>{{ children }}</section>
</template>`;

    expect(collectTemplateEntries(template, "hero")).toEqual([
      {
        blockType: "hero",
        template
      }
    ]);
  });

  it("derives block types from artifact paths", () => {
    expect(blockTypeFromPath("blocks/hero.html")).toBe("hero");
    expect(blockTypeFromPath("blocks/grid-3.html")).toBe("grid-3");
  });
});
