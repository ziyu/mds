import type { ThemeBlockPackSource } from "@mds-crate/theme-loader";

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
