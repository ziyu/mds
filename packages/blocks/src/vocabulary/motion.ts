import type { BlockVocabularyEntry } from "../types.js";

export const motionVocabulary = [
  {
    name: "motion",
    profile: "motion",
    purpose: "Theme-owned motion wrapper.",
    attrs: ["preset", "trigger", "delay", "duration", "stagger", "once"]
  },
  {
    name: "reveal",
    profile: "motion",
    purpose: "Theme-owned reveal effect.",
    attrs: ["preset", "delay", "duration"]
  },
  {
    name: "scene",
    profile: "motion",
    purpose: "Rich visual or immersive section.",
    attrs: ["variant"]
  }
] as const satisfies readonly BlockVocabularyEntry[];
