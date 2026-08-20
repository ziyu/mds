import { commandEnhancementsScript } from "./runtime/command.js";
import { calendarEnhancementsScript } from "./runtime/calendar.js";
import { controlEnhancementsScript } from "./runtime/controls.js";
import { formEnhancementsScript } from "./runtime/forms.js";
import { interactiveEnhancementsScript } from "./runtime/interactive.js";
import { menuEnhancementsScript } from "./runtime/menus.js";
import { motionEnhancementsScript } from "./runtime/motion.js";

export {
  commandEnhancementsScript,
  calendarEnhancementsScript,
  controlEnhancementsScript,
  formEnhancementsScript,
  interactiveEnhancementsScript,
  menuEnhancementsScript,
  motionEnhancementsScript
};

export const blockEnhancementsScript = [
  commandEnhancementsScript,
  calendarEnhancementsScript,
  controlEnhancementsScript,
  formEnhancementsScript,
  interactiveEnhancementsScript,
  menuEnhancementsScript,
  motionEnhancementsScript
].join("\n");
