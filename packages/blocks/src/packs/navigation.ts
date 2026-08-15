import type { ThemeBlockPackSource } from "@mds-crate/theme-loader";

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
