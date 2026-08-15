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
    name: "hero",
    profile: "core",
    purpose: "Primary first-viewport message.",
    slots: ["title", "body", "actions", "media"],
    attrs: ["variant", "tone", "motion", "delay", "duration"]
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
    name: "cards",
    profile: "core",
    purpose: "Collection of card items.",
    children: ["card"],
    attrs: ["columns", "motion", "stagger"]
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
    name: "grid-2",
    profile: "core",
    purpose: "Two-column grid."
  },
  {
    name: "grid-3",
    profile: "core",
    purpose: "Three-column grid."
  },
  {
    name: "grid-auto",
    profile: "core",
    purpose: "Auto-fit responsive grid."
  },
  {
    name: "split",
    profile: "core",
    purpose: "Two-pane layout.",
    slots: ["left", "right"]
  },
  {
    name: "note",
    profile: "core",
    purpose: "Neutral callout."
  },
  {
    name: "info",
    profile: "core",
    purpose: "Informational callout."
  },
  {
    name: "warning",
    profile: "core",
    purpose: "Risk or caution callout."
  },
  {
    name: "danger",
    profile: "core",
    purpose: "Critical or destructive warning."
  },
  {
    name: "success",
    profile: "core",
    purpose: "Positive status callout."
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
