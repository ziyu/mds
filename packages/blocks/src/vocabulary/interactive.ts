import type { BlockVocabularyEntry } from "../types.js";

export const interactiveVocabulary = [
  {
    name: "tabs",
    profile: "interactive",
    purpose: "Tabbed content represented as named slots."
  },
  {
    name: "accordion",
    profile: "interactive",
    purpose: "Stacked collapsible sections represented as named slots."
  },
  {
    name: "carousel",
    profile: "interactive",
    purpose: "Horizontal browsing group.",
    children: ["figure", "card"]
  },
  {
    name: "dialog",
    profile: "interactive",
    purpose: "Dialog or modal-like content.",
    attrs: ["label"]
  },
  {
    name: "drawer",
    profile: "interactive",
    purpose: "Side drawer or secondary panel.",
    attrs: ["label"]
  },
  {
    name: "popover",
    profile: "interactive",
    purpose: "Small contextual panel.",
    attrs: ["label"]
  },
  {
    name: "tooltip",
    profile: "interactive",
    purpose: "Short hover or focus hint.",
    attrs: ["label"]
  },
  {
    name: "command",
    profile: "interactive",
    purpose: "Searchable command list composed from existing menu blocks.",
    attrs: ["label", "placeholder", "empty"],
    children: ["menu", "menu-group", "menu-item", "menu-separator"]
  }
] as const satisfies readonly BlockVocabularyEntry[];
