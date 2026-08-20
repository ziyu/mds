import { createBlockBaseStyles } from "./styles/base.js";
import { calendarStyles } from "./styles/calendar.js";
import { commandStyles } from "./styles/command.js";
import { interactiveStyles } from "./styles/interactive.js";
import { menuPrimitiveStyles } from "./styles/menu-primitives.js";
import { menuStyles } from "./styles/menus.js";
import { motionStyles } from "./styles/motion.js";

const composeStyles = (...styles: readonly string[]) => styles.join("\n\n");

const selectorsByCapability = {
  calendar: [".calendar"],
  command: [".command"],
  interactive: [
    "[data-mds-role='tabs']",
    "[data-mds-role='accordion']",
    "[data-mds-role='carousel']",
    "[data-mds-role='dialog']",
    "[data-mds-role='drawer']"
  ],
  menus: [".context-menu", ".menubar"]
} as const;

export const calendarBlockStyles = composeStyles(createBlockBaseStyles(selectorsByCapability.calendar), calendarStyles);
export const commandBlockStyles = composeStyles(
  createBlockBaseStyles(selectorsByCapability.command),
  menuPrimitiveStyles,
  commandStyles
);
export const menuBlockStyles = composeStyles(
  createBlockBaseStyles(selectorsByCapability.menus),
  menuPrimitiveStyles,
  menuStyles
);
export const interactiveBlockStyles = composeStyles(
  createBlockBaseStyles(selectorsByCapability.interactive),
  interactiveStyles
);
export const motionBlockStyles = motionStyles;

export const blockFoundationStyles = composeStyles(
  createBlockBaseStyles(Object.values(selectorsByCapability).flat()),
  commandStyles,
  interactiveStyles,
  menuPrimitiveStyles,
  menuStyles,
  calendarStyles,
  motionStyles
);
