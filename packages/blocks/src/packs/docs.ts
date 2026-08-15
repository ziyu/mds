import type { ThemeBlockPackSource } from "@mds-crate/theme-loader";

export const docsBlocks: ThemeBlockPackSource = {
  name: "@mds-crate/blocks/docs",
  profiles: ["docs"],
  supportedBlocks: ["terminal", "code-group", "file-tree", "api", "endpoint"],
  blocks: "blocks",
  files: {
    "blocks/terminal.html": `<section{{ attrs }} class="terminal">
  <div class="terminal-title">{{ attr:title:Terminal }}</div>
  <div class="terminal-body">{{ children }}</div>
  {{ slots }}
</section>`,
    "blocks/code-group.html": `<section{{ attrs }} class="code-group">
  {{ slots }}
  <div class="code-group-body">{{ children }}</div>
</section>`,
    "blocks/file-tree.html": `<section{{ attrs }} class="file-tree">
  {{ children }}
  {{ slots }}
</section>`,
    "blocks/api.html": `<section{{ attrs }} class="api">
  {{ children }}
  {{ slots }}
</section>`,
    "blocks/endpoint.html": `<article{{ attrs }} class="endpoint">
  <header class="endpoint-header">
    <span class="endpoint-method">{{ attr:method }}</span>
    <code class="endpoint-path">{{ attr:path }}</code>
  </header>
  {{ children }}
  {{ slots }}
</article>`
  }
};
