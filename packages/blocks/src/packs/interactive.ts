import type { ThemeBlockPackSource } from "@mds-crate/theme-loader";
import { commandEnhancementsScript } from "../runtime.js";
import { commandBlockStyles } from "../styles.js";

export const interactiveBlocks: ThemeBlockPackSource = {
  name: "@mds-crate/blocks/interactive",
  profiles: ["interactive"],
  supportedBlocks: ["tabs", "accordion", "carousel", "dialog", "drawer", "popover", "tooltip", "command"],
  blocks: "blocks",
  actions: ["open", "close", "show", "hide", "toggle"],
  css: "runtime.css",
  js: "runtime.js",
  files: {
    "runtime.css": commandBlockStyles,
    "runtime.js": commandEnhancementsScript,
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
    "blocks/tooltip.html": `<span{{ attrs }} class="tooltip" data-tooltip="{{ attr:label }}" tabindex="0" aria-description="{{ attr:label }}">
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
