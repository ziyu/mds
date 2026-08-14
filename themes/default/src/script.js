/* Default theme progressive enhancement. */
(() => {
  const byId = (id) => document.getElementById(id);

  for (const tabs of document.querySelectorAll(".tabs")) {
    const panels = Array.from(tabs.querySelectorAll(".tabs-item"));
    if (panels.length === 0) {
      continue;
    }

    const list = document.createElement("div");
    list.className = "tabs-list";
    list.setAttribute("role", "tablist");

    panels.forEach((panel, index) => {
      const name = panel.getAttribute("data-slot") || `Tab ${index + 1}`;
      const panelId = panel.id || `tab-panel-${Math.random().toString(36).slice(2)}`;
      const buttonId = `${panelId}-button`;
      panel.id = panelId;
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", buttonId);

      const button = document.createElement("button");
      button.id = buttonId;
      button.className = "tab-button";
      button.type = "button";
      button.textContent = name;
      button.setAttribute("role", "tab");
      button.setAttribute("aria-controls", panelId);
      button.setAttribute("aria-selected", index === 0 ? "true" : "false");
      button.addEventListener("click", () => activateTab(tabs, panels, button));
      list.append(button);

      if (index === 0) {
        panel.classList.add("is-active");
      }
    });

    tabs.classList.add("is-enhanced");
    tabs.insertBefore(list, tabs.querySelector(".tabs-panels"));
  }

  document.addEventListener("click", (event) => {
    const control = event.target.closest("[data-action]");
    if (!(control instanceof HTMLElement)) {
      return;
    }

    const action = control.dataset.action;
    const targetId = control.dataset.target;
    const target = targetId ? byId(targetId) : undefined;

    if (action === "toggle" && target) {
      target.classList.toggle("is-open");
      if (target instanceof HTMLDetailsElement) {
        target.open = !target.open;
      }
    }

    if ((action === "show" || action === "open") && target) {
      target.classList.add("is-open");
      if (target instanceof HTMLDetailsElement) {
        target.open = true;
      }
    }

    if ((action === "hide" || action === "close") && target) {
      target.classList.remove("is-open");
      if (target instanceof HTMLDetailsElement) {
        target.open = false;
      }
    }
  });

  document.addEventListener("click", (event) => {
    const close = event.target.closest(".dialog-close, .drawer-close");
    if (!(close instanceof HTMLElement)) {
      return;
    }

    close.closest(".dialog, .drawer")?.classList.remove("is-open");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }

    document.querySelectorAll(".dialog.is-open, .drawer.is-open").forEach((element) => {
      element.classList.remove("is-open");
    });
  });

  function activateTab(tabs, panels, button) {
    const panelId = button.getAttribute("aria-controls");
    tabs.querySelectorAll(".tab-button").forEach((item) => {
      item.setAttribute("aria-selected", item === button ? "true" : "false");
    });
    panels.forEach((panel) => {
      panel.classList.toggle("is-active", panel.id === panelId);
    });
  }
})();
