import React from "react";
import { Content, Slot, Slots, defineReactTheme } from "@mds/theme-sdk-react";
import { Badge, Card, Flow, Panel, Surface } from "./components/ui.js";

export default defineReactTheme({
  name: "studio",
  label: "MDS Studio",
  description: "A polished package theme for spacious MDS previews and standalone pages.",
  author: "MDS",
  preview: "preview.svg",
  tags: ["tailwind", "react", "studio", "package"],
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
    "details",
    "tabs",
    "accordion",
    "carousel",
    "dialog",
    "drawer",
    "form",
    "scene",
    "aside",
    "sticky",
    "footer"
  ],
  actions: ["toggle", "open", "close", "show", "hide"],
  blocks: {
    page: (block) => (
      <Surface block={block} as="main" className="mx-auto grid min-h-screen w-full max-w-6xl gap-12 px-6 py-12 sm:px-8 sm:py-14 lg:px-10 lg:py-16">
        <Content block={block} />
      </Surface>
    ),
    nav: (block) => (
      <Surface
        block={block}
        as="nav"
        className="sticky top-4 z-20 mx-auto flex w-[min(100%,72rem)] flex-wrap items-center gap-3 rounded-xl border border-border/80 bg-background/88 px-4 py-3 text-sm shadow-sm backdrop-blur sm:px-5"
      >
        <Content block={block} />
      </Surface>
    ),
    hero: (block) => (
      <Surface block={block} className="mds-hero grid gap-8 rounded-2xl border border-border bg-card p-7 shadow-sm sm:p-10 lg:grid-cols-[1fr_0.82fr] lg:items-center lg:p-12">
        <div className="grid gap-6">
          <div className="grid gap-4">
            <Badge tone="muted">MDS</Badge>
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
      <Surface block={block} className="grid gap-6 rounded-xl border border-border bg-background p-6 sm:p-7">
        <Flow block={block} />
      </Surface>
    ),
    scene: (block) => (
      <Panel block={block} className="overflow-hidden bg-[linear-gradient(135deg,var(--muted),transparent_55%),linear-gradient(180deg,var(--card),var(--background))]">
        <Flow block={block} />
      </Panel>
    ),
    split: (block) => (
      <Surface block={block} className="grid gap-5 lg:grid-cols-2">
        <Slots block={block} />
        <Content block={block} />
      </Surface>
    ),
    "grid grid-auto": (block) => (
      <Surface block={block} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Content block={block} />
        <Slots block={block} />
      </Surface>
    ),
    "grid-2": (block) => (
      <Surface block={block} className="grid gap-5 md:grid-cols-2">
        <Content block={block} />
        <Slots block={block} />
      </Surface>
    ),
    "grid-3": (block) => (
      <Surface block={block} className="grid gap-5 md:grid-cols-3">
        <Content block={block} />
        <Slots block={block} />
      </Surface>
    ),
    cards: (block) => (
      <Surface block={block} className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <Content block={block} />
        <Slots block={block} />
      </Surface>
    ),
    card: (block) => <Card block={block} className="p-6" />,
    "note info warning danger success": (block) => (
      <Surface block={block} as="aside" className={`mds-callout ${block.type} rounded-xl border bg-card p-5 shadow-xs`}>
        <Badge tone="muted">{block.type}</Badge>
        <Flow block={block} className="mt-3" />
      </Surface>
    ),
    quote: (block) => (
      <Surface block={block} as="blockquote" className="rounded-xl border-l-4 border-primary bg-muted/50 px-6 py-5 text-lg text-foreground">
        <Content block={block} />
      </Surface>
    ),
    details: (block) => (
      <Surface block={block} as="details" className="group rounded-xl border border-border bg-card p-5 shadow-xs">
        <summary className="cursor-pointer select-none font-medium text-foreground">{block.summary}</summary>
        <Flow block={block} className="mt-3" />
      </Surface>
    ),
    accordion: (block) => (
      <Surface block={block} className="mds-accordion divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        <Slots block={block} />
        <Content block={block} />
      </Surface>
    ),
    tabs: (block) => (
      <Surface block={block} className="mds-tabs rounded-xl border border-border bg-card p-3 shadow-xs">
        <Slots block={block} />
        <Content block={block} />
      </Surface>
    ),
    carousel: (block) => (
      <Surface block={block} className="mds-carousel flex snap-x gap-5 overflow-x-auto rounded-xl border border-border bg-card p-5 shadow-xs">
        <Slots block={block} />
        <Content block={block} />
      </Surface>
    ),
    dialog: (block) => (
      <Panel block={block} className="mx-auto max-w-2xl ring-1 ring-ring/15" hidden>
        <Flow block={block} />
      </Panel>
    ),
    drawer: (block) => (
      <Surface block={block} as="aside" className="rounded-xl border border-border bg-card p-6 shadow-sm md:ml-auto md:max-w-sm" hidden>
        <Flow block={block} />
      </Surface>
    ),
    form: (block) => (
      <Surface block={block} as="form" className="grid max-w-4xl gap-6 rounded-xl border border-border bg-card p-6 shadow-xs sm:p-8">
        <Flow block={block} />
      </Surface>
    ),
    aside: (block) => (
      <Surface block={block} as="aside" className="rounded-xl border border-border bg-muted/45 p-5 text-sm text-muted-foreground">
        <Flow block={block} />
      </Surface>
    ),
    sticky: (block) => (
      <Surface block={block} className="sticky top-24 rounded-xl border border-border bg-card p-5 shadow-sm">
        <Flow block={block} />
      </Surface>
    ),
    footer: (block) => (
      <Surface block={block} as="footer" className="border-t border-border py-6 text-sm text-muted-foreground">
        <Flow block={block} />
      </Surface>
    )
  }
});
