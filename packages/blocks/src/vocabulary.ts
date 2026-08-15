import type { BlockVocabularyEntry } from "./types.js";
import { coreVocabulary } from "./vocabulary/core.js";
import { controlVocabulary } from "./vocabulary/controls.js";
import { dataVocabulary } from "./vocabulary/data.js";
import { displayVocabulary } from "./vocabulary/display.js";
import { docsVocabulary } from "./vocabulary/docs.js";
import { formsVocabulary } from "./vocabulary/forms.js";
import { guidanceVocabulary } from "./vocabulary/guidance.js";
import { interactiveVocabulary } from "./vocabulary/interactive.js";
import { mediaVocabulary } from "./vocabulary/media.js";
import { menuVocabulary } from "./vocabulary/menus.js";
import { navigationVocabulary } from "./vocabulary/navigation.js";
import { chatVocabulary } from "./vocabulary/chat.js";
import { motionVocabulary } from "./vocabulary/motion.js";

export const blockVocabulary = [
  ...coreVocabulary,
  ...displayVocabulary,
  ...navigationVocabulary,
  ...guidanceVocabulary,
  ...dataVocabulary,
  ...mediaVocabulary,
  ...docsVocabulary,
  ...controlVocabulary,
  ...formsVocabulary,
  ...interactiveVocabulary,
  ...menuVocabulary,
  ...chatVocabulary,
  ...motionVocabulary
] as const satisfies readonly BlockVocabularyEntry[];

export const blockVocabularyByName: Readonly<Record<string, BlockVocabularyEntry>> = Object.fromEntries(
  blockVocabulary.map((block) => [block.name, block])
);
