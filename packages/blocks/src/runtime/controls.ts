import { createEnhancementScript } from "./create-script.js";

const implementation = String.raw`  function setupToggles() {
    for (const toggle of document.querySelectorAll("button.toggle-control[aria-pressed]")) {
      if (!(toggle instanceof HTMLButtonElement) || toggle.dataset.mdsToggle === "true") {
        continue;
      }

      toggle.dataset.mdsToggle = "true";
      toggle.addEventListener("click", () => {
        if (toggle.disabled) {
          return;
        }

        const delegatesToTarget = toggle.dataset.action === "toggle" && Boolean(toggle.dataset.target);
        if (delegatesToTarget) {
          return;
        }

        toggle.setAttribute("aria-pressed", toggle.getAttribute("aria-pressed") === "true" ? "false" : "true");
      });
    }
  }`;

export const controlEnhancementsScript = createEnhancementScript(["setupToggles"], implementation);
