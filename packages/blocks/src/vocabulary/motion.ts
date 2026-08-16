import type { BlockVocabularyEntry } from "../types.js";

export const motionVocabulary = [
  {
    name: "motion",
    profile: "motion",
    purpose: "Orchestrates motion for a group of child blocks.",
    attrs: ["preset", "trigger", "delay", "duration", "stagger", "once"]
  },
  {
    name: "reveal",
    profile: "motion",
    purpose: "Reveals one content region as it enters the viewport.",
    attrs: ["preset", "delay", "duration"]
  },
  {
    name: "scene",
    profile: "motion",
    purpose: "Creates a visually distinct section that a theme can stage or animate.",
    attrs: ["variant"]
  }
] as const satisfies readonly BlockVocabularyEntry[];
