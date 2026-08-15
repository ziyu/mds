import type { ThemeBlockPackSource } from "@mds-crate/theme-loader";

export const controlBlocks: ThemeBlockPackSource = {
  name: "@mds-crate/blocks/controls",
  profiles: ["controls"],
  supportedBlocks: ["button", "toggle", "toggle-group"],
  blocks: "blocks",
  files: {
    "blocks/button.html": `<button{{ attrs }} class="action control-button" type="{{ attr:type:button }}"{{ optional:action:data-action }}{{ optional:target:data-target }}{{ optional:form:form }}{{ bool:disabled }}>{{ attr:label:Button }}</button>`,
    "blocks/toggle.html": `<button{{ attrs }} class="action toggle-control" type="button" aria-pressed="{{ attr:pressed:false }}"{{ optional:action:data-action }}{{ optional:target:data-target }}{{ optional:target:aria-controls }}{{ bool:disabled }}>{{ attr:label:Toggle }}</button>`,
    "blocks/toggle-group.html": `<div{{ attrs }} class="toggle-group" role="group" aria-label="{{ attr:label:Toggle group }}">
  {{ children }}
  {{ slots }}
</div>`
  }
};
