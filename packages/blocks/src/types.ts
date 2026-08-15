export type BlockProfile =
  | "core"
  | "media"
  | "display"
  | "navigation"
  | "controls"
  | "forms"
  | "interactive"
  | "menus"
  | "motion";

export interface BlockVocabularyEntry {
  name: string;
  profile: BlockProfile;
  purpose: string;
  slots?: readonly string[];
  attrs?: readonly string[];
  children?: readonly string[];
}
