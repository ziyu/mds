import type { ThemeBlockPackSource } from "@mds-crate/theme-loader";

export const displayBlocks: ThemeBlockPackSource = {
  name: "@mds-crate/blocks/display",
  profiles: ["display"],
  supportedBlocks: ["avatar", "empty", "item", "badge", "progress"],
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
</article>`,
    "blocks/badge.html": `<span{{ attrs }} class="badge {{ attr:tone }}">
  {{ children }}
</span>`,
    "blocks/progress.html": `<figure{{ attrs }} class="progress">
  <progress value="{{ attr:value:0 }}" max="{{ attr:max:100 }}"></progress>
  <figcaption>{{ attr:label }}</figcaption>
  {{ children }}
  {{ slots }}
</figure>`
  }
};
