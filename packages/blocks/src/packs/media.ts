import type { ThemeBlockPackSource } from "@mds-crate/theme-loader";

export const mediaBlocks: ThemeBlockPackSource = {
  name: "@mds-crate/blocks/media",
  profiles: ["media"],
  supportedBlocks: ["media", "image", "video", "figure", "caption", "gallery"],
  blocks: "blocks",
  files: {
    "blocks/media.html": `<figure{{ attrs }} class="media">
  {{ children }}
  <figcaption>{{ slot:caption }}</figcaption>
  {{ slots }}
</figure>`,
    "blocks/image.html": `<figure{{ attrs }} class="image">
  <img src="{{ attr:src }}" alt="{{ attr:alt }}">
  <figcaption>{{ slot:caption }}</figcaption>
  <div class="image-fallback">{{ children }}</div>
  {{ slots }}
</figure>`,
    "blocks/video.html": `<figure{{ attrs }} class="video">
  <video src="{{ attr:src }}" controls>{{ children }}</video>
  <figcaption>{{ slot:caption }}</figcaption>
  {{ slots }}
</figure>`,
    "blocks/figure.html": `<figure{{ attrs }} class="figure">
  {{ children }}
  <figcaption>{{ slot:caption }}</figcaption>
  {{ slots }}
</figure>`,
    "blocks/caption.html": `<figcaption{{ attrs }} class="caption">
  {{ children }}
</figcaption>`,
    "blocks/gallery.html": `<section{{ attrs }} class="gallery">
  {{ children }}
  {{ slots }}
</section>`
  }
};
