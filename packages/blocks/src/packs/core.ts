import type { ThemeBlockPackSource } from "@mds-crate/theme-loader";

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
