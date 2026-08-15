import type { ThemeBlockPackSource } from "@mds-crate/theme-loader";
import { coreBlocks } from "./core.js";
import { displayBlocks } from "./display.js";
import { navigationBlocks } from "./navigation.js";
import { guidanceBlocks } from "./guidance.js";
import { dataBlocks } from "./data.js";
import { mediaBlocks } from "./media.js";
import { docsBlocks } from "./docs.js";
import { controlBlocks } from "./controls.js";
import { formsBlocks } from "./forms.js";
import { interactiveBlocks } from "./interactive.js";
import { menuBlocks } from "./menus.js";
import { chatBlocks } from "./chat.js";
import { motionBlocks } from "./motion.js";

export {
  coreBlocks,
  displayBlocks,
  navigationBlocks,
  guidanceBlocks,
  dataBlocks,
  mediaBlocks,
  docsBlocks,
  controlBlocks,
  formsBlocks,
  interactiveBlocks,
  menuBlocks,
  chatBlocks,
  motionBlocks
};

export const foundationBlocks = [
  coreBlocks,
  displayBlocks,
  navigationBlocks,
  controlBlocks,
  formsBlocks,
  interactiveBlocks,
  menuBlocks
] as const;

export const standardBlocks = [
  coreBlocks,
  displayBlocks,
  navigationBlocks,
  controlBlocks,
  formsBlocks,
  interactiveBlocks,
  menuBlocks,
  dataBlocks,
  docsBlocks,
  mediaBlocks,
  guidanceBlocks,
  chatBlocks,
  motionBlocks
] as const;

export const blockPacksByName: Readonly<Record<string, ThemeBlockPackSource>> = Object.fromEntries(
  standardBlocks.map((pack) => [pack.name, pack])
);
