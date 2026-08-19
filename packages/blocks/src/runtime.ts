import { commandEnhancementsScript } from "./runtime/command.js";
import { calendarEnhancementsScript } from "./runtime/calendar.js";
import { controlEnhancementsScript } from "./runtime/controls.js";
import { menuEnhancementsScript } from "./runtime/menus.js";

export { commandEnhancementsScript, calendarEnhancementsScript, controlEnhancementsScript, menuEnhancementsScript };

export const blockEnhancementsScript = [
  commandEnhancementsScript,
  calendarEnhancementsScript,
  controlEnhancementsScript,
  menuEnhancementsScript
].join("\n");
