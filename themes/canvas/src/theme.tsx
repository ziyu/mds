import React from "react";
import { Content, Slot, Slots, defineReactTheme } from "@mds-crate/theme-sdk-react";
import { Badge, Card, Flow, Panel, Surface } from "./components/ui.js";

export default defineReactTheme({
  name: "canvas",
  label: "Canvas",
  description: "A polished package theme for spacious MDS previews and standalone pages.",
  author: "MDS",
  preview: "preview.svg",
  tags: ["tailwind", "react", "canvas", "package"],
  supportedBlocks: [
    "page",
    "nav",
    "hero",
    "section",
    "split",
    "grid",
    "grid-2",
    "grid-3",
    "grid-auto",
    "cards",
    "card",
    "note",
    "info",
    "warning",
    "danger",
    "success",
    "quote",
    "cta",
    "stats",
    "stat",
    "features",
    "feature",
    "logos",
    "logo",
    "steps",
    "step",
    "faq",
    "timeline",
    "testimonials",
    "testimonial",
    "pricing",
    "pricing-plan",
    "gallery",
    "figure",
    "caption",
    "media",
    "image",
    "video",
    "comparison",
    "badge",
    "tag",
    "metric",
    "progress",
    "popover",
    "tooltip",
    "terminal",
    "code-group",
    "file-tree",
    "api",
    "endpoint",
    "details",
    "tabs",
    "accordion",
    "carousel",
    "dialog",
    "drawer",
    "form",
    "fieldset",
    "button-group",
    "motion",
    "reveal",
    "scene",
    "aside",
    "sticky",
    "footer"
  ],
  actions: ["toggle", "open", "close", "show", "hide"],
  blocks: {
    page: (block) => (
      <Surface
        block={block}
        as="main"
        className="mx-auto grid min-h-screen w-full max-w-6xl gap-12 px-6 py-12 sm:px-8 sm:py-14 lg:px-10 lg:py-16"
      >
        <Content block={block} />
      </Surface>
    ),
    nav: (block) => (
      <Surface
        block={block}
        as="nav"
        motion="drop-in"
        duration={520}
        className="sticky top-4 z-20 mx-auto flex w-[min(100%,72rem)] flex-wrap items-center gap-3 rounded-xl border border-border/80 bg-background/88 px-4 py-3 text-sm shadow-sm backdrop-blur sm:px-5"
      >
        <Content block={block} />
      </Surface>
    ),
    hero: (block) => (
      <Surface
        block={block}
        motion="hero-rise"
        duration={920}
        stagger={90}
        className="mds-hero grid gap-8 rounded-2xl border border-border bg-card p-7 shadow-sm sm:p-10 lg:grid-cols-[1fr_0.82fr] lg:items-center lg:p-12"
      >
        <div className="grid gap-6">
          <div className="grid gap-4">
            <div className="mds-hero-title text-balance">
              <Slot block={block} name="title" />
            </div>
            <div className="mds-hero-body max-w-2xl text-base text-muted-foreground sm:text-lg">
              <Slot block={block} name="body" />
            </div>
            <div className="mds-hero-flow max-w-2xl">
              <Content block={block} />
            </div>
          </div>
          <div className="mds-actions flex flex-wrap gap-2">
            <Slot block={block} name="actions" />
          </div>
        </div>
        <div className="mds-hero-media rounded-xl border border-border bg-muted/50 p-4">
          <Slot block={block} name="media" />
        </div>
      </Surface>
    ),
    section: (block) => (
      <Surface block={block} motion="fade-up" duration={680} className="grid gap-6 rounded-xl border border-border bg-background p-6 sm:p-7">
        <Flow block={block} />
      </Surface>
    ),
    scene: (block) => (
      <Panel block={block} className="scene overflow-hidden">
        <Flow block={block} />
      </Panel>
    ),
    motion: (block) => (
      <Surface block={block} motionAttr="preset" className="motion-block grid gap-5">
        <Flow block={block} />
      </Surface>
    ),
    reveal: (block) => (
      <Surface block={block} motion={block.attr("preset", "reveal")} duration={block.attr("duration", "760")} className="reveal-block">
        <Flow block={block} />
      </Surface>
    ),
    split: (block) => (
      <Surface block={block} motion="fade-up" duration={680} stagger={90} className="grid gap-5 lg:grid-cols-2">
        <Slots block={block} />
        <Content block={block} />
      </Surface>
    ),
    "grid grid-auto": (block) => (
      <Surface block={block} motion="fade-up" duration={680} stagger={70} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Content block={block} />
        <Slots block={block} />
      </Surface>
    ),
    "grid-2": (block) => (
      <Surface block={block} motion="fade-up" duration={680} stagger={80} className="grid gap-5 md:grid-cols-2">
        <Content block={block} />
        <Slots block={block} />
      </Surface>
    ),
    "grid-3": (block) => (
      <Surface block={block} motion="fade-up" duration={680} stagger={70} className="grid gap-5 md:grid-cols-3">
        <Content block={block} />
        <Slots block={block} />
      </Surface>
    ),
    cards: (block) => (
      <Surface block={block} motion="fade-up" duration={720} stagger={80} className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <Content block={block} />
        <Slots block={block} />
      </Surface>
    ),
    card: (block) => <Card block={block} className="p-6" />,
    "note info warning danger success": (block) => (
      <Surface block={block} as="aside" motion="slide-left" duration={620} className={`mds-callout ${block.type} rounded-xl border bg-card p-5 shadow-xs`}>
        <Badge tone="muted">{block.type}</Badge>
        <Flow block={block} className="mt-3" />
      </Surface>
    ),
    quote: (block) => (
      <Surface block={block} as="blockquote" motion="reveal" duration={760} className="rounded-xl border-l-4 border-primary bg-muted/50 px-6 py-5 text-lg text-foreground">
        <Content block={block} />
      </Surface>
    ),
    cta: (block) => (
      <Surface block={block} motion="reveal" duration={760} className="cta rounded-2xl border border-border bg-card p-7 shadow-sm sm:p-9">
        <Flow block={block} />
      </Surface>
    ),
    stats: (block) => (
      <Surface block={block} motion="fade-up" duration={680} stagger={70} className="stats grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Content block={block} />
        <Slots block={block} />
      </Surface>
    ),
    stat: (block) => (
      <Surface block={block} as="article" motion="scale-in" duration={540} className="stat rounded-xl border border-border bg-card p-5 shadow-xs">
        <strong className="stat-value">{block.attr("value")}</strong>
        <span className="stat-label">{block.attr("label")}</span>
        <Flow block={block} className="stat-body" />
      </Surface>
    ),
    features: (block) => (
      <Surface block={block} motion="fade-up" duration={700} stagger={80} className="features grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <Content block={block} />
        <Slots block={block} />
      </Surface>
    ),
    feature: (block) => (
      <Surface block={block} as="article" motion="scale-in" duration={560} className="feature rounded-xl border border-border bg-card p-6 shadow-xs">
        <Badge tone="muted">{block.attr("label", "Feature")}</Badge>
        <Flow block={block} className="feature-body" />
      </Surface>
    ),
    logos: (block) => (
      <Surface block={block} motion="fade-up" duration={640} stagger={55} className="logos">
        <Content block={block} />
        <Slots block={block} />
      </Surface>
    ),
    logo: (block) => (
      <Surface block={block} as="div" motion="scale-in" duration={460} className="logo">
        <Content block={block} />
      </Surface>
    ),
    "steps timeline": (block) => (
      <Surface block={block} motion="fade-up" duration={700} stagger={90} className={`${block.type} grid gap-4`}>
        <Content block={block} />
        <Slots block={block} />
      </Surface>
    ),
    step: (block) => (
      <Surface block={block} as="article" motion="fade-up" duration={560} className="step rounded-xl border border-border bg-card p-5 shadow-xs">
        <span className="step-marker">{block.attr("date")}</span>
        <Flow block={block} />
      </Surface>
    ),
    faq: (block) => (
      <Surface block={block} motion="fade-up" duration={680} stagger={70} className="faq grid gap-3">
        <Content block={block} />
        <Slots block={block} />
      </Surface>
    ),
    testimonials: (block) => (
      <Surface block={block} motion="fade-up" duration={700} stagger={80} className="testimonials grid gap-5 md:grid-cols-2">
        <Content block={block} />
        <Slots block={block} />
      </Surface>
    ),
    testimonial: (block) => (
      <Surface block={block} as="figure" motion="scale-in" duration={560} className="testimonial rounded-xl border border-border bg-card p-6 shadow-xs">
        <blockquote>
          <Content block={block} />
        </blockquote>
        <figcaption>
          <strong>{block.attr("author", "Anonymous")}</strong>
          <span>{block.attr("role")}</span>
        </figcaption>
      </Surface>
    ),
    pricing: (block) => (
      <Surface block={block} motion="fade-up" duration={700} stagger={90} className="pricing grid gap-5 lg:grid-cols-3">
        <Content block={block} />
        <Slots block={block} />
      </Surface>
    ),
    "pricing-plan": (block) => (
      <Surface block={block} as="article" motion="scale-in" duration={560} className="pricing-plan rounded-xl border border-border bg-card p-6 shadow-xs">
        <div className="pricing-price">{block.attr("price")}</div>
        <Flow block={block} />
      </Surface>
    ),
    gallery: (block) => (
      <Surface block={block} motion="fade-up" duration={700} stagger={80} className="gallery grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Content block={block} />
        <Slots block={block} />
      </Surface>
    ),
    figure: (block) => (
      <Surface block={block} as="figure" motion="scale-in" duration={560} className="figure rounded-xl border border-border bg-card p-3 shadow-xs">
        <div className="figure-media">
          <Content block={block} />
        </div>
        <figcaption className="figure-caption">
          <Slot block={block} name="caption" />
        </figcaption>
      </Surface>
    ),
    caption: (block) => (
      <Surface block={block} as="figcaption" className="caption text-sm text-muted-foreground">
        <Content block={block} />
      </Surface>
    ),
    media: (block) => (
      <Surface block={block} motion="scale-in" duration={560} className="media-frame rounded-xl border border-border bg-card p-3 shadow-xs">
        <Flow block={block} />
      </Surface>
    ),
    image: (block) => (
      <Surface block={block} as="figure" motion="scale-in" duration={560} className="image-block rounded-xl border border-border bg-card p-3 shadow-xs">
        <img src={block.attr("src")} alt={block.attr("alt")} loading="lazy" />
        <figcaption>
          <Content block={block} />
          <Slot block={block} name="caption" />
        </figcaption>
      </Surface>
    ),
    video: (block) => (
      <Surface block={block} as="figure" motion="scale-in" duration={560} className="video-block rounded-xl border border-border bg-card p-3 shadow-xs">
        <video src={block.attr("src")} poster={block.attr("poster")} controls playsInline preload="metadata" />
        <figcaption>
          <Content block={block} />
          <Slot block={block} name="caption" />
        </figcaption>
      </Surface>
    ),
    comparison: (block) => (
      <Surface block={block} motion="fade-up" duration={700} stagger={80} className="comparison grid gap-5 md:grid-cols-2">
        <Content block={block} />
        <Slots block={block} />
      </Surface>
    ),
    "badge tag": (block) => (
      <Surface block={block} as="div" className={`${block.type} token`}>
        <Content block={block} />
      </Surface>
    ),
    metric: (block) => (
      <Surface block={block} as="article" motion="scale-in" duration={540} className="metric rounded-xl border border-border bg-card p-5 shadow-xs">
        <strong className="metric-value">{block.attr("value")}</strong>
        <span className="metric-label">{block.attr("label")}</span>
        <Flow block={block} />
      </Surface>
    ),
    progress: (block) => (
      <Surface block={block} as="div" motion="fade-up" duration={540} className="progress-block rounded-xl border border-border bg-card p-5 shadow-xs">
        <div className="progress-copy">
          <strong>{block.attr("label", "Progress")}</strong>
          <span>{block.attr("value", "0")}/{block.attr("max", "100")}</span>
        </div>
        <progress value={block.attr("value", "0")} max={block.attr("max", "100")} />
        <Flow block={block} />
      </Surface>
    ),
    popover: (block) => (
      <Surface block={block} as="details" motion="scale-in" duration={520} className="popover rounded-xl border border-border bg-card p-4 shadow-xs">
        <summary>{block.attr("label", "More")}</summary>
        <Flow block={block} className="popover-body" />
      </Surface>
    ),
    tooltip: (block) => (
      <Surface block={block} as="div" className="tooltip" tabIndex={0}>
        <span className="tooltip-label">{block.attr("label", "Tip")}</span>
        <Flow block={block} className="tooltip-body" />
      </Surface>
    ),
    terminal: (block) => (
      <Surface block={block} motion="reveal" duration={680} className="terminal rounded-xl border border-border bg-card shadow-xs">
        <div className="terminal-bar">
          <span />
          <span />
          <span />
          <strong>{block.attr("title", "Terminal")}</strong>
        </div>
        <Flow block={block} className="terminal-body" />
      </Surface>
    ),
    "code-group": (block) => (
      <Surface block={block} motion="fade-up" duration={680} className="code-group rounded-xl border border-border bg-card p-3 shadow-xs">
        <Slots block={block} />
        <Content block={block} />
      </Surface>
    ),
    "file-tree": (block) => (
      <Surface block={block} motion="reveal" duration={620} className="file-tree rounded-xl border border-border bg-card p-4 shadow-xs">
        <Flow block={block} />
      </Surface>
    ),
    api: (block) => (
      <Surface block={block} motion="fade-up" duration={700} stagger={80} className="api grid gap-4">
        <Content block={block} />
        <Slots block={block} />
      </Surface>
    ),
    endpoint: (block) => (
      <Surface block={block} as="article" motion="scale-in" duration={560} className="endpoint rounded-xl border border-border bg-card p-5 shadow-xs">
        <header className="endpoint-head">
          <strong>{block.attr("method", "GET")}</strong>
          <code>{block.attr("path")}</code>
        </header>
        <Flow block={block} />
      </Surface>
    ),
    details: (block) => (
      <Surface block={block} as="details" motion="fade-up" duration={620} className="group rounded-xl border border-border bg-card p-5 shadow-xs">
        <summary className="cursor-pointer select-none font-medium text-foreground">{block.summary}</summary>
        <Flow block={block} className="mt-3" />
      </Surface>
    ),
    accordion: (block) => (
      <Surface block={block} motion="fade-up" duration={680} stagger={70} className="mds-accordion divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        <Slots block={block} />
        <Content block={block} />
      </Surface>
    ),
    tabs: (block) => (
      <Surface block={block} motion="scale-in" duration={620} className="mds-tabs rounded-xl border border-border bg-card p-3 shadow-xs">
        <Slots block={block} />
        <Content block={block} />
      </Surface>
    ),
    carousel: (block) => (
      <Surface block={block} motion="fade-up" duration={700} stagger={80} className="mds-carousel flex snap-x gap-5 overflow-x-auto rounded-xl border border-border bg-card p-5 shadow-xs">
        <Slots block={block} />
        <Content block={block} />
      </Surface>
    ),
    dialog: (block) => (
      <Panel block={block} className="mds-dialog mx-auto max-w-2xl ring-1 ring-ring/15" hidden>
        <Flow block={block} />
      </Panel>
    ),
    drawer: (block) => (
      <Surface block={block} as="aside" className="mds-drawer rounded-xl border border-border bg-card p-6 shadow-sm md:ml-auto md:max-w-sm" hidden>
        <Flow block={block} />
      </Surface>
    ),
    form: (block) => (
      <Surface block={block} as="form" motion="fade-up" duration={700} stagger={70} className="grid max-w-4xl gap-6 rounded-xl border border-border bg-card p-6 shadow-xs sm:p-8">
        <Flow block={block} />
      </Surface>
    ),
    fieldset: (block) => (
      <Surface block={block} as="fieldset" motion="fade-up" duration={560} className="fieldset rounded-xl border border-border bg-background p-5">
        <legend>{block.attr("legend")}</legend>
        <Flow block={block} />
      </Surface>
    ),
    "button-group": (block) => (
      <Surface block={block} as="div" motion="fade-up" duration={520} className="button-group">
        <Content block={block} />
        <Slots block={block} />
      </Surface>
    ),
    aside: (block) => (
      <Surface block={block} as="aside" motion="slide-left" duration={620} className="rounded-xl border border-border bg-muted/45 p-5 text-sm text-muted-foreground">
        <Flow block={block} />
      </Surface>
    ),
    sticky: (block) => (
      <Surface block={block} motion="drop-in" duration={560} className="sticky top-24 rounded-xl border border-border bg-card p-5 shadow-sm">
        <Flow block={block} />
      </Surface>
    ),
    footer: (block) => (
      <Surface block={block} as="footer" motion="fade-up" duration={620} className="border-t border-border py-6 text-sm text-muted-foreground">
        <Flow block={block} />
      </Surface>
    )
  }
});
