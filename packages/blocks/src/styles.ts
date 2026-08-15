import { createBlockBaseStyles } from "./styles/base.js";
import { calendarStyles } from "./styles/calendar.js";
import { commandStyles } from "./styles/command.js";
import { menuPrimitiveStyles } from "./styles/menu-primitives.js";
import { menuStyles } from "./styles/menus.js";

const composeStyles = (...styles: readonly string[]) => styles.join("\n\n");

const selectorsByCapability = {
  calendar: [".calendar"],
  command: [".command"],
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

export const blockFoundationStyles = composeStyles(
  createBlockBaseStyles(Object.values(selectorsByCapability).flat()),
  commandStyles,
  menuPrimitiveStyles,
  menuStyles,
  calendarStyles
);
