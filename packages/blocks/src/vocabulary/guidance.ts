import type { BlockVocabularyEntry } from "../types.js";

export const guidanceVocabulary = [
  {
    name: "steps",
    profile: "guidance",
    purpose: "Ordered process or tutorial steps.",
    children: ["step"]
  },
  {
    name: "step",
    profile: "guidance",
    purpose: "One step in a process.",
    attrs: ["date", "label"]
  },
  {
    name: "timeline",
    profile: "guidance",
    purpose: "Sequential events.",
    children: ["step"]
  },
  {
    name: "faq",
    profile: "guidance",
    purpose: "Frequently asked questions.",
    children: ["details"]
  }
] as const satisfies readonly BlockVocabularyEntry[];
