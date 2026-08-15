import type { BlockVocabularyEntry } from "../types.js";

export const dataVocabulary = [
  {
    name: "comparison",
    profile: "data",
    purpose: "Compare options, features, or approaches.",
    children: ["card"]
  },
  {
    name: "data-table",
    profile: "data",
    purpose: "Native table with optional filtering, sorting, pagination, and row selection enhancement.",
    slots: ["columns", "rows", "empty"],
    attrs: ["label", "filter", "page-size", "selectable"]
  },
  {
    name: "data-column",
    profile: "data",
    purpose: "Column definition for a data table.",
    attrs: ["key", "label", "sortable"]
  },
  {
    name: "data-row",
    profile: "data",
    purpose: "Native row in a data table.",
    attrs: ["id", "selected", "disabled"],
    children: ["data-cell"]
  },
  {
    name: "data-cell",
    profile: "data",
    purpose: "Native cell associated with a data table column.",
    attrs: ["column", "label"]
  },
  {
    name: "chart",
    profile: "data",
    purpose: "Accessible chart surface with a readable native meter fallback.",
    slots: ["description", "legend"],
    attrs: ["label", "type"],
    children: ["chart-series"]
  },
  {
    name: "chart-series",
    profile: "data",
    purpose: "Named series of chart data points.",
    attrs: ["label", "color"],
    children: ["chart-point"]
  },
  {
    name: "chart-point",
    profile: "data",
    purpose: "One labeled numeric chart value.",
    attrs: ["label", "value", "max"]
  },
  {
    name: "metric",
    profile: "data",
    purpose: "Highlighted metric.",
    attrs: ["value", "label"]
  },
  {
    name: "progress",
    profile: "data",
    purpose: "Progress indicator.",
    attrs: ["value", "max", "label"]
  },
  {
    name: "badge",
    profile: "data",
    purpose: "Small status label.",
    attrs: ["tone"]
  },
  {
    name: "tag",
    profile: "data",
    purpose: "Small category label.",
    attrs: ["tone"]
  }
] as const satisfies readonly BlockVocabularyEntry[];
