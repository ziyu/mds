import type { ThemeBlockPackSource } from "@mds-crate/theme-loader";

export const coreBlocks: ThemeBlockPackSource = {
  name: "@mds-crate/blocks/core",
  profiles: ["core"],
  supportedBlocks: [
    "page",
    "header",
    "nav",
    "section",
    "aside",
    "footer",
    "card",
    "grid",
    "split",
    "callout",
    "quote",
    "details"
  ],
  blocks: "blocks",
  files: {
    "blocks/page.html": `<main{{ attrs }} class="page">
  {{ children }}
  {{ slots }}
</main>`,
    "blocks/header.html": `<header{{ attrs }} class="header">
  {{ children }}
  {{ slots }}
</header>`,
    "blocks/nav.html": `<nav{{ attrs }} class="nav" aria-label="{{ attr:label:Navigation }}">
  {{ children }}
  {{ slots }}
</nav>`,
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
    "blocks/card.html": `<article{{ attrs }} class="card">
  {{ children }}
  {{ slots }}
</article>`,
    "blocks/grid.html": `<section{{ attrs }} class="grid">
  {{ children }}
  {{ slots }}
</section>`,
    "blocks/split.html": `<section{{ attrs }} class="split">
  <div class="split-pane" data-slot="left">{{ slot:left }}</div>
  <div class="split-pane" data-slot="right">{{ slot:right }}</div>
  <div class="split-content">{{ children }}</div>
</section>`,
    "blocks/callout.html": `<aside{{ attrs }} class="callout {{ attr:tone:note }}" role="note">
  <strong class="callout-label">{{ attr:label:Note }}</strong>
  <div class="callout-body">{{ children }}</div>
  {{ slots }}
</aside>`,
    "blocks/quote.html": `<blockquote{{ attrs }} class="quote">
  {{ children }}
  {{ slots }}
</blockquote>`,
    "blocks/details.html": `<details{{ attrs }} class="details"{{ bool:open }}>
  <summary>{{ attr:label:Details }}</summary>
  <div class="details-body">{{ children }}</div>
  {{ slots }}
</details>`
  }
};
