import type { ThemeBlockPackSource } from "@mds-crate/theme-loader";

export type BlockProfile =
  | "core"
  | "marketing"
  | "guidance"
  | "data"
  | "media"
  | "docs"
  | "forms"
  | "interactive"
  | "motion";

export interface BlockVocabularyEntry {
  name: string;
  profile: BlockProfile;
  purpose: string;
  slots?: readonly string[];
  attrs?: readonly string[];
  children?: readonly string[];
}

export const blockVocabulary = [
  {
    name: "page",
    profile: "core",
    purpose: "Top-level page body."
  },
  {
    name: "nav",
    profile: "core",
    purpose: "Navigation group of links or actions.",
    attrs: ["label"]
  },
  {
    name: "hero",
    profile: "core",
    purpose: "Primary first-viewport message.",
    slots: ["title", "body", "actions", "media"],
    attrs: ["variant", "tone", "motion", "delay", "duration"]
  },
  {
    name: "section",
    profile: "core",
    purpose: "Generic content section."
  },
  {
    name: "aside",
    profile: "core",
    purpose: "Secondary or supporting content."
  },
  {
    name: "footer",
    profile: "core",
    purpose: "Footer content."
  },
  {
    name: "cards",
    profile: "core",
    purpose: "Collection of card items.",
    children: ["card"],
    attrs: ["columns", "motion", "stagger"]
  },
  {
    name: "card",
    profile: "core",
    purpose: "General framed item.",
    attrs: ["variant", "tone", "highlighted"]
  },
  {
    name: "grid",
    profile: "core",
    purpose: "Generic responsive grid.",
    attrs: ["columns"]
  },
  {
    name: "grid-2",
    profile: "core",
    purpose: "Two-column grid."
  },
  {
    name: "grid-3",
    profile: "core",
    purpose: "Three-column grid."
  },
  {
    name: "grid-auto",
    profile: "core",
    purpose: "Auto-fit responsive grid."
  },
  {
    name: "split",
    profile: "core",
    purpose: "Two-pane layout.",
    slots: ["left", "right"]
  },
  {
    name: "note",
    profile: "core",
    purpose: "Neutral callout."
  },
  {
    name: "info",
    profile: "core",
    purpose: "Informational callout."
  },
  {
    name: "warning",
    profile: "core",
    purpose: "Risk or caution callout."
  },
  {
    name: "danger",
    profile: "core",
    purpose: "Critical or destructive warning."
  },
  {
    name: "success",
    profile: "core",
    purpose: "Positive status callout."
  },
  {
    name: "quote",
    profile: "core",
    purpose: "Pull quote or cited block."
  },
  {
    name: "details",
    profile: "core",
    purpose: "Native expandable detail."
  },
  {
    name: "cta",
    profile: "marketing",
    purpose: "Focused call to action.",
    slots: ["actions"]
  },
  {
    name: "features",
    profile: "marketing",
    purpose: "Collection of product features.",
    children: ["feature", "card"]
  },
  {
    name: "feature",
    profile: "marketing",
    purpose: "Single product feature.",
    attrs: ["label"]
  },
  {
    name: "stats",
    profile: "marketing",
    purpose: "Metric group.",
    children: ["stat"]
  },
  {
    name: "stat",
    profile: "marketing",
    purpose: "Single metric.",
    attrs: ["value", "label"]
  },
  {
    name: "logos",
    profile: "marketing",
    purpose: "Logo cloud.",
    children: ["logo"]
  },
  {
    name: "logo",
    profile: "marketing",
    purpose: "Single logo item."
  },
  {
    name: "testimonials",
    profile: "marketing",
    purpose: "Collection of testimonials.",
    children: ["testimonial"]
  },
  {
    name: "testimonial",
    profile: "marketing",
    purpose: "Quote with attribution.",
    attrs: ["author", "role"]
  },
  {
    name: "pricing",
    profile: "marketing",
    purpose: "Pricing table or plan group.",
    children: ["pricing-plan"]
  },
  {
    name: "pricing-plan",
    profile: "marketing",
    purpose: "Single pricing plan.",
    attrs: ["price", "highlighted"]
  },
  {
    name: "steps",
    profile: "guidance",
    purpose: "Ordered process or tutorial steps.",
    children: ["step"]
  },
  {
    name: "step",
    profile: "guidance",
    purpose: "One step in a process.",
    attrs: ["date", "label"]
  },
  {
    name: "timeline",
    profile: "guidance",
    purpose: "Sequential events.",
    children: ["step"]
  },
  {
    name: "faq",
    profile: "guidance",
    purpose: "Frequently asked questions.",
    children: ["details"]
  },
  {
    name: "comparison",
    profile: "data",
    purpose: "Compare options, features, or approaches.",
    children: ["card"]
  },
  {
    name: "metric",
    profile: "data",
    purpose: "Highlighted metric.",
    attrs: ["value", "label"]
  },
  {
    name: "progress",
    profile: "data",
    purpose: "Progress indicator.",
    attrs: ["value", "max", "label"]
  },
  {
    name: "badge",
    profile: "data",
    purpose: "Small status label.",
    attrs: ["tone"]
  },
  {
    name: "tag",
    profile: "data",
    purpose: "Small category label.",
    attrs: ["tone"]
  },
  {
    name: "media",
    profile: "media",
    purpose: "Generic media frame.",
    slots: ["caption"]
  },
  {
    name: "image",
    profile: "media",
    purpose: "Theme-framed image.",
    slots: ["caption"],
    attrs: ["src", "alt"]
  },
  {
    name: "video",
    profile: "media",
    purpose: "Theme-framed video.",
    slots: ["caption"],
    attrs: ["src"]
  },
  {
    name: "figure",
    profile: "media",
    purpose: "Figure with optional caption.",
    slots: ["caption"]
  },
  {
    name: "caption",
    profile: "media",
    purpose: "Caption text for nearby media."
  },
  {
    name: "gallery",
    profile: "media",
    purpose: "Media gallery.",
    children: ["figure", "image", "video"]
  },
  {
    name: "terminal",
    profile: "docs",
    purpose: "Terminal commands or transcript.",
    attrs: ["title"]
  },
  {
    name: "code-group",
    profile: "docs",
    purpose: "Grouped code samples in named slots."
  },
  {
    name: "file-tree",
    profile: "docs",
    purpose: "File tree display."
  },
  {
    name: "api",
    profile: "docs",
    purpose: "API reference group.",
    children: ["endpoint"]
  },
  {
    name: "endpoint",
    profile: "docs",
    purpose: "Single API endpoint.",
    attrs: ["method", "path"]
  },
  {
    name: "form",
    profile: "forms",
    purpose: "Native form container.",
    attrs: ["validate"]
  },
  {
    name: "fieldset",
    profile: "forms",
    purpose: "Group related form fields.",
    attrs: ["legend"]
  },
  {
    name: "button-group",
    profile: "forms",
    purpose: "Related form or action buttons."
  },
  {
    name: "input",
    profile: "forms",
    purpose: "Theme-controlled text-like input block.",
    attrs: ["type", "name", "label", "placeholder"]
  },
  {
    name: "select",
    profile: "forms",
    purpose: "Theme-controlled select block.",
    attrs: ["name", "label"]
  },
  {
    name: "textarea",
    profile: "forms",
    purpose: "Theme-controlled multiline input block.",
    attrs: ["name", "label", "placeholder"]
  },
  {
    name: "checkbox",
    profile: "forms",
    purpose: "Theme-controlled checkbox block.",
    attrs: ["name", "label"]
  },
  {
    name: "radio",
    profile: "forms",
    purpose: "Theme-controlled radio block.",
    attrs: ["name", "label", "value"]
  },
  {
    name: "switch",
    profile: "forms",
    purpose: "Theme-controlled switch block.",
    attrs: ["name", "label"]
  },
  {
    name: "tabs",
    profile: "interactive",
    purpose: "Tabbed content represented as named slots."
  },
  {
    name: "accordion",
    profile: "interactive",
    purpose: "Stacked collapsible sections represented as named slots."
  },
  {
    name: "carousel",
    profile: "interactive",
    purpose: "Horizontal browsing group.",
    children: ["figure", "card"]
  },
  {
    name: "dialog",
    profile: "interactive",
    purpose: "Dialog or modal-like content.",
    attrs: ["label"]
  },
  {
    name: "drawer",
    profile: "interactive",
    purpose: "Side drawer or secondary panel.",
    attrs: ["label"]
  },
  {
    name: "popover",
    profile: "interactive",
    purpose: "Small contextual panel.",
    attrs: ["label"]
  },
  {
    name: "tooltip",
    profile: "interactive",
    purpose: "Short hover or focus hint.",
    attrs: ["label"]
  },
  {
    name: "motion",
    profile: "motion",
    purpose: "Theme-owned motion wrapper.",
    attrs: ["preset", "trigger", "delay", "duration", "stagger", "once"]
  },
  {
    name: "reveal",
    profile: "motion",
    purpose: "Theme-owned reveal effect.",
    attrs: ["preset", "delay", "duration"]
  },
  {
    name: "scene",
    profile: "motion",
    purpose: "Rich visual or immersive section.",
    attrs: ["variant"]
  }
] as const satisfies readonly BlockVocabularyEntry[];

export const blockVocabularyByName: Readonly<Record<string, BlockVocabularyEntry>> = Object.fromEntries(
  blockVocabulary.map((block) => [block.name, block])
);

export const coreBlocks: ThemeBlockPackSource = {
  name: "@mds-crate/blocks/core",
  profiles: ["core"],
  supportedBlocks: [
    "page",
    "nav",
    "hero",
    "section",
    "aside",
    "footer",
    "cards",
    "card",
    "grid",
    "grid-2",
    "grid-3",
    "grid-auto",
    "split",
    "note",
    "info",
    "warning",
    "danger",
    "success",
    "quote",
    "details"
  ],
  blocks: "blocks",
  files: {
    "blocks/page.html": `<main{{ attrs }} class="page">
  {{ children }}
  {{ slots }}
</main>`,
    "blocks/nav.html": `<nav{{ attrs }} class="nav" aria-label="{{ attr:label:Navigation }}">
  {{ children }}
  {{ slots }}
</nav>`,
    "blocks/hero.html": `<section{{ attrs }} class="hero">
  <div class="hero-title">{{ slot:title }}</div>
  <div class="hero-body">{{ slot:body }}</div>
  <div class="hero-content">{{ children }}</div>
  <div class="hero-actions">{{ slot:actions }}</div>
  <div class="hero-media">{{ slot:media }}</div>
</section>`,
    "blocks/section.html": `<section{{ attrs }} class="section {{ type }}">
  {{ children }}
  {{ slots }}
</section>`,
    "blocks/aside.html": `<aside{{ attrs }} class="aside">
  {{ children }}
  {{ slots }}
</aside>`,
    "blocks/footer.html": `<footer{{ attrs }} class="footer">
  {{ children }}
  {{ slots }}
</footer>`,
    "blocks/cards.html": `<section{{ attrs }} class="cards">
  {{ children }}
  {{ slots }}
</section>`,
    "blocks/card.html": `<article{{ attrs }} class="card">
  {{ children }}
  {{ slots }}
</article>`,
    "blocks/grid.html": `<template data-block="grid grid-2 grid-3 grid-auto">
<section{{ attrs }} class="grid {{ type }}">
  {{ children }}
  {{ slots }}
</section>
</template>`,
    "blocks/split.html": `<section{{ attrs }} class="split">
  <div class="split-pane" data-slot="left">{{ slot:left }}</div>
  <div class="split-pane" data-slot="right">{{ slot:right }}</div>
  <div class="split-content">{{ children }}</div>
  {{ slots }}
</section>`,
    "blocks/callout.html": `<template data-block="note info warning danger success">
<aside{{ attrs }} class="callout {{ type }}" role="note">
  <strong class="callout-label">{{ type }}</strong>
  <div class="callout-body">{{ children }}</div>
  {{ slots }}
</aside>
</template>`,
    "blocks/quote.html": `<blockquote{{ attrs }} class="quote">
  {{ children }}
  {{ slots }}
</blockquote>`,
    "blocks/details.html": `<details{{ attrs }} class="details">
  <summary>{{ summary }}</summary>
  <div class="details-body">{{ children }}</div>
  {{ slots }}
</details>`
  }
};

export const marketingBlocks: ThemeBlockPackSource = {
  name: "@mds-crate/blocks/marketing",
  profiles: ["marketing"],
  supportedBlocks: [
    "cta",
    "features",
    "feature",
    "stats",
    "stat",
    "logos",
    "logo",
    "testimonials",
    "testimonial",
    "pricing",
    "pricing-plan"
  ],
  blocks: "blocks",
  files: {
    "blocks/cta.html": `<section{{ attrs }} class="cta">
  {{ children }}
  {{ slots }}
</section>`,
    "blocks/features.html": `<section{{ attrs }} class="features">
  {{ children }}
  {{ slots }}
</section>`,
    "blocks/feature.html": `<article{{ attrs }} class="feature">
  {{ children }}
  {{ slots }}
</article>`,
    "blocks/stats.html": `<section{{ attrs }} class="stats">
  {{ children }}
  {{ slots }}
</section>`,
    "blocks/stat.html": `<article{{ attrs }} class="stat">
  <strong class="stat-value">{{ attr:value }}</strong>
  <span class="stat-label">{{ attr:label }}</span>
  <div class="stat-body">{{ children }}</div>
  {{ slots }}
</article>`,
    "blocks/logos.html": `<section{{ attrs }} class="logos">
  {{ children }}
  {{ slots }}
</section>`,
    "blocks/logo.html": `<div{{ attrs }} class="logo">
  {{ children }}
</div>`,
    "blocks/testimonials.html": `<section{{ attrs }} class="testimonials">
  {{ children }}
  {{ slots }}
</section>`,
    "blocks/testimonial.html": `<figure{{ attrs }} class="testimonial">
  <blockquote>{{ children }}</blockquote>
  <figcaption>
    <strong>{{ attr:author }}</strong>
    <span>{{ attr:role }}</span>
  </figcaption>
  {{ slots }}
</figure>`,
    "blocks/pricing.html": `<section{{ attrs }} class="pricing">
  {{ children }}
  {{ slots }}
</section>`,
    "blocks/pricing-plan.html": `<article{{ attrs }} class="pricing-plan">
  <div class="pricing-price">{{ attr:price }}</div>
  {{ children }}
  {{ slots }}
</article>`
  }
};

export const guidanceBlocks: ThemeBlockPackSource = {
  name: "@mds-crate/blocks/guidance",
  profiles: ["guidance"],
  supportedBlocks: ["steps", "step", "timeline", "faq"],
  blocks: "blocks",
  files: {
    "blocks/steps.html": `<section{{ attrs }} class="steps">
  {{ children }}
  {{ slots }}
</section>`,
    "blocks/step.html": `<article{{ attrs }} class="step">
  <span class="step-label">{{ attr:label }}</span>
  <time class="step-date">{{ attr:date }}</time>
  {{ children }}
  {{ slots }}
</article>`,
    "blocks/timeline.html": `<section{{ attrs }} class="timeline">
  {{ children }}
  {{ slots }}
</section>`,
    "blocks/faq.html": `<section{{ attrs }} class="faq">
  {{ children }}
  {{ slots }}
</section>`
  }
};

export const dataBlocks: ThemeBlockPackSource = {
  name: "@mds-crate/blocks/data",
  profiles: ["data"],
  supportedBlocks: ["comparison", "metric", "progress", "badge", "tag"],
  blocks: "blocks",
  files: {
    "blocks/comparison.html": `<section{{ attrs }} class="comparison">
  {{ children }}
  {{ slots }}
</section>`,
    "blocks/metric.html": `<article{{ attrs }} class="metric">
  <strong class="metric-value">{{ attr:value }}</strong>
  <span class="metric-label">{{ attr:label }}</span>
  <div class="metric-body">{{ children }}</div>
  {{ slots }}
</article>`,
    "blocks/progress.html": `<figure{{ attrs }} class="progress">
  <progress value="{{ attr:value:0 }}" max="{{ attr:max:100 }}"></progress>
  <figcaption>{{ attr:label }}</figcaption>
  {{ children }}
  {{ slots }}
</figure>`,
    "blocks/badge.html": `<span{{ attrs }} class="badge {{ type }}">
  {{ children }}
</span>`,
    "blocks/tag.html": `<span{{ attrs }} class="tag {{ type }}">
  {{ children }}
</span>`
  }
};

export const mediaBlocks: ThemeBlockPackSource = {
  name: "@mds-crate/blocks/media",
  profiles: ["media"],
  supportedBlocks: ["media", "image", "video", "figure", "caption", "gallery"],
  blocks: "blocks",
  files: {
    "blocks/media.html": `<figure{{ attrs }} class="media">
  {{ children }}
  <figcaption>{{ slot:caption }}</figcaption>
  {{ slots }}
</figure>`,
    "blocks/image.html": `<figure{{ attrs }} class="image">
  <img src="{{ attr:src }}" alt="{{ attr:alt }}">
  <figcaption>{{ slot:caption }}</figcaption>
  <div class="image-fallback">{{ children }}</div>
  {{ slots }}
</figure>`,
    "blocks/video.html": `<figure{{ attrs }} class="video">
  <video src="{{ attr:src }}" controls>{{ children }}</video>
  <figcaption>{{ slot:caption }}</figcaption>
  {{ slots }}
</figure>`,
    "blocks/figure.html": `<figure{{ attrs }} class="figure">
  {{ children }}
  <figcaption>{{ slot:caption }}</figcaption>
  {{ slots }}
</figure>`,
    "blocks/caption.html": `<figcaption{{ attrs }} class="caption">
  {{ children }}
</figcaption>`,
    "blocks/gallery.html": `<section{{ attrs }} class="gallery">
  {{ children }}
  {{ slots }}
</section>`
  }
};

export const docsBlocks: ThemeBlockPackSource = {
  name: "@mds-crate/blocks/docs",
  profiles: ["docs"],
  supportedBlocks: ["terminal", "code-group", "file-tree", "api", "endpoint"],
  blocks: "blocks",
  files: {
    "blocks/terminal.html": `<section{{ attrs }} class="terminal">
  <div class="terminal-title">{{ attr:title:Terminal }}</div>
  <div class="terminal-body">{{ children }}</div>
  {{ slots }}
</section>`,
    "blocks/code-group.html": `<section{{ attrs }} class="code-group">
  {{ slots }}
  <div class="code-group-body">{{ children }}</div>
</section>`,
    "blocks/file-tree.html": `<section{{ attrs }} class="file-tree">
  {{ children }}
  {{ slots }}
</section>`,
    "blocks/api.html": `<section{{ attrs }} class="api">
  {{ children }}
  {{ slots }}
</section>`,
    "blocks/endpoint.html": `<article{{ attrs }} class="endpoint">
  <header class="endpoint-header">
    <span class="endpoint-method">{{ attr:method }}</span>
    <code class="endpoint-path">{{ attr:path }}</code>
  </header>
  {{ children }}
  {{ slots }}
</article>`
  }
};

export const formsBlocks: ThemeBlockPackSource = {
  name: "@mds-crate/blocks/forms",
  profiles: ["forms"],
  supportedBlocks: ["form", "fieldset", "button-group", "input", "select", "textarea", "checkbox", "radio", "switch"],
  blocks: "blocks",
  files: {
    "blocks/form.html": `<form{{ attrs }} class="form" method="post">
  {{ children }}
  {{ slots }}
</form>`,
    "blocks/fieldset.html": `<fieldset{{ attrs }} class="fieldset">
  <legend>{{ attr:legend }}</legend>
  {{ children }}
  {{ slots }}
</fieldset>`,
    "blocks/button-group.html": `<div{{ attrs }} class="button-group">
  {{ children }}
  {{ slots }}
</div>`,
    "blocks/input.html": `<div{{ attrs }} class="input">
  {{ children }}
</div>`,
    "blocks/select.html": `<div{{ attrs }} class="select">
  {{ children }}
</div>`,
    "blocks/textarea.html": `<div{{ attrs }} class="textarea">
  {{ children }}
</div>`,
    "blocks/checkbox.html": `<div{{ attrs }} class="checkbox">
  {{ children }}
</div>`,
    "blocks/radio.html": `<div{{ attrs }} class="radio">
  {{ children }}
</div>`,
    "blocks/switch.html": `<div{{ attrs }} class="switch">
  {{ children }}
</div>`
  }
};

export const interactiveBlocks: ThemeBlockPackSource = {
  name: "@mds-crate/blocks/interactive",
  profiles: ["interactive"],
  supportedBlocks: ["tabs", "accordion", "carousel", "dialog", "drawer", "popover", "tooltip"],
  blocks: "blocks",
  actions: ["open", "close", "show", "hide", "toggle"],
  files: {
    "blocks/tabs.html": `<section{{ attrs }} class="tabs">
  {{ slots }}
  <div class="tabs-body">{{ children }}</div>
</section>`,
    "blocks/accordion.html": `<section{{ attrs }} class="accordion">
  {{ slots }}
  <div class="accordion-body">{{ children }}</div>
</section>`,
    "blocks/carousel.html": `<section{{ attrs }} class="carousel">
  {{ children }}
  {{ slots }}
</section>`,
    "blocks/dialog.html": `<section{{ attrs }} class="dialog" role="dialog" aria-label="{{ attr:label:Dialog }}">
  {{ children }}
  {{ slots }}
</section>`,
    "blocks/drawer.html": `<aside{{ attrs }} class="drawer" aria-label="{{ attr:label:Drawer }}">
  {{ children }}
  {{ slots }}
</aside>`,
    "blocks/popover.html": `<details{{ attrs }} class="popover">
  <summary>{{ attr:label:More }}</summary>
  <div class="popover-body">{{ children }}</div>
  {{ slots }}
</details>`,
    "blocks/tooltip.html": `<span{{ attrs }} class="tooltip" data-tooltip="{{ attr:label }}">
  {{ children }}
</span>`
  }
};

export const motionBlocks: ThemeBlockPackSource = {
  name: "@mds-crate/blocks/motion",
  profiles: ["motion"],
  supportedBlocks: ["motion", "reveal", "scene"],
  blocks: "blocks",
  files: {
    "blocks/motion.html": `<section{{ attrs }} class="motion">
  {{ children }}
  {{ slots }}
</section>`,
    "blocks/reveal.html": `<section{{ attrs }} class="reveal">
  {{ children }}
  {{ slots }}
</section>`,
    "blocks/scene.html": `<section{{ attrs }} class="scene">
  {{ children }}
  {{ slots }}
</section>`
  }
};

export const standardBlocks = [
  coreBlocks,
  marketingBlocks,
  guidanceBlocks,
  dataBlocks,
  mediaBlocks,
  docsBlocks,
  formsBlocks,
  interactiveBlocks,
  motionBlocks
] as const;

export const blockPacksByName: Readonly<Record<string, ThemeBlockPackSource>> = Object.fromEntries(
  standardBlocks.map((pack) => [pack.name, pack])
);
