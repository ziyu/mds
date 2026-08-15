import type { ThemeBlockPackSource } from "@mds-crate/theme-loader";
import { dataTableEnhancementsScript } from "../runtime.js";
import { dataBlockStyles } from "../styles.js";

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
    "runtime.css": dataBlockStyles,
    "runtime.js": dataTableEnhancementsScript,
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
