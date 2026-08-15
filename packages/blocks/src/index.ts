import type { ThemeBlockPackSource } from "@mds-crate/theme-loader";
import { blockEnhancementsScript } from "./runtime.js";
import { blockFoundationStyles } from "./styles.js";

export type BlockProfile =
  | "core"
  | "marketing"
  | "guidance"
  | "data"
  | "media"
  | "docs"
  | "display"
  | "navigation"
  | "controls"
  | "forms"
  | "interactive"
  | "menus"
  | "chat"
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
    name: "avatar",
    profile: "display",
    purpose: "Compact identity image with a text fallback.",
    attrs: ["src", "alt", "fallback", "size"]
  },
  {
    name: "empty",
    profile: "display",
    purpose: "Empty-state message with optional media and actions.",
    slots: ["media", "title", "description", "actions"]
  },
  {
    name: "item",
    profile: "display",
    purpose: "Versatile content row with media, copy, actions, and footer.",
    slots: ["media", "title", "description", "actions", "footer"],
    attrs: ["variant", "size"]
  },
  {
    name: "breadcrumb",
    profile: "navigation",
    purpose: "Hierarchical navigation path.",
    children: ["breadcrumb-item"],
    attrs: ["label"]
  },
  {
    name: "breadcrumb-item",
    profile: "navigation",
    purpose: "Single link in a breadcrumb path.",
    attrs: ["label", "href", "current"]
  },
  {
    name: "pagination",
    profile: "navigation",
    purpose: "Navigation between pages or result ranges.",
    attrs: ["label", "current", "pages"]
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
    name: "data-table",
    profile: "data",
    purpose: "Native table with optional filtering, sorting, pagination, and row selection enhancement.",
    slots: ["columns", "rows", "empty"],
    attrs: ["label", "filter", "page-size", "selectable"]
  },
  {
    name: "data-column",
    profile: "data",
    purpose: "Column definition for a data table.",
    attrs: ["key", "label", "sortable"]
  },
  {
    name: "data-row",
    profile: "data",
    purpose: "Native row in a data table.",
    attrs: ["id", "selected", "disabled"],
    children: ["data-cell"]
  },
  {
    name: "data-cell",
    profile: "data",
    purpose: "Native cell associated with a data table column.",
    attrs: ["column", "label"]
  },
  {
    name: "chart",
    profile: "data",
    purpose: "Accessible chart surface with a readable native meter fallback.",
    slots: ["description", "legend"],
    attrs: ["label", "type"],
    children: ["chart-series"]
  },
  {
    name: "chart-series",
    profile: "data",
    purpose: "Named series of chart data points.",
    attrs: ["label", "color"],
    children: ["chart-point"]
  },
  {
    name: "chart-point",
    profile: "data",
    purpose: "One labeled numeric chart value.",
    attrs: ["label", "value", "max"]
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
    name: "button",
    profile: "controls",
    purpose: "Native button for an action or form operation.",
    attrs: ["label", "type", "action", "target", "form", "disabled"]
  },
  {
    name: "toggle",
    profile: "controls",
    purpose: "Two-state pressed button, distinct from a form switch.",
    attrs: ["label", "pressed", "action", "target", "disabled"]
  },
  {
    name: "toggle-group",
    profile: "controls",
    purpose: "Group of related toggle buttons.",
    attrs: ["label"],
    children: ["toggle"]
  },
  {
    name: "form",
    profile: "forms",
    purpose: "Native form container.",
    attrs: ["method", "action", "validate", "novalidate"]
  },
  {
    name: "fieldset",
    profile: "forms",
    purpose: "Group related form fields.",
    attrs: ["legend", "disabled"]
  },
  {
    name: "button-group",
    profile: "forms",
    purpose: "Related form or action buttons."
  },
  {
    name: "field",
    profile: "forms",
    purpose: "Layout and validation wrapper for one form field.",
    attrs: ["invalid"]
  },
  {
    name: "label",
    profile: "forms",
    purpose: "Native label for a form control.",
    attrs: ["text", "for"]
  },
  {
    name: "help",
    profile: "forms",
    purpose: "Supporting instructions for a form field."
  },
  {
    name: "error",
    profile: "forms",
    purpose: "Validation feedback for a form field."
  },
  {
    name: "input",
    profile: "forms",
    purpose: "Native text-like input with a visible label.",
    attrs: [
      "type",
      "name",
      "label",
      "placeholder",
      "value",
      "autocomplete",
      "min",
      "max",
      "step",
      "required",
      "disabled",
      "readonly"
    ]
  },
  {
    name: "input-group",
    profile: "forms",
    purpose: "Native text input composed with inline addons, actions, and supporting text.",
    slots: ["prefix", "suffix", "actions", "help", "error"],
    attrs: [
      "type",
      "name",
      "label",
      "placeholder",
      "value",
      "autocomplete",
      "inputmode",
      "min",
      "max",
      "step",
      "required",
      "disabled",
      "readonly",
      "invalid"
    ]
  },
  {
    name: "input-otp",
    profile: "forms",
    purpose: "Accessible one-time-code input with native paste and autofill behavior.",
    slots: ["help", "error"],
    attrs: [
      "name",
      "label",
      "length",
      "pattern",
      "placeholder",
      "value",
      "inputmode",
      "required",
      "disabled",
      "readonly",
      "invalid"
    ]
  },
  {
    name: "combobox",
    profile: "forms",
    purpose: "Native autocomplete input backed by datalist options.",
    attrs: [
      "name",
      "label",
      "list",
      "placeholder",
      "value",
      "autocomplete",
      "required",
      "disabled",
      "readonly",
      "invalid"
    ],
    children: ["option"]
  },
  {
    name: "calendar",
    profile: "forms",
    purpose: "Inline single, range, or multiple date selection with a native date-input fallback.",
    attrs: [
      "name",
      "label",
      "mode",
      "value",
      "month",
      "min",
      "max",
      "locale",
      "weekstart",
      "required",
      "disabled",
      "readonly"
    ]
  },
  {
    name: "select",
    profile: "forms",
    purpose: "Native select control containing option blocks.",
    attrs: ["name", "label", "required", "disabled", "multiple"],
    children: ["option"]
  },
  {
    name: "option",
    profile: "forms",
    purpose: "Native option within a select block.",
    attrs: ["label", "value", "selected", "disabled"]
  },
  {
    name: "textarea",
    profile: "forms",
    purpose: "Native multiline input with a visible label.",
    attrs: ["name", "label", "placeholder", "rows", "required", "disabled", "readonly"]
  },
  {
    name: "checkbox",
    profile: "forms",
    purpose: "Native independent checkbox.",
    attrs: ["name", "label", "value", "checked", "required", "disabled"]
  },
  {
    name: "radio",
    profile: "forms",
    purpose: "Native radio option within a radio group.",
    attrs: ["name", "label", "value", "checked", "required", "disabled"]
  },
  {
    name: "radio-group",
    profile: "forms",
    purpose: "Native fieldset grouping related radio blocks.",
    attrs: ["legend", "disabled"],
    children: ["radio"]
  },
  {
    name: "slider",
    profile: "forms",
    purpose: "Native range input for choosing a numeric value.",
    attrs: ["name", "label", "min", "max", "step", "value", "disabled"]
  },
  {
    name: "switch",
    profile: "forms",
    purpose: "Native checkbox exposed as an immediate on/off switch.",
    attrs: ["name", "label", "value", "checked", "required", "disabled"]
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
    name: "command",
    profile: "interactive",
    purpose: "Searchable command list composed from existing menu blocks.",
    attrs: ["label", "placeholder", "empty"],
    children: ["menu", "menu-group", "menu-item", "menu-separator"]
  },
  {
    name: "dropdown",
    profile: "menus",
    purpose: "Progressively enhanced disclosure containing menu items.",
    attrs: ["label", "open"],
    children: ["menu", "menu-item", "menu-group", "menu-separator"]
  },
  {
    name: "dropdown-menu",
    profile: "menus",
    purpose: "Explicit alias for the dropdown menu block.",
    attrs: ["label", "open"],
    children: ["menu", "menu-item", "menu-group", "menu-separator"]
  },
  {
    name: "context-menu",
    profile: "menus",
    purpose: "Right-click menu with an explicit native disclosure fallback.",
    attrs: ["label", "open"],
    children: ["menu", "menu-item", "menu-group", "menu-separator"]
  },
  {
    name: "menubar",
    profile: "menus",
    purpose: "Persistent application menu bar composed from dropdown and menu blocks.",
    attrs: ["label"],
    children: ["dropdown", "dropdown-menu", "menu"]
  },
  {
    name: "menu",
    profile: "menus",
    purpose: "List of commands or navigation choices.",
    attrs: ["label"],
    children: ["menu-item", "menu-group", "menu-separator"]
  },
  {
    name: "menu-group",
    profile: "menus",
    purpose: "Labeled group of related menu items.",
    attrs: ["label"],
    children: ["menu-item", "menu-separator"]
  },
  {
    name: "menu-item",
    profile: "menus",
    purpose: "Menu command using the existing data-action contract.",
    attrs: ["label", "action", "target", "keywords", "shortcut", "disabled"]
  },
  {
    name: "menu-separator",
    profile: "menus",
    purpose: "Visual separator between menu item groups."
  },
  {
    name: "attachment",
    profile: "chat",
    purpose: "File or image attachment with metadata, progress, and actions.",
    slots: ["media", "description", "actions"],
    attrs: ["title", "href", "src", "alt", "type", "size", "state", "progress", "download"]
  },
  {
    name: "bubble",
    profile: "chat",
    purpose: "Framed conversational content with alignment, variants, and reactions.",
    slots: ["reactions"],
    attrs: ["variant", "align"]
  },
  {
    name: "marker",
    profile: "chat",
    purpose: "Conversation status, system note, or labeled separator.",
    slots: ["icon"],
    attrs: ["variant", "role", "label"]
  },
  {
    name: "message",
    profile: "chat",
    purpose: "Conversation row with avatar, sender metadata, content, and footer slots.",
    slots: ["avatar", "header", "body", "footer"],
    attrs: ["align", "sender", "status"]
  },
  {
    name: "message-scroller",
    profile: "chat",
    purpose: "Keyboard-focusable live transcript with follow-latest enhancement.",
    attrs: ["label", "follow", "height", "busy"],
    children: ["message", "marker", "attachment"]
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

export const displayBlocks: ThemeBlockPackSource = {
  name: "@mds-crate/blocks/display",
  profiles: ["display"],
  supportedBlocks: ["avatar", "empty", "item"],
  blocks: "blocks",
  files: {
    "blocks/avatar.html": `<span{{ attrs }} class="avatar" role="img" aria-label="{{ attr:alt:Avatar }}">
  <img class="avatar-image"{{ optional:src:src }} alt="" loading="lazy">
  <span class="avatar-fallback" aria-hidden="true">{{ attr:fallback:? }}</span>
</span>`,
    "blocks/empty.html": `<section{{ attrs }} class="empty">
  <div class="empty-media">{{ slot:media }}</div>
  <div class="empty-title">{{ slot:title }}</div>
  <div class="empty-description">{{ slot:description }}</div>
  <div class="empty-content">{{ children }}</div>
  <div class="empty-actions">{{ slot:actions }}</div>
</section>`,
    "blocks/item.html": `<article{{ attrs }} class="item">
  <div class="item-media">{{ slot:media }}</div>
  <div class="item-content">
    <header class="item-title">{{ slot:title }}</header>
    <div class="item-description">{{ slot:description }}</div>
    <div class="item-body">{{ children }}</div>
  </div>
  <div class="item-actions">{{ slot:actions }}</div>
  <footer class="item-footer">{{ slot:footer }}</footer>
</article>`
  }
};

export const navigationBlocks: ThemeBlockPackSource = {
  name: "@mds-crate/blocks/navigation",
  profiles: ["navigation"],
  supportedBlocks: ["breadcrumb", "breadcrumb-item", "pagination"],
  blocks: "blocks",
  files: {
    "blocks/breadcrumb.html": `<nav{{ attrs }} class="breadcrumb" aria-label="{{ attr:label:Breadcrumb }}">
  <ol class="breadcrumb-list">
    {{ children }}
  </ol>
</nav>`,
    "blocks/breadcrumb-item.html": `<li{{ attrs }} class="breadcrumb-item">
  <a href="{{ attr:href:# }}"{{ optional:current:aria-current }}>{{ attr:label:Item }}</a>
</li>`,
    "blocks/pagination.html": `<nav{{ attrs }} class="pagination" aria-label="{{ attr:label:Pagination }}">
  <span class="pagination-status" aria-live="polite">{{ attr:current:1 }} / {{ attr:pages:1 }}</span>
  <div class="pagination-list">
    {{ children }}
    {{ slots }}
  </div>
</nav>`
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
  supportedBlocks: [
    "comparison",
    "metric",
    "progress",
    "badge",
    "tag",
    "data-table",
    "data-column",
    "data-row",
    "data-cell",
    "chart",
    "chart-series",
    "chart-point"
  ],
  blocks: "blocks",
  css: "runtime.css",
  js: "runtime.js",
  files: {
    "runtime.css": blockFoundationStyles,
    "runtime.js": blockEnhancementsScript,
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
</span>`,
    "blocks/data-table.html": `<section{{ attrs }} class="data-table-shell" aria-label="{{ attr:label:Data table }}">
  <header class="data-table-toolbar" hidden>
    <label class="data-table-filter">
      <span class="field-label">{{ attr:filter:Filter rows }}</span>
      <input class="data-table-filter-input" type="search" placeholder="{{ attr:filter:Filter rows }}" autocomplete="off">
    </label>
    <span class="data-table-summary" aria-live="polite"></span>
  </header>
  <div class="data-table-scroll">
    <table class="data-table">
      <thead><tr>{{ slot:columns }}</tr></thead>
      <tbody>{{ slot:rows }}{{ children }}</tbody>
    </table>
  </div>
  <div class="data-table-empty" hidden>{{ slot:empty }}</div>
  <footer class="data-table-pagination" hidden>
    <button class="data-table-previous" type="button">Previous</button>
    <span class="data-table-page" aria-live="polite"></span>
    <button class="data-table-next" type="button">Next</button>
  </footer>
</section>`,
    "blocks/data-column.html": `<th{{ attrs }} scope="col" data-column-key="{{ attr:key }}">
  <span class="data-table-column-label">{{ attr:label:Column }}</span>
</th>`,
    "blocks/data-row.html": `<tr{{ attrs }}>
  {{ children }}
  {{ slots }}
</tr>`,
    "blocks/data-cell.html": `<td{{ attrs }} data-column-key="{{ attr:column }}" data-label="{{ attr:label }}">
  {{ children }}
  {{ slots }}
</td>`,
    "blocks/chart.html": `<figure{{ attrs }} class="chart" aria-label="{{ attr:label:Chart }}">
  <figcaption class="chart-heading">{{ attr:label:Chart }}</figcaption>
  <div class="chart-description">{{ slot:description }}</div>
  <div class="chart-plot">
    {{ children }}
  </div>
  <div class="chart-legend">{{ slot:legend }}</div>
</figure>`,
    "blocks/chart-series.html": `<section{{ attrs }} class="chart-series" aria-label="{{ attr:label:Series }}">
  <h4 class="chart-series-label">{{ attr:label:Series }}</h4>
  <div class="chart-series-points">
    {{ children }}
  </div>
</section>`,
    "blocks/chart-point.html": `<div{{ attrs }} class="chart-point">
  <span class="chart-point-label">{{ attr:label:Value }}</span>
  <meter class="chart-point-meter" min="0" max="{{ attr:max:100 }}" value="{{ attr:value:0 }}">{{ attr:value:0 }}</meter>
  <strong class="chart-point-value">{{ attr:value:0 }}</strong>
</div>`
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

export const controlBlocks: ThemeBlockPackSource = {
  name: "@mds-crate/blocks/controls",
  profiles: ["controls"],
  supportedBlocks: ["button", "toggle", "toggle-group"],
  blocks: "blocks",
  files: {
    "blocks/button.html": `<button{{ attrs }} class="action control-button" type="{{ attr:type:button }}"{{ optional:action:data-action }}{{ optional:target:data-target }}{{ optional:form:form }}{{ bool:disabled }}>{{ attr:label:Button }}</button>`,
    "blocks/toggle.html": `<button{{ attrs }} class="action toggle-control" type="button" aria-pressed="{{ attr:pressed:false }}"{{ optional:action:data-action }}{{ optional:target:data-target }}{{ optional:target:aria-controls }}{{ bool:disabled }}>{{ attr:label:Toggle }}</button>`,
    "blocks/toggle-group.html": `<div{{ attrs }} class="toggle-group" role="group" aria-label="{{ attr:label:Toggle group }}">
  {{ children }}
  {{ slots }}
</div>`
  }
};

export const formsBlocks: ThemeBlockPackSource = {
  name: "@mds-crate/blocks/forms",
  profiles: ["forms"],
  supportedBlocks: [
    "form",
    "fieldset",
    "button-group",
    "field",
    "label",
    "help",
    "error",
    "input",
    "input-group",
    "input-otp",
    "combobox",
    "calendar",
    "select",
    "option",
    "textarea",
    "checkbox",
    "radio",
    "radio-group",
    "slider",
    "switch"
  ],
  blocks: "blocks",
  css: "runtime.css",
  js: "runtime.js",
  files: {
    "runtime.css": blockFoundationStyles,
    "runtime.js": blockEnhancementsScript,
    "blocks/form.html": `<form{{ attrs }} class="form" method="{{ attr:method:post }}"{{ optional:action:action }}{{ bool:novalidate }}>
  {{ children }}
  {{ slots }}
</form>`,
    "blocks/fieldset.html": `<fieldset{{ attrs }} class="fieldset"{{ bool:disabled }}>
  <legend>{{ attr:legend }}</legend>
  {{ children }}
  {{ slots }}
</fieldset>`,
    "blocks/button-group.html": `<div{{ attrs }} class="button-group">
  {{ children }}
  {{ slots }}
</div>`,
    "blocks/field.html": `<div{{ attrs }} class="form-field field"{{ optional:invalid:data-invalid }}>
  {{ children }}
  {{ slots }}
</div>`,
    "blocks/label.html": `<label{{ attrs }} class="field-label"{{ optional:for:for }}>{{ attr:text:Label }}</label>`,
    "blocks/help.html": `<div{{ attrs }} class="field-help">
  {{ children }}
</div>`,
    "blocks/error.html": `<div{{ attrs }} class="field-error" role="alert">
  {{ children }}
</div>`,
    "blocks/input.html": `<label{{ attrs }} class="form-field input-field">
  <span class="field-label">{{ attr:label:Input }}</span>
  <input type="{{ attr:type:text }}"{{ optional:name:name }}{{ optional:value:value }}{{ optional:placeholder:placeholder }}{{ optional:autocomplete:autocomplete }}{{ optional:min:min }}{{ optional:max:max }}{{ optional:step:step }}{{ bool:required }}{{ bool:disabled }}{{ bool:readonly }}>
</label>`,
    "blocks/input-group.html": `<div{{ attrs }} class="form-field input-group">
  <label class="input-group-label">
    <span class="field-label">{{ attr:label:Input }}</span>
    <span class="input-group-frame">
      <input class="input-group-control" type="{{ attr:type:text }}"{{ optional:name:name }}{{ optional:value:value }}{{ optional:placeholder:placeholder }}{{ optional:autocomplete:autocomplete }}{{ optional:inputmode:inputmode }}{{ optional:min:min }}{{ optional:max:max }}{{ optional:step:step }}{{ optional:invalid:aria-invalid }}{{ bool:required }}{{ bool:disabled }}{{ bool:readonly }}>
      <span class="input-group-addon input-group-prefix">{{ slot:prefix }}</span>
      <span class="input-group-addon input-group-suffix">{{ slot:suffix }}</span>
    </span>
  </label>
  <div class="input-group-actions">{{ slot:actions }}</div>
  <div class="field-help">{{ slot:help }}</div>
  <div class="field-error" role="alert">{{ slot:error }}</div>
</div>`,
    "blocks/input-otp.html": `<div{{ attrs }} class="form-field input-otp">
  <label class="input-otp-label">
    <span class="field-label">{{ attr:label:Verification code }}</span>
    <input class="input-otp-control" type="text"{{ optional:name:name }}{{ optional:value:value }}{{ optional:pattern:pattern }}{{ optional:placeholder:placeholder }} inputmode="{{ attr:inputmode:numeric }}" autocomplete="one-time-code" autocapitalize="none" spellcheck="false" maxlength="{{ attr:length:6 }}" size="{{ attr:length:6 }}"{{ optional:invalid:aria-invalid }}{{ bool:required }}{{ bool:disabled }}{{ bool:readonly }}>
  </label>
  <div class="field-help">{{ slot:help }}</div>
  <div class="field-error" role="alert">{{ slot:error }}</div>
</div>`,
    "blocks/combobox.html": `<label{{ attrs }} class="form-field combobox-field">
  <span class="field-label">{{ attr:label:Choose an option }}</span>
  <input class="combobox-control" type="text" list="{{ attr:list:combobox-options }}"{{ optional:name:name }}{{ optional:value:value }}{{ optional:placeholder:placeholder }}{{ optional:autocomplete:autocomplete }}{{ optional:invalid:aria-invalid }}{{ bool:required }}{{ bool:disabled }}{{ bool:readonly }}>
  <datalist id="{{ attr:list:combobox-options }}">
    {{ children }}
  </datalist>
</label>`,
    "blocks/calendar.html": `<div{{ attrs }} class="calendar">
  <label class="calendar-native">
    <span class="field-label">{{ attr:label:Choose a date }}</span>
    <input class="calendar-native-input" type="date"{{ optional:name:name }}{{ optional:value:value }}{{ optional:min:min }}{{ optional:max:max }}{{ bool:required }}{{ bool:disabled }}{{ bool:readonly }}>
  </label>
  <div class="calendar-enhanced" role="group" aria-label="{{ attr:label:Choose a date }}" hidden>
    <header class="calendar-header">
      <button class="calendar-previous" type="button" aria-label="Previous month">←</button>
      <strong class="calendar-caption" aria-live="polite"></strong>
      <button class="calendar-next" type="button" aria-label="Next month">→</button>
    </header>
    <div class="calendar-weekdays" aria-hidden="true"></div>
    <div class="calendar-days" role="grid"></div>
    <output class="calendar-output" aria-live="polite"></output>
  </div>
</div>`,
    "blocks/select.html": `<label{{ attrs }} class="form-field select-field">
  <span class="field-label">{{ attr:label:Select }}</span>
  <select{{ optional:name:name }}{{ bool:required }}{{ bool:disabled }}{{ bool:multiple }}>
    {{ children }}
  </select>
</label>`,
    "blocks/option.html": `<option{{ attrs }}{{ optional:value:value }}{{ bool:selected }}{{ bool:disabled }}>{{ attr:label:Option }}</option>`,
    "blocks/textarea.html": `<label{{ attrs }} class="form-field textarea-field">
  <span class="field-label">{{ attr:label:Text }}</span>
  <textarea{{ optional:name:name }}{{ optional:placeholder:placeholder }}{{ optional:rows:rows }}{{ bool:required }}{{ bool:disabled }}{{ bool:readonly }}></textarea>
</label>`,
    "blocks/checkbox.html": `<label{{ attrs }} class="form-field choice-field checkbox">
  <input type="checkbox"{{ optional:name:name }}{{ optional:value:value }}{{ bool:checked }}{{ bool:required }}{{ bool:disabled }}>
  <span>{{ attr:label:Checkbox }}</span>
</label>`,
    "blocks/radio.html": `<label{{ attrs }} class="form-field choice-field radio">
  <input type="radio"{{ optional:name:name }}{{ optional:value:value }}{{ bool:checked }}{{ bool:required }}{{ bool:disabled }}>
  <span>{{ attr:label:Option }}</span>
</label>`,
    "blocks/radio-group.html": `<fieldset{{ attrs }} class="radio-group"{{ bool:disabled }}>
  <legend>{{ attr:legend:Choose one }}</legend>
  {{ children }}
  {{ slots }}
</fieldset>`,
    "blocks/slider.html": `<label{{ attrs }} class="form-field slider-field">
  <span class="field-label">{{ attr:label:Value }}</span>
  <input type="range"{{ optional:name:name }}{{ optional:min:min }}{{ optional:max:max }}{{ optional:step:step }}{{ optional:value:value }}{{ bool:disabled }}>
</label>`,
    "blocks/switch.html": `<label{{ attrs }} class="form-field choice-field switch">
  <input type="checkbox" role="switch"{{ optional:name:name }}{{ optional:value:value }}{{ bool:checked }}{{ bool:required }}{{ bool:disabled }}>
  <span>{{ attr:label:Switch }}</span>
</label>`
  }
};

export const interactiveBlocks: ThemeBlockPackSource = {
  name: "@mds-crate/blocks/interactive",
  profiles: ["interactive"],
  supportedBlocks: ["tabs", "accordion", "carousel", "dialog", "drawer", "popover", "tooltip", "command"],
  blocks: "blocks",
  actions: ["open", "close", "show", "hide", "toggle"],
  css: "runtime.css",
  js: "runtime.js",
  files: {
    "runtime.css": blockFoundationStyles,
    "runtime.js": blockEnhancementsScript,
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
</span>`,
    "blocks/command.html": `<section{{ attrs }} class="command" aria-label="{{ attr:label:Commands }}">
  <label class="command-search" hidden>
    <span class="field-label">{{ attr:label:Commands }}</span>
    <input class="command-input" type="search" placeholder="{{ attr:placeholder:Type a command or search... }}" autocomplete="off">
  </label>
  <div class="command-list">
    {{ children }}
    {{ slots }}
  </div>
  <p class="command-empty" hidden>{{ attr:empty:No results found. }}</p>
</section>`
  }
};

export const menuBlocks: ThemeBlockPackSource = {
  name: "@mds-crate/blocks/menus",
  profiles: ["menus"],
  supportedBlocks: [
    "dropdown",
    "dropdown-menu",
    "context-menu",
    "menubar",
    "menu",
    "menu-group",
    "menu-item",
    "menu-separator"
  ],
  blocks: "blocks",
  css: "runtime.css",
  js: "runtime.js",
  files: {
    "runtime.css": blockFoundationStyles,
    "runtime.js": blockEnhancementsScript,
    "blocks/dropdown.html": `<template data-block="dropdown dropdown-menu">
<details{{ attrs }} class="dropdown-menu"{{ bool:open }}>
  <summary>{{ attr:label:Menu }}</summary>
  <div class="dropdown-menu-content">
    {{ children }}
    {{ slots }}
  </div>
</details>
</template>`,
    "blocks/context-menu.html": `<details{{ attrs }} class="context-menu"{{ bool:open }}>
  <summary class="context-menu-trigger">{{ attr:label:Open menu }}</summary>
  <div class="context-menu-content">
    {{ children }}
    {{ slots }}
  </div>
</details>`,
    "blocks/menubar.html": `<nav{{ attrs }} class="menubar" aria-label="{{ attr:label:Application menu }}">
  <div class="menubar-list" role="menubar">
    {{ children }}
    {{ slots }}
  </div>
</nav>`,
    "blocks/menu.html": `<ul{{ attrs }} class="menu-list" aria-label="{{ attr:label:Menu }}">
  {{ children }}
</ul>`,
    "blocks/menu-group.html": `<li{{ attrs }} class="menu-group">
  <span class="menu-group-label">{{ attr:label:Group }}</span>
  <ul class="menu-list">
    {{ children }}
  </ul>
</li>`,
    "blocks/menu-item.html": `<li{{ attrs }} class="menu-item">
  <button type="button" class="action menu-item-control"{{ optional:action:data-action }}{{ optional:target:data-target }}{{ bool:disabled }}>
    <span class="menu-item-label">{{ attr:label:Item }}</span>
    <kbd class="menu-item-shortcut">{{ attr:shortcut }}</kbd>
  </button>
</li>`,
    "blocks/menu-separator.html": `<li{{ attrs }} class="menu-separator" aria-hidden="true"></li>`
  }
};

export const chatBlocks: ThemeBlockPackSource = {
  name: "@mds-crate/blocks/chat",
  profiles: ["chat"],
  supportedBlocks: ["attachment", "bubble", "marker", "message", "message-scroller"],
  blocks: "blocks",
  css: "runtime.css",
  js: "runtime.js",
  files: {
    "runtime.css": blockFoundationStyles,
    "runtime.js": blockEnhancementsScript,
    "blocks/attachment.html": `<article{{ attrs }} class="attachment">
  <div class="attachment-media">
    <img{{ optional:src:src }} alt="{{ attr:alt }}">
    <span class="attachment-file" aria-hidden="true">↗</span>
    {{ slot:media }}
  </div>
  <div class="attachment-content">
    <a class="attachment-title"{{ optional:href:href }}{{ bool:download }}>{{ attr:title:Attachment }}</a>
    <div class="attachment-description">{{ slot:description }}</div>
    <span class="attachment-meta"><span>{{ attr:type }}</span><span>{{ attr:size }}</span></span>
    <progress class="attachment-progress" max="100" value="{{ attr:progress:0 }}">{{ attr:progress:0 }}%</progress>
  </div>
  <div class="attachment-actions">{{ slot:actions }}</div>
</article>`,
    "blocks/bubble.html": `<div{{ attrs }} class="bubble">
  <div class="bubble-content">{{ children }}</div>
  <div class="bubble-reactions" role="group" aria-label="Reactions">{{ slot:reactions }}</div>
</div>`,
    "blocks/marker.html": `<div{{ attrs }} class="marker" role="{{ attr:role:status }}">
  <span class="marker-icon" aria-hidden="true">{{ slot:icon }}</span>
  <div class="marker-content">{{ attr:label }}{{ children }}</div>
</div>`,
    "blocks/message.html": `<article{{ attrs }} class="message">
  <div class="message-avatar">{{ slot:avatar }}</div>
  <div class="message-content">
    <header class="message-header">{{ attr:sender }}{{ slot:header }}</header>
    <div class="message-body">{{ slot:body }}{{ children }}</div>
    <footer class="message-footer">{{ attr:status }}{{ slot:footer }}</footer>
  </div>
</article>`,
    "blocks/message-scroller.html": `<section{{ attrs }} class="message-scroller" role="region" aria-label="{{ attr:label:Messages }}">
  <div class="message-scroller-viewport" tabindex="0">
    <div class="message-scroller-content" role="log" aria-relevant="additions">
      {{ children }}
      {{ slots }}
    </div>
  </div>
  <button class="message-scroller-button" type="button" hidden>↓ Latest</button>
</section>`
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

export const foundationBlocks = [
  coreBlocks,
  displayBlocks,
  navigationBlocks,
  controlBlocks,
  formsBlocks,
  interactiveBlocks,
  menuBlocks
] as const;

export const standardBlocks = [
  coreBlocks,
  displayBlocks,
  navigationBlocks,
  controlBlocks,
  formsBlocks,
  interactiveBlocks,
  menuBlocks,
  dataBlocks,
  docsBlocks,
  mediaBlocks,
  guidanceBlocks,
  marketingBlocks,
  chatBlocks,
  motionBlocks
] as const;

export const blockPacksByName: Readonly<Record<string, ThemeBlockPackSource>> = Object.fromEntries(
  standardBlocks.map((pack) => [pack.name, pack])
);
