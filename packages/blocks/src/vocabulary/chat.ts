import type { BlockVocabularyEntry } from "../types.js";

export const chatVocabulary = [
  {
    name: "attachment",
    profile: "chat",
    purpose: "File or image attachment with metadata, progress, and actions.",
    slots: ["media", "description", "actions"],
    attrs: ["title", "href", "src", "alt", "type", "size", "state", "progress", "download"]
  },
  {
    name: "bubble",
    profile: "chat",
    purpose: "Framed conversational content with alignment, variants, and reactions.",
    slots: ["reactions"],
    attrs: ["variant", "align"]
  },
  {
    name: "marker",
    profile: "chat",
    purpose: "Conversation status, system note, or labeled separator.",
    slots: ["icon"],
    attrs: ["variant", "role", "label"]
  },
  {
    name: "message",
    profile: "chat",
    purpose: "Conversation row with avatar, sender metadata, content, and footer slots.",
    slots: ["avatar", "header", "body", "footer"],
    attrs: ["align", "sender", "status"]
  },
  {
    name: "message-scroller",
    profile: "chat",
    purpose: "Keyboard-focusable live transcript with follow-latest enhancement.",
    attrs: ["label", "follow", "height", "busy"],
    children: ["message", "marker", "attachment"]
  }
] as const satisfies readonly BlockVocabularyEntry[];
