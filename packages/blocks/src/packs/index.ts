import type { ThemeBlockPackSource } from "@mds-crate/theme-loader";
import { coreBlocks } from "./core.js";
import { displayBlocks } from "./display.js";
import { navigationBlocks } from "./navigation.js";
import { mediaBlocks } from "./media.js";
import { controlBlocks } from "./controls.js";
import { formsBlocks } from "./forms.js";
import { interactiveBlocks } from "./interactive.js";
import { menuBlocks } from "./menus.js";
import { motionBlocks } from "./motion.js";

export {
  coreBlocks,
  displayBlocks,
  navigationBlocks,
  mediaBlocks,
  controlBlocks,
  formsBlocks,
  interactiveBlocks,
  menuBlocks,
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

export const blockPacksByName: Readonly<Record<string, ThemeBlockPackSource>> = Object.fromEntries(
  [...foundationBlocks, mediaBlocks, motionBlocks].map((pack) => [pack.name, pack])
);
