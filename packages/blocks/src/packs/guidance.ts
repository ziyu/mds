import type { ThemeBlockPackSource } from "@mds-crate/theme-loader";

export const guidanceBlocks: ThemeBlockPackSource = {
  name: "@mds-crate/blocks/guidance",
  profiles: ["guidance"],
  supportedBlocks: ["steps", "step", "timeline", "faq"],
  blocks: "blocks",
  files: {
    "blocks/steps.html": `<section{{ attrs }} class="steps">
  {{ children }}
  {{ slots }}
</section>`,
    "blocks/step.html": `<article{{ attrs }} class="step">
  <span class="step-label">{{ attr:label }}</span>
  <time class="step-date">{{ attr:date }}</time>
  {{ children }}
  {{ slots }}
</article>`,
    "blocks/timeline.html": `<section{{ attrs }} class="timeline">
  {{ children }}
  {{ slots }}
</section>`,
    "blocks/faq.html": `<section{{ attrs }} class="faq">
  {{ children }}
  {{ slots }}
</section>`
  }
};
