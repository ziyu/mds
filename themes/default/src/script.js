/* Default theme progressive enhancement. */
(() => {
  const focusableSelector = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex='-1'])"
  ].join(",");

  let activeOverlay = null;
  let previouslyFocused = null;

  const byId = (id) => document.getElementById(id);

  document.querySelectorAll(".tabs").forEach((tabs, tabsIndex) => {
    const panelsContainer = tabs.querySelector(".tabs-panels");
    const panels = panelsContainer
      ? Array.from(panelsContainer.children).filter((item) => item.classList.contains("tabs-item"))
      : [];

    if (panels.length === 0) {
      return;
    }

    const list = document.createElement("div");
    list.className = "tabs-list";
    list.setAttribute("role", "tablist");
    list.setAttribute("aria-label", tabs.getAttribute("data-attr-label") || "Sections");

    panels.forEach((panel, panelIndex) => {
      const name = panel.getAttribute("data-slot") || `Tab ${panelIndex + 1}`;
      const baseId = `tabs-${tabsIndex + 1}-${panelIndex + 1}`;
      const panelId = panel.id || `${baseId}-panel`;
      const buttonId = `${baseId}-tab`;
      const button = document.createElement("button");

      panel.id = panelId;
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", buttonId);
      panel.tabIndex = 0;
      panel.hidden = panelIndex !== 0;
      panel.classList.toggle("is-active", panelIndex === 0);

      button.id = buttonId;
      button.className = "tab-button";
      button.type = "button";
      button.textContent = name;
      button.setAttribute("role", "tab");
      button.setAttribute("aria-controls", panelId);
      button.setAttribute("aria-selected", panelIndex === 0 ? "true" : "false");
      button.tabIndex = panelIndex === 0 ? 0 : -1;
      button.addEventListener("click", () => activateTab(tabs, panels, button));
      button.addEventListener("keydown", (event) => navigateTabs(event, list, tabs, panels));
      list.append(button);
    });

    tabs.classList.add("is-enhanced");
    tabs.insertBefore(list, panelsContainer);
  });

  document.querySelectorAll(".accordion").forEach((accordion, accordionIndex) => {
    const items = Array.from(accordion.children).filter((item) => item.classList.contains("accordion-item"));
    if (items.length === 0) {
      return;
    }

    items.forEach((item, itemIndex) => {
      const label = item.getAttribute("data-slot") || `Section ${itemIndex + 1}`;
      const baseId = `accordion-${accordionIndex + 1}-${itemIndex + 1}`;
      const heading = document.createElement("h3");
      const button = document.createElement("button");
      const panel = document.createElement("div");
      const expanded = itemIndex === 0;

      heading.className = "accordion-heading";
      button.id = `${baseId}-button`;
      button.className = "accordion-button";
      button.type = "button";
      button.textContent = label;
      button.setAttribute("aria-expanded", expanded ? "true" : "false");
      button.setAttribute("aria-controls", `${baseId}-panel`);
      heading.append(button);

      panel.id = `${baseId}-panel`;
      panel.className = "accordion-panel";
      panel.setAttribute("role", "region");
      panel.setAttribute("aria-labelledby", button.id);
      panel.hidden = !expanded;
      while (item.firstChild) {
        panel.append(item.firstChild);
      }

      button.addEventListener("click", () => {
        const shouldExpand = button.getAttribute("aria-expanded") !== "true";
        accordion.querySelectorAll(".accordion-button").forEach((control) => {
          const controlled = control.getAttribute("aria-controls");
          const controlledPanel = controlled ? document.getElementById(controlled) : null;
          const isCurrent = control === button;
          control.setAttribute("aria-expanded", isCurrent && shouldExpand ? "true" : "false");
          controlledPanel?.toggleAttribute("hidden", !(isCurrent && shouldExpand));
          control.closest(".accordion-item")?.classList.toggle("is-open", isCurrent && shouldExpand);
        });
      });

      item.classList.toggle("is-open", expanded);
      item.append(heading, panel);
    });

    accordion.classList.add("is-enhanced");
  });

  document.addEventListener("click", (event) => {
    const closeControl = event.target.closest("[data-overlay-close]");
    if (closeControl) {
      const overlay = closeControl.closest(".dialog, .drawer");
      if (overlay) {
        closeOverlay(overlay);
      }
      return;
    }

    const control = event.target.closest("[data-action]");
    if (!(control instanceof HTMLElement)) {
      return;
    }

    const action = control.dataset.action;
    const target = control.dataset.target ? byId(control.dataset.target) : null;
    if (!target || !["open", "close", "show", "hide", "toggle"].includes(action)) {
      return;
    }

    event.preventDefault();

    if (action === "toggle") {
      const shouldOpen = target.matches(".dialog, .drawer")
        ? !target.classList.contains("is-open")
        : target instanceof HTMLDetailsElement
          ? !target.open
          : target.hidden;
      setTargetState(target, shouldOpen, control);
      return;
    }

    setTargetState(target, action === "open" || action === "show", control);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && activeOverlay) {
      event.preventDefault();
      closeOverlay(activeOverlay);
      return;
    }

    if (event.key === "Tab" && activeOverlay) {
      trapFocus(event, activeOverlay);
    }
  });

  const supportedMotionPresets = new Set([
    "fade-in",
    "fade-up",
    "slide-left",
    "slide-right",
    "scale-in",
    "blur-in",
    "reveal",
    "scene"
  ]);
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const motionElements = document.querySelectorAll(".motion, .reveal, .scene, [data-attr-motion]");
  const motionObserver = "IntersectionObserver" in window && !prefersReducedMotion
    ? new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const element = entry.target;
          if (!(element instanceof HTMLElement)) {
            return;
          }

          if (entry.isIntersecting) {
            element.classList.add("is-visible");
            if (element.dataset.motionOnce !== "false") {
              motionObserver?.unobserve(element);
            }
          } else if (element.dataset.motionOnce === "false") {
            element.classList.remove("is-visible");
          }
        });
      }, { rootMargin: "0px 0px -10%", threshold: 0.12 })
    : null;

  motionElements.forEach((element) => {
    if (!(element instanceof HTMLElement)) {
      return;
    }

    const presetFallback = element.classList.contains("reveal")
      ? "reveal"
      : element.classList.contains("scene")
        ? "scene"
        : "fade-up";
    const requestedPreset = readMotionAttribute(element, "preset")
      || readMotionAttribute(element, "motion")
      || presetFallback;
    const preset = supportedMotionPresets.has(requestedPreset) ? requestedPreset : presetFallback;
    const trigger = normalizeMotionTrigger(readMotionAttribute(element, "trigger"));
    const delay = readMotionTime(element, "delay", 0, 0, 4_000);
    const duration = readMotionTime(
      element,
      "duration",
      element.classList.contains("scene") ? 880 : element.classList.contains("reveal") ? 720 : 640,
      120,
      4_000
    );
    const stagger = readMotionTime(element, "stagger", 0, 0, 1_000);
    const once = readMotionBoolean(element, "once", true);

    element.dataset.motionPreset = preset;
    element.dataset.motionTrigger = trigger;
    element.dataset.motionOnce = once ? "true" : "false";
    element.style.setProperty("--motion-delay", `${delay}ms`);
    element.style.setProperty("--motion-duration", `${duration}ms`);
    element.setAttribute("data-motion-ready", "");

    if (stagger > 0 && element.children.length > 1) {
      element.classList.add("has-stagger");
      Array.from(element.children).forEach((child, childIndex) => {
        if (!(child instanceof HTMLElement)) {
          return;
        }
        child.classList.add("motion-item");
        child.style.setProperty("--motion-item-delay", `${delay + childIndex * stagger}ms`);
      });
    }

    if (prefersReducedMotion || motionObserver === null) {
      element.classList.add("is-visible");
      return;
    }

    if (trigger === "load") {
      requestAnimationFrame(() => requestAnimationFrame(() => element.classList.add("is-visible")));
    } else if (trigger === "hover") {
      element.classList.add("is-visible", "is-motion-hover");
    } else if (trigger === "view") {
      motionObserver.observe(element);
    }
    // `state` intentionally waits for an application to toggle `.is-visible`.
  });

  function readMotionAttribute(element, name) {
    return (element.getAttribute(`data-attr-${name}`) || "").trim().toLowerCase();
  }

  function readMotionTime(element, name, fallback, minimum, maximum) {
    const value = Number.parseFloat(readMotionAttribute(element, name));
    return Number.isFinite(value) ? Math.min(maximum, Math.max(minimum, value)) : fallback;
  }

  function readMotionBoolean(element, name, fallback) {
    const value = readMotionAttribute(element, name);
    if (value === "") {
      return fallback;
    }
    return !["false", "0", "no", "off"].includes(value);
  }

  function normalizeMotionTrigger(value) {
    return ["load", "view", "hover", "state"].includes(value) ? value : "view";
  }

  function activateTab(tabs, panels, button, moveFocus = false) {
    const panelId = button.getAttribute("aria-controls");
    tabs.querySelectorAll(".tab-button").forEach((item) => {
      const isActive = item === button;
      item.setAttribute("aria-selected", isActive ? "true" : "false");
      item.tabIndex = isActive ? 0 : -1;
    });
    panels.forEach((panel) => {
      const isActive = panel.id === panelId;
      panel.hidden = !isActive;
      panel.classList.toggle("is-active", isActive);
    });
    if (moveFocus) {
      button.focus();
    }
  }

  function navigateTabs(event, list, tabs, panels) {
    const buttons = Array.from(list.querySelectorAll(".tab-button"));
    const currentIndex = buttons.indexOf(event.currentTarget);
    let nextIndex;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % buttons.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = buttons.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    activateTab(tabs, panels, buttons[nextIndex], true);
  }

  function setTargetState(target, open, control) {
    if (target.matches(".dialog, .drawer")) {
      if (open) {
        openOverlay(target, control);
      } else {
        closeOverlay(target);
      }
      return;
    }

    target.classList.toggle("is-open", open);
    if (target instanceof HTMLDetailsElement) {
      target.open = open;
    } else {
      target.hidden = !open;
    }
    if (control?.hasAttribute("aria-pressed")) {
      control.setAttribute("aria-pressed", open ? "true" : "false");
    }
    if (control?.hasAttribute("aria-expanded")) {
      control.setAttribute("aria-expanded", open ? "true" : "false");
    }
  }

  function openOverlay(overlay, trigger) {
    if (activeOverlay && activeOverlay !== overlay) {
      closeOverlay(activeOverlay, false);
    }

    previouslyFocused = trigger instanceof HTMLElement ? trigger : document.activeElement;
    activeOverlay = overlay;
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("has-overlay");

    const panel = overlay.querySelector(".dialog-panel, .drawer-panel");
    const firstFocusable = panel?.querySelector(focusableSelector);
    panel?.focus({ preventScroll: true });
    requestAnimationFrame(() => (firstFocusable || panel)?.focus({ preventScroll: true }));
  }

  function closeOverlay(overlay, restoreFocus = true) {
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    if (activeOverlay === overlay) {
      activeOverlay = null;
      document.body.classList.remove("has-overlay");
      if (restoreFocus && previouslyFocused instanceof HTMLElement) {
        previouslyFocused.focus();
      }
      previouslyFocused = null;
    }
  }

  function trapFocus(event, overlay) {
    const items = Array.from(overlay.querySelectorAll(focusableSelector))
      .filter((item) => item instanceof HTMLElement && item.offsetParent !== null && !item.matches("[data-overlay-close][tabindex='-1']"));
    if (items.length === 0) {
      event.preventDefault();
      overlay.querySelector(".dialog-panel, .drawer-panel")?.focus();
      return;
    }

    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
})();
