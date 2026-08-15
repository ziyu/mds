import { commandEnhancementsScript } from "./runtime/command.js";
import { calendarEnhancementsScript } from "./runtime/calendar.js";
import { menuEnhancementsScript } from "./runtime/menus.js";

export { commandEnhancementsScript, calendarEnhancementsScript, menuEnhancementsScript };

export const blockEnhancementsScript = [
  commandEnhancementsScript,
  calendarEnhancementsScript,
  menuEnhancementsScript
].join("\n");
