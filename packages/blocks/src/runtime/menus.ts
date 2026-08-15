import { createEnhancementScript } from "./create-script.js";

const implementation = String.raw`  function setupContextMenus() {
    for (const contextMenu of document.querySelectorAll(".context-menu")) {
      if (!(contextMenu instanceof HTMLDetailsElement) || contextMenu.dataset.mdsContextMenu === "true") {
        continue;
      }
      const trigger = contextMenu.querySelector(".context-menu-trigger");
      const content = contextMenu.querySelector(".context-menu-content");
      if (!(trigger instanceof HTMLElement) || !(content instanceof HTMLElement)) {
        continue;
      }
      contextMenu.dataset.mdsContextMenu = "true";
      contextMenu.classList.add("is-enhanced");

      trigger.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        contextMenu.open = true;
        contextMenu.classList.add("is-context-open");
        content.style.left = "0px";
        content.style.top = "0px";
        requestAnimationFrame(() => {
          const rect = content.getBoundingClientRect();
          const left = Math.max(8, Math.min(event.clientX, window.innerWidth - rect.width - 8));
          const top = Math.max(8, Math.min(event.clientY, window.innerHeight - rect.height - 8));
          content.style.left = left + "px";
          content.style.top = top + "px";
          const first = content.querySelector(".menu-item-control:not(:disabled)");
          if (first instanceof HTMLButtonElement) {
            first.focus();
          }
        });
      });
      contextMenu.addEventListener("toggle", () => {
        if (!contextMenu.open) {
          contextMenu.classList.remove("is-context-open");
          content.removeAttribute("style");
        }
      });
      content.addEventListener("click", (event) => {
        if (event.target instanceof Element && event.target.closest(".menu-item-control") !== null) {
          contextMenu.open = false;
        }
      });
      document.addEventListener("pointerdown", (event) => {
        if (contextMenu.open && event.target instanceof Node && !contextMenu.contains(event.target)) {
          contextMenu.open = false;
        }
      });
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && contextMenu.open) {
          contextMenu.open = false;
          trigger.focus();
        }
      });
    }
  }

  function setupMenubars() {
    for (const menubar of document.querySelectorAll(".menubar")) {
      if (!(menubar instanceof HTMLElement) || menubar.dataset.mdsMenubar === "true") {
        continue;
      }
      const menus = Array.from(menubar.querySelectorAll(".dropdown-menu"));
      const triggers = menus.map((menu) => menu.querySelector("summary")).filter((trigger) => trigger instanceof HTMLElement);
      if (triggers.length === 0) {
        continue;
      }
      menubar.dataset.mdsMenubar = "true";
      menubar.classList.add("is-enhanced");
      triggers.forEach((trigger, index) => {
        trigger.setAttribute("role", "menuitem");
        trigger.tabIndex = index === 0 ? 0 : -1;
        trigger.addEventListener("click", () => closeSiblingMenus(menus, trigger.closest("details")));
        trigger.addEventListener("keydown", (event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            const change = event.key === "ArrowRight" ? 1 : -1;
            const target = triggers[(index + change + triggers.length) % triggers.length];
            triggers.forEach((item) => { item.tabIndex = item === target ? 0 : -1; });
            target.focus();
          } else if (event.key === "ArrowDown") {
            event.preventDefault();
            const details = trigger.closest("details");
            if (details instanceof HTMLDetailsElement) {
              closeSiblingMenus(menus, details);
              details.open = true;
              requestAnimationFrame(() => {
                const first = details.querySelector(".menu-item-control:not(:disabled)");
                if (first instanceof HTMLButtonElement) {
                  first.focus();
                }
              });
            }
          } else if (event.key === "Escape") {
            closeSiblingMenus(menus, null);
            trigger.focus();
          }
        });
      });
      menubar.addEventListener("click", (event) => {
        if (event.target instanceof Element && event.target.closest(".menu-item-control") !== null) {
          closeSiblingMenus(menus, null);
        }
      });
      document.addEventListener("pointerdown", (event) => {
        if (event.target instanceof Node && !menubar.contains(event.target)) {
          closeSiblingMenus(menus, null);
        }
      });
    }
  }

  function closeSiblingMenus(menus, keep) {
    for (const menu of menus) {
      if (menu instanceof HTMLDetailsElement && menu !== keep) {
        menu.open = false;
      }
    }
  }`;

export const menuEnhancementsScript = createEnhancementScript(["setupContextMenus","setupMenubars"], implementation);
