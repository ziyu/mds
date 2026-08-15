import type { BlockVocabularyEntry } from "../types.js";

export const controlVocabulary = [
  {
    name: "button",
    profile: "controls",
    purpose: "Native button for an action or form operation.",
    attrs: ["label", "type", "action", "target", "form", "disabled"]
  },
  {
    name: "toggle",
    profile: "controls",
    purpose: "Two-state pressed button, distinct from a form switch.",
    attrs: ["label", "pressed", "action", "target", "disabled"]
  },
  {
    name: "toggle-group",
    profile: "controls",
    purpose: "Group of related toggle buttons.",
    attrs: ["label"],
    children: ["toggle"]
  }
] as const satisfies readonly BlockVocabularyEntry[];
