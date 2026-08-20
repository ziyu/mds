import { createEnhancementScript } from "./create-script.js";

const implementation = String.raw`  function setupFloatingMenus() {
    for (const menu of document.querySelectorAll("[data-mds-role='dropdown'], [data-mds-role='context-menu'], .dropdown-menu, .context-menu")) {
      if (!(menu instanceof HTMLDetailsElement) || menu.dataset.mdsFloatingMenu === "true") {
        continue;
      }
      const trigger = menu.querySelector(":scope > summary");
      const content = menu.querySelector(":scope > .dropdown-menu-content, :scope > .context-menu-content");
      if (!(trigger instanceof HTMLElement) || !(content instanceof HTMLElement)) {
        continue;
      }

      menu.dataset.mdsFloatingMenu = "true";
      menu.classList.add("is-floating-menu");
      trigger.setAttribute("aria-haspopup", "menu");
      trigger.setAttribute("aria-expanded", menu.open ? "true" : "false");

      const position = () => {
        if (!menu.open || menu.classList.contains("is-context-open")) {
          return;
        }
        menu.classList.remove("is-menu-align-end", "is-menu-drop-up");
        content.style.removeProperty("--mds-menu-available-height");

        requestAnimationFrame(() => {
          if (!menu.open || menu.classList.contains("is-context-open")) {
            return;
          }
          const triggerRect = trigger.getBoundingClientRect();
          const initialRect = content.getBoundingClientRect();
          const viewportPadding = 8;

          if (initialRect.right > window.innerWidth - viewportPadding) {
            menu.classList.add("is-menu-align-end");
          }

          const availableBelow = window.innerHeight - triggerRect.bottom - viewportPadding;
          const availableAbove = triggerRect.top - viewportPadding;
          if (initialRect.height > availableBelow && availableAbove > availableBelow) {
            menu.classList.add("is-menu-drop-up");
            content.style.setProperty("--mds-menu-available-height", Math.max(96, availableAbove - 8) + "px");
          } else {
            content.style.setProperty("--mds-menu-available-height", Math.max(96, availableBelow - 8) + "px");
          }
        });
      };

      menu.addEventListener("toggle", () => {
        trigger.setAttribute("aria-expanded", menu.open ? "true" : "false");
        if (menu.open) {
          position();
        } else {
          menu.classList.remove("is-menu-align-end", "is-menu-drop-up");
          content.style.removeProperty("--mds-menu-available-height");
        }
      });
      content.addEventListener("click", (event) => {
        if (event.target instanceof Element && event.target.closest(".menu-item-control") !== null) {
          menu.open = false;
        }
      });
      document.addEventListener("pointerdown", (event) => {
        if (menu.open && event.target instanceof Node && !menu.contains(event.target)) {
          menu.open = false;
        }
      });
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && menu.open) {
          menu.open = false;
          trigger.focus();
        }
      });
      window.addEventListener("resize", position, { passive: true });

      if (menu.open) {
        position();
      }
    }
  }

  function setupContextMenus() {
    for (const contextMenu of document.querySelectorAll("[data-mds-role='context-menu'], .context-menu")) {
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
    }
  }

  function setupMenubars() {
    for (const menubar of document.querySelectorAll("[data-mds-role='menubar'], .menubar")) {
      if (!(menubar instanceof HTMLElement) || menubar.dataset.mdsMenubar === "true") {
        continue;
      }
      const menus = Array.from(menubar.querySelectorAll("[data-mds-role='dropdown'], .dropdown-menu"));
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
    }
  }

  function closeSiblingMenus(menus, keep) {
    for (const menu of menus) {
      if (menu instanceof HTMLDetailsElement && menu !== keep) {
        menu.open = false;
      }
    }
  }`;

export const menuEnhancementsScript = createEnhancementScript(["setupFloatingMenus","setupContextMenus","setupMenubars"], implementation);
