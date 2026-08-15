import type { BlockVocabularyEntry } from "../types.js";

export const docsVocabulary = [
  {
    name: "terminal",
    profile: "docs",
    purpose: "Terminal commands or transcript.",
    attrs: ["title"]
  },
  {
    name: "code-group",
    profile: "docs",
    purpose: "Grouped code samples in named slots."
  },
  {
    name: "file-tree",
    profile: "docs",
    purpose: "File tree display."
  },
  {
    name: "api",
    profile: "docs",
    purpose: "API reference group.",
    children: ["endpoint"]
  },
  {
    name: "endpoint",
    profile: "docs",
    purpose: "Single API endpoint.",
    attrs: ["method", "path"]
  }
] as const satisfies readonly BlockVocabularyEntry[];
