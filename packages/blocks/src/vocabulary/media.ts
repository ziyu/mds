import type { BlockVocabularyEntry } from "../types.js";

export const mediaVocabulary = [
  {
    name: "video",
    profile: "media",
    purpose: "Theme-framed video.",
    slots: ["caption"],
    attrs: ["src"]
  },
  {
    name: "figure",
    profile: "media",
    purpose: "Figure with optional caption.",
    slots: ["caption"]
  },
  {
    name: "caption",
    profile: "media",
    purpose: "Caption text for nearby media."
  }
] as const satisfies readonly BlockVocabularyEntry[];
