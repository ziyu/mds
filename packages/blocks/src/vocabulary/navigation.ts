import type { BlockVocabularyEntry } from "../types.js";

export const navigationVocabulary = [
  {
    name: "breadcrumb",
    profile: "navigation",
    purpose: "Hierarchical navigation path.",
    children: ["breadcrumb-item"],
    attrs: ["label"]
  },
  {
    name: "breadcrumb-item",
    profile: "navigation",
    purpose: "Single link in a breadcrumb path.",
    attrs: ["label", "href", "current"]
  },
  {
    name: "pagination",
    profile: "navigation",
    purpose: "Navigation between pages or result ranges.",
    attrs: ["label", "current", "pages"]
  }
] as const satisfies readonly BlockVocabularyEntry[];
