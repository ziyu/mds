import type { BlockVocabularyEntry } from "../types.js";

export const coreVocabulary = [
  {
    name: "page",
    profile: "core",
    purpose: "Top-level page body."
  },
  {
    name: "nav",
    profile: "core",
    purpose: "Navigation group of links or actions.",
    attrs: ["label"]
  },
  {
    name: "section",
    profile: "core",
    purpose: "Generic content section."
  },
  {
    name: "aside",
    profile: "core",
    purpose: "Secondary or supporting content."
  },
  {
    name: "footer",
    profile: "core",
    purpose: "Footer content."
  },
  {
    name: "card",
    profile: "core",
    purpose: "General framed item.",
    attrs: ["variant", "tone", "highlighted"]
  },
  {
    name: "grid",
    profile: "core",
    purpose: "Generic responsive grid.",
    attrs: ["columns"]
  },
  {
    name: "split",
    profile: "core",
    purpose: "Two-pane layout.",
    slots: ["left", "right"]
  },
  {
    name: "callout",
    profile: "core",
    purpose: "Generic callout with an optional semantic tone.",
    attrs: ["tone", "label"]
  },
  {
    name: "quote",
    profile: "core",
    purpose: "Pull quote or cited block."
  },
  {
    name: "details",
    profile: "core",
    purpose: "Native expandable detail."
  }
] as const satisfies readonly BlockVocabularyEntry[];
