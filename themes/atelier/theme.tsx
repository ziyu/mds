/** @jsx jsx */
/** @jsxFrag Fragment */
import { Content, defineJsxTheme, Fragment, jsx, Root, Slot, Slots } from "../../packages/theme-loader/src/jsx";

export default defineJsxTheme({
  name: "atelier",
  label: "Atelier",
  description: "A polished JSX-authored package-style theme for rich landing pages and product narratives.",
  author: "MDS",
  preview: "preview.svg",
  tags: ["jsx", "landing", "package"],
  supportedBlocks: [
    "accordion",
    "aside",
    "card",
    "cards",
    "carousel",
    "danger",
    "details",
    "dialog",
    "drawer",
    "float",
    "footer",
    "form",
    "grid",
    "grid-2",
    "grid-3",
    "grid-auto",
    "hero",
    "info",
    "motion",
    "nav",
    "note",
    "page",
    "quote",
    "reveal",
    "scene",
    "section",
    "split",
    "sticky",
    "success",
    "tabs",
    "warning"
  ],
  actions: ["toggle", "open", "close", "show", "hide"],
  blocks: {
    page: (block) => (
      <Root block={block} as="main" className="page">
        <Content block={block} />
      </Root>
    ),
    "section reveal float motion": (block) => (
      <Root block={block} className={`section ${block.type}`}>
        <Content block={block} />
        <Slots block={block} />
      </Root>
    ),
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
    nav: (block) => (
      <Root block={block} as="nav" className="nav" aria-label={block.name || "Navigation"}>
        <Content block={block} />
        <Slots block={block} />
      </Root>
    ),
    cards: (block) => (
      <Root block={block} className="cards">
        <Content block={block} />
        <Slots block={block} />
      </Root>
    ),
    card: (block) => (
      <Root block={block} as="article" className="card">
        <Content block={block} />
        <Slots block={block} />
      </Root>
    ),
    "note info warning danger success": (block) => (
      <Root block={block} as="aside" className={`callout ${block.type}`} role="note">
        <strong className="callout-mark">{block.type}</strong>
        <div className="callout-body">
          <Content block={block} />
        </div>
      </Root>
    ),
    "grid grid-2 grid-3 grid-auto": (block) => (
      <Root block={block} className={`grid ${block.type}`}>
        <Content block={block} />
        <Slots block={block} />
      </Root>
    ),
    split: (block) => (
      <Root block={block} className="split">
        <div className="split-pane">
          <Slot block={block} name="left" />
        </div>
        <div className="split-pane">
          <Slot block={block} name="right" />
        </div>
        <div className="split-flow">
          <Content block={block} />
        </div>
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
    accordion: (block) => (
      <Root block={block} className="accordion">
        <Content block={block} />
        <Slots block={block} />
      </Root>
    ),
    carousel: (block) => (
      <Root block={block} className="carousel">
        <Content block={block} />
        <Slots block={block} />
      </Root>
    ),
    details: (block) => (
      <Root block={block} as="details" className="details">
        <summary>{block.summary}</summary>
        <div className="details-body">
          <Content block={block} />
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
    ),
    form: (block) => (
      <Root block={block} as="form" className="form" method="post">
        <Content block={block} />
      </Root>
    ),
    scene: (block) => (
      <Root block={block} className="scene">
        <Content block={block} />
        <Slots block={block} />
      </Root>
    ),
    aside: (block) => (
      <Root block={block} as="aside" className="aside">
        <Content block={block} />
        <Slots block={block} />
      </Root>
    ),
    quote: (block) => (
      <Root block={block} as="blockquote" className="quote">
        <Content block={block} />
      </Root>
    ),
    footer: (block) => (
      <Root block={block} as="footer" className="footer">
        <Content block={block} />
      </Root>
    )
  }
});
