import { commandEnhancementsScript } from "./runtime/command.js";
import { calendarEnhancementsScript } from "./runtime/calendar.js";
import { dataTableEnhancementsScript } from "./runtime/data-table.js";
import { menuEnhancementsScript } from "./runtime/menus.js";
import { chatEnhancementsScript } from "./runtime/chat.js";

export { commandEnhancementsScript, calendarEnhancementsScript, dataTableEnhancementsScript, menuEnhancementsScript, chatEnhancementsScript };

export const blockEnhancementsScript = [
  commandEnhancementsScript,
  calendarEnhancementsScript,
  dataTableEnhancementsScript,
  menuEnhancementsScript,
  chatEnhancementsScript
].join("\n");
