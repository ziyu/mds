import { createEnhancementScript } from "./create-script.js";

const implementation = String.raw`  function setupCommands() {
    for (const command of document.querySelectorAll("[data-mds-role='command'], section.command")) {
      if (!(command instanceof HTMLElement) || command.dataset.mdsCommand === "true") {
        continue;
      }
      const search = command.querySelector(".command-search");
      const input = command.querySelector(".command-input");
      const empty = command.querySelector(".command-empty");
      const items = Array.from(command.querySelectorAll(".menu-item"));
      if (!(search instanceof HTMLElement) || !(input instanceof HTMLInputElement) || !(empty instanceof HTMLElement) || items.length === 0) {
        continue;
      }

      command.dataset.mdsCommand = "true";
      command.classList.add("is-enhanced");
      search.hidden = false;

      const filter = () => {
        const query = input.value.trim().toLocaleLowerCase();
        let visible = 0;
        for (const item of items) {
          const label = item.getAttribute("data-attr-label") || "";
          const keywords = item.getAttribute("data-attr-keywords") || "";
          const haystack = (label + " " + keywords + " " + (item.textContent || "")).toLocaleLowerCase();
          const matches = query === "" || haystack.includes(query);
          item.hidden = !matches;
          visible += matches ? 1 : 0;
        }
        for (const group of command.querySelectorAll(".menu-group")) {
          if (group instanceof HTMLElement) {
            group.hidden = group.querySelector(".menu-item:not([hidden])") === null;
          }
        }
        empty.hidden = visible !== 0;
      };

      input.addEventListener("input", filter);
      filter();
    }
  }`;

export const commandEnhancementsScript = createEnhancementScript(["setupCommands"], implementation);
