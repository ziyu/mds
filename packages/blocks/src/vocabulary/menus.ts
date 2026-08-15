import type { BlockVocabularyEntry } from "../types.js";

export const menuVocabulary = [
  {
    name: "dropdown",
    profile: "menus",
    purpose: "Progressively enhanced disclosure containing menu items.",
    attrs: ["label", "open"],
    children: ["menu", "menu-item", "menu-group", "menu-separator"]
  },
  {
    name: "context-menu",
    profile: "menus",
    purpose: "Right-click menu with an explicit native disclosure fallback.",
    attrs: ["label", "open"],
    children: ["menu", "menu-item", "menu-group", "menu-separator"]
  },
  {
    name: "menubar",
    profile: "menus",
    purpose: "Persistent application menu bar composed from dropdown and menu blocks.",
    attrs: ["label"],
    children: ["dropdown", "menu"]
  },
  {
    name: "menu",
    profile: "menus",
    purpose: "List of commands or navigation choices.",
    attrs: ["label"],
    children: ["menu-item", "menu-group", "menu-separator"]
  },
  {
    name: "menu-group",
    profile: "menus",
    purpose: "Labeled group of related menu items.",
    attrs: ["label"],
    children: ["menu-item", "menu-separator"]
  },
  {
    name: "menu-item",
    profile: "menus",
    purpose: "Menu command using the existing data-action contract.",
    attrs: ["label", "action", "target", "keywords", "shortcut", "disabled"]
  },
  {
    name: "menu-separator",
    profile: "menus",
    purpose: "Visual separator between menu item groups."
  }
] as const satisfies readonly BlockVocabularyEntry[];
