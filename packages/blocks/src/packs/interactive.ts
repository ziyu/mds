import type { ThemeBlockPackSource } from "@mds-crate/theme-loader";
import { commandEnhancementsScript, interactiveEnhancementsScript } from "../runtime.js";
import { commandBlockStyles, interactiveBlockStyles } from "../styles.js";

const runtimeScript = [commandEnhancementsScript, interactiveEnhancementsScript].join("\n");
const runtimeStyles = [commandBlockStyles, interactiveBlockStyles].join("\n");

export const interactiveBlocks: ThemeBlockPackSource = {
  name: "@mds-crate/blocks/interactive",
  profiles: ["interactive"],
  supportedBlocks: ["tabs", "accordion", "carousel", "dialog", "drawer", "popover", "tooltip", "command"],
  blocks: "blocks",
  actions: ["open", "close", "show", "hide", "toggle"],
  css: "runtime.css",
  js: "runtime.js",
  files: {
    "runtime.css": runtimeStyles,
    "runtime.js": runtimeScript,
    "blocks/tabs.html": `<section{{ attrs }} class="tabs" data-mds-role="tabs">
  {{ slots }}
  <div class="tabs-body" data-mds-role="tabs-content">{{ children }}</div>
</section>`,
    "blocks/accordion.html": `<section{{ attrs }} class="accordion" data-mds-role="accordion">
  {{ slots }}
  <div class="accordion-body" data-mds-role="accordion-content">{{ children }}</div>
</section>`,
    "blocks/carousel.html": `<section{{ attrs }} class="carousel" data-mds-role="carousel" tabindex="0">
  <div class="carousel-track" data-mds-role="carousel-track">
    {{ children }}
    {{ slots }}
  </div>
  <div class="carousel-controls" data-mds-role="carousel-controls" aria-label="Carousel controls">
    <button class="carousel-previous" data-mds-role="carousel-previous" type="button" aria-label="Previous item">←</button>
    <span class="carousel-status" data-mds-role="carousel-status" aria-live="polite">1 / 1</span>
    <button class="carousel-next" data-mds-role="carousel-next" type="button" aria-label="Next item">→</button>
  </div>
</section>`,
    "blocks/dialog.html": `<section{{ attrs }} class="dialog" data-mds-role="dialog" role="dialog" aria-modal="true" aria-hidden="true" aria-label="{{ attr:label:Dialog }}" hidden>
  <button class="dialog-backdrop" data-mds-role="overlay-backdrop" data-mds-overlay-close type="button" tabindex="-1" aria-label="Close dialog"></button>
  <div class="dialog-panel" data-mds-role="overlay-panel" tabindex="-1">
    <button class="dialog-close" data-mds-overlay-close type="button" aria-label="Close dialog">×</button>
    {{ children }}
    {{ slots }}
  </div>
</section>`,
    "blocks/drawer.html": `<aside{{ attrs }} class="drawer" data-mds-role="drawer" role="dialog" aria-modal="true" aria-hidden="true" aria-label="{{ attr:label:Drawer }}" hidden>
  <button class="drawer-backdrop" data-mds-role="overlay-backdrop" data-mds-overlay-close type="button" tabindex="-1" aria-label="Close drawer"></button>
  <div class="drawer-panel" data-mds-role="overlay-panel" tabindex="-1">
    <button class="drawer-close" data-mds-overlay-close type="button" aria-label="Close drawer">×</button>
    {{ children }}
    {{ slots }}
  </div>
</aside>`,
    "blocks/popover.html": `<details{{ attrs }} class="popover" data-mds-role="popover">
  <summary>{{ attr:label:More }}</summary>
  <div class="popover-body">{{ children }}</div>
  {{ slots }}
</details>`,
    "blocks/tooltip.html": `<span{{ attrs }} class="tooltip" data-mds-role="tooltip" data-tooltip="{{ attr:label }}" tabindex="0" aria-description="{{ attr:label }}">
  {{ children }}
</span>`,
    "blocks/command.html": `<section{{ attrs }} class="command" data-mds-role="command" aria-label="{{ attr:label:Commands }}">
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
