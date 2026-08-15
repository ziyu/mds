/** @jsx jsx */
import { Content, defineJsxTheme, jsx, Root, Slot, Slots } from "../../../packages/theme-loader/src/jsx";

export default defineJsxTheme({
  name: "atelier",
  label: "Atelier",
  description: "A polished JSX-authored package-style theme for rich landing pages and product narratives.",
  author: "MDS",
  preview: "preview.svg",
  tags: ["jsx", "landing", "package"],
  supportedBlocks: ["hero", "float", "sticky"],
  blocks: {
    hero: (block) => (
      <Root block={block} className="hero">
        <div className="hero-title">
          <Slot block={block} name="title" />
        </div>
        <div className="hero-body">
          <Slot block={block} name="body" />
        </div>
        <div className="hero-flow">
          <Content block={block} />
        </div>
        <div className="hero-actions">
          <Slot block={block} name="actions" />
        </div>
        <div className="hero-media">
          <Slot block={block} name="media" />
        </div>
      </Root>
    ),
    float: (block) => (
      <Root block={block} className="section float">
        <Content block={block} />
        <Slots block={block} />
      </Root>
    ),
    sticky: (block) => (
      <Root block={block} className="sticky">
        <div className="sticky-copy">
          <Slot block={block} name="left" />
          <Content block={block} />
        </div>
        <div className="sticky-panel">
          <Slot block={block} name="right" />
          <Slot block={block} name="media" />
        </div>
      </Root>
    ),
    tabs: (block) => (
      <Root block={block} className="tabs">
        <div className="tabs-intro">
          <Content block={block} />
        </div>
        <div className="tabs-panels">
          <Slots block={block} />
        </div>
      </Root>
    ),
    dialog: (block) => (
      <Root block={block} className="dialog" role="dialog" aria-modal="true">
        <div className="dialog-panel">
          <button className="dialog-close" type="button" aria-label="Close">
            x
          </button>
          <Content block={block} />
        </div>
      </Root>
    ),
    drawer: (block) => (
      <Root block={block} as="aside" className="drawer">
        <div className="drawer-panel">
          <button className="drawer-close" type="button" aria-label="Close">
            x
          </button>
          <Content block={block} />
        </div>
      </Root>
    )
  }
});
