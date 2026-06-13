/** @jsx jsx */
import { Content, Slot, defineJsxTheme, jsx } from "../../../packages/theme-loader/src/jsx";
import { Flow, Surface } from "./components/Surface.tsx";

export default defineJsxTheme({
  name: "clarity",
  label: "MDS Clarity",
  description: "A package-style theme example with separated source and built artifacts.",
  author: "MDS",
  preview: "preview.svg",
  tags: ["package", "example", "clean"],
  supportedBlocks: ["page", "hero", "section", "cards", "card", "note", "info", "warning", "footer"],
  actions: ["toggle"],
  blocks: {
    page: (block) => (
      <Surface block={block} as="main" className="page">
        <Flow block={block} />
      </Surface>
    ),
    hero: (block) => (
      <Surface block={block} className="hero">
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
      </Surface>
    ),
    section: (block) => <Surface block={block} className="section" />,
    cards: (block) => <Surface block={block} className="cards" />,
    card: (block) => <Surface block={block} as="article" className="card" />,
    "note info warning": (block) => (
      <Surface block={block} as="aside" className={`callout ${block.type}`}>
        <strong className="callout-label">{block.type}</strong>
        <div className="callout-body">
          <Content block={block} />
        </div>
      </Surface>
    ),
    footer: (block) => <Surface block={block} as="footer" className="footer" />
  }
});
