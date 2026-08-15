export type BlockProfile =
  | "core"
  | "guidance"
  | "data"
  | "media"
  | "docs"
  | "display"
  | "navigation"
  | "controls"
  | "forms"
  | "interactive"
  | "menus"
  | "chat"
  | "motion";

export interface BlockVocabularyEntry {
  name: string;
  profile: BlockProfile;
  purpose: string;
  slots?: readonly string[];
  attrs?: readonly string[];
  children?: readonly string[];
}
