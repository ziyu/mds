import type { ThemeBlockPackSource } from "@mds-crate/theme-loader";

export const mediaBlocks: ThemeBlockPackSource = {
  name: "@mds-crate/blocks/media",
  profiles: ["media"],
  supportedBlocks: ["figure", "caption", "video"],
  blocks: "blocks",
  files: {
    "blocks/video.html": `<figure{{ attrs }} class="video">
  <video src="{{ attr:src }}" controls>{{ children }}</video>
  <figcaption>{{ slot:caption }}</figcaption>
</figure>`,
    "blocks/figure.html": `<figure{{ attrs }} class="figure">
  {{ children }}
  <figcaption>{{ slot:caption }}</figcaption>
</figure>`,
    "blocks/caption.html": `<figcaption{{ attrs }} class="caption">
  {{ children }}
</figcaption>`
  }
};
