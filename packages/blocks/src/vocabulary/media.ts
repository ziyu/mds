import type { BlockVocabularyEntry } from "../types.js";

export const mediaVocabulary = [
  {
    name: "media",
    profile: "media",
    purpose: "Generic media frame.",
    slots: ["caption"]
  },
  {
    name: "image",
    profile: "media",
    purpose: "Theme-framed image.",
    slots: ["caption"],
    attrs: ["src", "alt"]
  },
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
  },
  {
    name: "gallery",
    profile: "media",
    purpose: "Media gallery.",
    children: ["figure", "image", "video"]
  }
] as const satisfies readonly BlockVocabularyEntry[];
