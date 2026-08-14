import { describe, expect, it } from "vitest";
import {
  Content,
  Root,
  Slot,
  createThemeFromReactTheme,
  createThemeSourceFromReactTheme,
  defineReactTheme,
  isReactThemeDefinition
} from "./index.js";

describe("react theme sdk", () => {
  it("recognizes React theme definitions", () => {
    expect(
      isReactThemeDefinition({
        name: "react-demo",
        blocks: {
          hero: () => null
        }
      })
    ).toBe(true);
    expect(isReactThemeDefinition({ name: "bad", blocks: { hero: "not a component" } })).toBe(false);
  });

  it("renders React blocks to plain theme templates", () => {
    const source = createThemeSourceFromReactTheme({
      name: "react-demo",
      blocks: {
        hero: (block) => (
          <Root block={block} className="hero">
            <h1>{block.name}</h1>
            <Content block={block} />
            <Slot block={block} name="actions" />
          </Root>
        )
      }
    });

    expect(source.manifest).toMatchObject({
      name: "react-demo",
      blocks: "blocks"
    });
    expect(source.files["blocks/hero.html"]).toContain('<section class="hero"{{ attrs }}>');
    expect(source.files["blocks/hero.html"]).toContain("<h1>{{ name }}</h1>");
    expect(source.files["blocks/hero.html"]).toContain("{{ children }}");
    expect(source.files["blocks/hero.html"]).toContain("{{ slot:actions }}");
  });

  it("composes block packs into React theme sources", () => {
    const source = createThemeSourceFromReactTheme({
      name: "react-packed",
      blockPacks: [
        {
          name: "starter",
          supportedBlocks: ["hero", "note"],
          blocks: "blocks",
          files: {
            "blocks/hero.html": '<section{{ attrs }} class="pack-hero">{{ children }}</section>',
            "blocks/note.html": '<aside{{ attrs }} class="pack-note">{{ children }}</aside>'
          }
        }
      ],
      blocks: {
        hero: (block) => (
          <Root block={block} className="theme-hero">
            <Content block={block} />
          </Root>
        )
      }
    });

    expect(source.manifest.supportedBlocks).toEqual(["hero", "note"]);
    expect(source.files["blocks/hero.html"]).toContain("theme-hero");
    expect(source.files["blocks/note.html"]).toContain("pack-note");
  });

  it("exposes block attribute placeholders", () => {
    const source = createThemeSourceFromReactTheme({
      name: "react-attrs",
      blocks: {
        card: (block) => (
          <Root block={block} className={`card tone-${block.attr("tone")} motion-${block.attr("motion", "fade-up")}`}>
            <Content block={block} />
          </Root>
        )
      }
    });

    expect(source.files["blocks/card.html"]).toContain("tone-{{ attr:tone }}");
    expect(source.files["blocks/card.html"]).toContain("motion-{{ attr:motion:fade-up }}");
  });

  it("supports shadcn-style local React components", () => {
    function Button(props: { className?: string; children?: React.ReactNode }) {
      return <button className={`inline-flex rounded-md ${props.className ?? ""}`}>{props.children}</button>;
    }

    const source = defineReactTheme({
      name: "shadcn-style",
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

    expect(source.files["blocks/card.html"]).toContain("inline-flex rounded-md bg-primary");
    expect(source.files["blocks/card.html"]).toContain("{{ children }}");
  });

  it("creates runtime themes from React definitions", () => {
    const theme = createThemeFromReactTheme({
      name: "runtime-react",
      blocks: {
        note: (block) => (
          <Root block={block} className="note">
            <Content block={block} />
          </Root>
        )
      }
    });

    expect(theme.name).toBe("runtime-react");
    expect(theme.blockRenderers?.note).toBeTypeOf("function");
  });
});
