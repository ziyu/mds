import type { BlockVocabularyEntry } from "../types.js";

export const displayVocabulary = [
  {
    name: "avatar",
    profile: "display",
    purpose: "Compact identity image with a text fallback.",
    attrs: ["src", "alt", "fallback", "size"]
  },
  {
    name: "empty",
    profile: "display",
    purpose: "Empty-state message with optional media and actions.",
    slots: ["media", "title", "description", "actions"]
  },
  {
    name: "item",
    profile: "display",
    purpose: "Versatile content row with media, copy, actions, and footer.",
    slots: ["media", "title", "description", "actions", "footer"],
    attrs: ["variant", "size"]
  }
] as const satisfies readonly BlockVocabularyEntry[];
