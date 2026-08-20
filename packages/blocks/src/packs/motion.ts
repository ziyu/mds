import type { ThemeBlockPackSource } from "@mds-crate/theme-loader";
import { motionEnhancementsScript } from "../runtime.js";
import { motionBlockStyles } from "../styles.js";

export const motionBlocks: ThemeBlockPackSource = {
  name: "@mds-crate/blocks/motion",
  profiles: ["motion"],
  supportedBlocks: ["motion", "reveal", "scene"],
  blocks: "blocks",
  css: "runtime.css",
  js: "runtime.js",
  files: {
    "runtime.css": motionBlockStyles,
    "runtime.js": motionEnhancementsScript,
    "blocks/motion.html": `<section{{ attrs }} class="motion" data-mds-role="motion">
  {{ children }}
  {{ slots }}
</section>`,
    "blocks/reveal.html": `<section{{ attrs }} class="reveal" data-mds-role="reveal">
  {{ children }}
  {{ slots }}
</section>`,
    "blocks/scene.html": `<section{{ attrs }} class="scene" data-mds-role="scene">
  {{ children }}
  {{ slots }}
</section>`
  }
};
