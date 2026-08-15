import type { BlockVocabularyEntry } from "../types.js";

export const formsVocabulary = [
  {
    name: "form",
    profile: "forms",
    purpose: "Native form container.",
    attrs: ["method", "action", "validate", "novalidate"]
  },
  {
    name: "fieldset",
    profile: "forms",
    purpose: "Group related form fields.",
    attrs: ["legend", "disabled"]
  },
  {
    name: "button-group",
    profile: "forms",
    purpose: "Related form or action buttons."
  },
  {
    name: "field",
    profile: "forms",
    purpose: "Layout and validation wrapper for one form field.",
    attrs: ["invalid"]
  },
  {
    name: "label",
    profile: "forms",
    purpose: "Native label for a form control.",
    attrs: ["text", "for"]
  },
  {
    name: "help",
    profile: "forms",
    purpose: "Supporting instructions for a form field."
  },
  {
    name: "error",
    profile: "forms",
    purpose: "Validation feedback for a form field."
  },
  {
    name: "input",
    profile: "forms",
    purpose: "Native text-like input with a visible label.",
    attrs: [
      "type",
      "name",
      "label",
      "placeholder",
      "value",
      "autocomplete",
      "min",
      "max",
      "step",
      "required",
      "disabled",
      "readonly"
    ]
  },
  {
    name: "input-group",
    profile: "forms",
    purpose: "Native text input composed with inline addons, actions, and supporting text.",
    slots: ["prefix", "suffix", "actions", "help", "error"],
    attrs: [
      "type",
      "name",
      "label",
      "placeholder",
      "value",
      "autocomplete",
      "inputmode",
      "min",
      "max",
      "step",
      "required",
      "disabled",
      "readonly",
      "invalid"
    ]
  },
  {
    name: "input-otp",
    profile: "forms",
    purpose: "Accessible one-time-code input with native paste and autofill behavior.",
    slots: ["help", "error"],
    attrs: [
      "name",
      "label",
      "length",
      "pattern",
      "placeholder",
      "value",
      "inputmode",
      "required",
      "disabled",
      "readonly",
      "invalid"
    ]
  },
  {
    name: "combobox",
    profile: "forms",
    purpose: "Native autocomplete input backed by datalist options.",
    attrs: [
      "name",
      "label",
      "list",
      "placeholder",
      "value",
      "autocomplete",
      "required",
      "disabled",
      "readonly",
      "invalid"
    ],
    children: ["option"]
  },
  {
    name: "calendar",
    profile: "forms",
    purpose: "Inline single, range, or multiple date selection with a native date-input fallback.",
    attrs: [
      "name",
      "label",
      "mode",
      "value",
      "month",
      "min",
      "max",
      "locale",
      "weekstart",
      "required",
      "disabled",
      "readonly"
    ]
  },
  {
    name: "select",
    profile: "forms",
    purpose: "Native select control containing option blocks.",
    attrs: ["name", "label", "required", "disabled", "multiple"],
    children: ["option"]
  },
  {
    name: "option",
    profile: "forms",
    purpose: "Native option within a select block.",
    attrs: ["label", "value", "selected", "disabled"]
  },
  {
    name: "textarea",
    profile: "forms",
    purpose: "Native multiline input with a visible label.",
    attrs: ["name", "label", "placeholder", "rows", "required", "disabled", "readonly"]
  },
  {
    name: "checkbox",
    profile: "forms",
    purpose: "Native independent checkbox.",
    attrs: ["name", "label", "value", "checked", "required", "disabled"]
  },
  {
    name: "radio",
    profile: "forms",
    purpose: "Native radio option within a radio group.",
    attrs: ["name", "label", "value", "checked", "required", "disabled"]
  },
  {
    name: "radio-group",
    profile: "forms",
    purpose: "Native fieldset grouping related radio blocks.",
    attrs: ["legend", "disabled"],
    children: ["radio"]
  },
  {
    name: "slider",
    profile: "forms",
    purpose: "Native range input for choosing a numeric value.",
    attrs: ["name", "label", "min", "max", "step", "value", "disabled"]
  },
  {
    name: "switch",
    profile: "forms",
    purpose: "Native checkbox exposed as an immediate on/off switch.",
    attrs: ["name", "label", "value", "checked", "required", "disabled"]
  }
] as const satisfies readonly BlockVocabularyEntry[];
