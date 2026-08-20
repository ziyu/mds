import type { ThemeBlockPackSource } from "@mds-crate/theme-loader";
import { menuEnhancementsScript } from "../runtime.js";
import { menuBlockStyles } from "../styles.js";

export const menuBlocks: ThemeBlockPackSource = {
  name: "@mds-crate/blocks/menus",
  profiles: ["menus"],
  supportedBlocks: [
    "dropdown",
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
    "runtime.css": menuBlockStyles,
    "runtime.js": menuEnhancementsScript,
    "blocks/dropdown.html": `<details{{ attrs }} class="dropdown-menu" data-mds-role="dropdown"{{ bool:open }}>
  <summary>{{ attr:label:Menu }}</summary>
  <div class="dropdown-menu-content">
    {{ children }}
    {{ slots }}
  </div>
</details>`,
    "blocks/context-menu.html": `<details{{ attrs }} class="context-menu" data-mds-role="context-menu"{{ bool:open }}>
  <summary class="context-menu-trigger">{{ attr:label:Open menu }}</summary>
  <div class="context-menu-content">
    {{ children }}
    {{ slots }}
  </div>
</details>`,
    "blocks/menubar.html": `<nav{{ attrs }} class="menubar" data-mds-role="menubar" aria-label="{{ attr:label:Application menu }}">
  <div class="menubar-list" role="menubar">
    {{ children }}
    {{ slots }}
  </div>
</nav>`,
    "blocks/menu.html": `<ul{{ attrs }} class="menu-list" data-mds-role="menu" aria-label="{{ attr:label:Menu }}">
  {{ children }}
</ul>`,
    "blocks/menu-group.html": `<li{{ attrs }} class="menu-group">
  <span class="menu-group-label">{{ attr:label:Group }}</span>
  <ul class="menu-list">
    {{ children }}
  </ul>
</li>`,
    "blocks/menu-item.html": `<li{{ attrs }} class="menu-item" data-mds-role="menu-item">
  <button type="button" class="action menu-item-control"{{ optional:action:data-action }}{{ optional:target:data-target }}{{ bool:disabled }}>
    <span class="menu-item-label">{{ attr:label:Item }}</span>
    <kbd class="menu-item-shortcut">{{ attr:shortcut }}</kbd>
  </button>
</li>`,
    "blocks/menu-separator.html": `<li{{ attrs }} class="menu-separator" aria-hidden="true"></li>`
  }
};
