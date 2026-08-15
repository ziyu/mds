import type { ThemeBlockPackSource } from "@mds-crate/theme-loader";
import { chatEnhancementsScript } from "../runtime.js";
import { chatBlockStyles } from "../styles.js";

export const chatBlocks: ThemeBlockPackSource = {
  name: "@mds-crate/blocks/chat",
  profiles: ["chat"],
  supportedBlocks: ["attachment", "bubble", "marker", "message", "message-scroller"],
  blocks: "blocks",
  css: "runtime.css",
  js: "runtime.js",
  files: {
    "runtime.css": chatBlockStyles,
    "runtime.js": chatEnhancementsScript,
    "blocks/attachment.html": `<article{{ attrs }} class="attachment">
  <div class="attachment-media">
    <img{{ optional:src:src }} alt="{{ attr:alt }}">
    <span class="attachment-file" aria-hidden="true">↗</span>
    {{ slot:media }}
  </div>
  <div class="attachment-content">
    <a class="attachment-title"{{ optional:href:href }}{{ bool:download }}>{{ attr:title:Attachment }}</a>
    <div class="attachment-description">{{ slot:description }}</div>
    <span class="attachment-meta"><span>{{ attr:type }}</span><span>{{ attr:size }}</span></span>
    <progress class="attachment-progress" max="100" value="{{ attr:progress:0 }}">{{ attr:progress:0 }}%</progress>
  </div>
  <div class="attachment-actions">{{ slot:actions }}</div>
</article>`,
    "blocks/bubble.html": `<div{{ attrs }} class="bubble">
  <div class="bubble-content">{{ children }}</div>
  <div class="bubble-reactions" role="group" aria-label="Reactions">{{ slot:reactions }}</div>
</div>`,
    "blocks/marker.html": `<div{{ attrs }} class="marker" role="{{ attr:role:status }}">
  <span class="marker-icon" aria-hidden="true">{{ slot:icon }}</span>
  <div class="marker-content">{{ attr:label }}{{ children }}</div>
</div>`,
    "blocks/message.html": `<article{{ attrs }} class="message">
  <div class="message-avatar">{{ slot:avatar }}</div>
  <div class="message-content">
    <header class="message-header">{{ attr:sender }}{{ slot:header }}</header>
    <div class="message-body">{{ slot:body }}{{ children }}</div>
    <footer class="message-footer">{{ attr:status }}{{ slot:footer }}</footer>
  </div>
</article>`,
    "blocks/message-scroller.html": `<section{{ attrs }} class="message-scroller" role="region" aria-label="{{ attr:label:Messages }}">
  <div class="message-scroller-viewport" tabindex="0">
    <div class="message-scroller-content" role="log" aria-relevant="additions">
      {{ children }}
      {{ slots }}
    </div>
  </div>
  <button class="message-scroller-button" type="button" hidden>↓ Latest</button>
</section>`
  }
};
