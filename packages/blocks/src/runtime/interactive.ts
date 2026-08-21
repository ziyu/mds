import { createEnhancementScript } from "./create-script.js";

const implementation = String.raw`  const builtInActions = new Set(["open", "close", "show", "hide", "toggle"]);
  const overlaySelector = "[data-mds-role='dialog'], [data-mds-role='drawer']";
  const openOverlaySelector = "[data-mds-role='dialog']:not([hidden]), [data-mds-role='drawer']:not([hidden])";
  const focusableSelector = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex='-1'])"
  ].join(",");
  const overlayTriggers = new WeakMap();
  const overlayBackgroundStates = new WeakMap();
  let activeOverlay = null;
  let runtimeId = 0;

  function nextId(prefix) {
    runtimeId += 1;
    return "mds-" + prefix + "-" + runtimeId;
  }

  function directSlotChildren(container, legacyClass) {
    return Array.from(container.children).filter((child) =>
      child instanceof HTMLElement && (child.hasAttribute("data-slot") || child.classList.contains(legacyClass))
    );
  }

  function setupNativeDetails() {
    for (const details of document.querySelectorAll("details[data-mds-role='details']")) {
      if (!(details instanceof HTMLDetailsElement) || details.dataset.mdsDetails === "true") {
        continue;
      }
      details.dataset.mdsDetails = "true";
      if (details.hasAttribute("data-attr-open")) {
        const value = details.getAttribute("data-attr-open");
        details.open = value === "" || truthy(value);
      }
    }
  }

  function setupTabs() {
    for (const root of document.querySelectorAll("[data-mds-role='tabs']")) {
      if (!(root instanceof HTMLElement) || root.dataset.mdsTabs === "true") {
        continue;
      }
      const panelsContainer = root.querySelector(":scope > [data-mds-role='tabs-panels']") || root;
      if (!(panelsContainer instanceof HTMLElement)) {
        continue;
      }
      const panels = directSlotChildren(panelsContainer, "tabs-item");
      if (panels.length === 0) {
        continue;
      }

      root.dataset.mdsTabs = "true";
      root.dataset.mdsState = "ready";
      const tablist = document.createElement("div");
      tablist.className = "mds-tabs-list";
      tablist.dataset.mdsRole = "tab-list";
      tablist.setAttribute("role", "tablist");
      tablist.setAttribute("aria-label", root.getAttribute("data-attr-label") || "Sections");
      if (panelsContainer === root) {
        root.insertBefore(tablist, panels[0] || root.firstChild);
      } else {
        panelsContainer.before(tablist);
      }

      const tabs = panels.map((panel, index) => {
        const tab = document.createElement("button");
        const tabId = nextId("tab");
        const panelId = panel.id || nextId("tab-panel");
        panel.id = panelId;
        panel.classList.add("mds-tab-panel");
        panel.dataset.mdsRole = "tab-panel";
        panel.setAttribute("role", "tabpanel");
        panel.setAttribute("aria-labelledby", tabId);
        panel.tabIndex = 0;

        tab.id = tabId;
        tab.type = "button";
        tab.className = "mds-tab";
        tab.dataset.mdsRole = "tab";
        tab.textContent = panel.getAttribute("data-slot") || "Tab " + (index + 1);
        tab.setAttribute("role", "tab");
        tab.setAttribute("aria-controls", panelId);
        tab.addEventListener("click", () => activateTab(tabs, panels, index, false));
        tab.addEventListener("keydown", (event) => navigateTabs(event, tabs, panels, index));
        tablist.append(tab);
        return tab;
      });

      activateTab(tabs, panels, 0, false);
    }
  }

  function activateTab(tabs, panels, selectedIndex, moveFocus) {
    tabs.forEach((tab, index) => {
      const selected = index === selectedIndex;
      tab.setAttribute("aria-selected", selected ? "true" : "false");
      tab.tabIndex = selected ? 0 : -1;
      tab.dataset.mdsState = selected ? "active" : "inactive";
      const panel = panels[index];
      panel.hidden = !selected;
      panel.classList.toggle("is-active", selected);
      panel.dataset.mdsState = selected ? "active" : "inactive";
    });
    if (moveFocus) {
      tabs[selectedIndex].focus({ preventScroll: true });
    }
  }

  function navigateTabs(event, tabs, panels, currentIndex) {
    let nextIndex;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = tabs.length - 1;
    } else {
      return;
    }
    event.preventDefault();
    activateTab(tabs, panels, nextIndex, true);
  }

  function setupAccordions() {
    for (const root of document.querySelectorAll("[data-mds-role='accordion']")) {
      if (!(root instanceof HTMLElement) || root.dataset.mdsAccordion === "true") {
        continue;
      }
      const panelsContainer = root.querySelector(":scope > [data-mds-role='accordion-panels']") || root;
      if (!(panelsContainer instanceof HTMLElement)) {
        continue;
      }
      const panels = directSlotChildren(panelsContainer, "accordion-item");
      if (panels.length === 0) {
        continue;
      }

      root.dataset.mdsAccordion = "true";
      root.dataset.mdsState = "ready";
      const triggers = panels.map((panel, index) => {
        const trigger = document.createElement("button");
        const triggerId = nextId("accordion-trigger");
        const panelId = panel.id || nextId("accordion-panel");
        panel.id = panelId;
        panel.classList.add("mds-accordion-panel");
        panel.dataset.mdsRole = "accordion-panel";
        panel.setAttribute("role", "region");
        panel.setAttribute("aria-labelledby", triggerId);

        trigger.id = triggerId;
        trigger.type = "button";
        trigger.className = "mds-accordion-trigger";
        trigger.dataset.mdsRole = "accordion-trigger";
        trigger.setAttribute("aria-controls", panelId);
        const label = document.createElement("span");
        label.textContent = panel.getAttribute("data-slot") || "Section " + (index + 1);
        const marker = document.createElement("span");
        marker.dataset.mdsRole = "accordion-marker";
        marker.setAttribute("aria-hidden", "true");
        trigger.append(label, marker);
        trigger.addEventListener("click", () => {
          const expand = trigger.getAttribute("aria-expanded") !== "true";
          setAccordionState(triggers, panels, expand ? index : -1, false);
        });
        trigger.addEventListener("keydown", (event) => navigateAccordion(event, triggers, index));
        panel.before(trigger);
        return trigger;
      });

      setAccordionState(triggers, panels, 0, false);
    }
  }

  function setAccordionState(triggers, panels, selectedIndex, moveFocus) {
    triggers.forEach((trigger, index) => {
      const expanded = index === selectedIndex;
      trigger.setAttribute("aria-expanded", expanded ? "true" : "false");
      trigger.dataset.mdsState = expanded ? "open" : "closed";
      const marker = trigger.querySelector("[data-mds-role='accordion-marker']");
      if (marker) {
        marker.textContent = expanded ? "−" : "+";
      }
      const panel = panels[index];
      panel.hidden = !expanded;
      panel.classList.toggle("is-open", expanded);
      panel.dataset.mdsState = expanded ? "open" : "closed";
    });
    if (moveFocus && selectedIndex >= 0) {
      triggers[selectedIndex].focus({ preventScroll: true });
    }
  }

  function navigateAccordion(event, triggers, currentIndex) {
    let nextIndex;
    if (event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % triggers.length;
    } else if (event.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + triggers.length) % triggers.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = triggers.length - 1;
    } else {
      return;
    }
    event.preventDefault();
    triggers[nextIndex].focus({ preventScroll: true });
  }

  function setupCarousels() {
    for (const root of document.querySelectorAll("[data-mds-role='carousel']")) {
      if (!(root instanceof HTMLElement) || root.dataset.mdsCarousel === "true") {
        continue;
      }
      const track = root.querySelector(":scope > [data-mds-role='carousel-track']");
      const previous = root.querySelector("[data-mds-role='carousel-previous']");
      const next = root.querySelector("[data-mds-role='carousel-next']");
      const status = root.querySelector("[data-mds-role='carousel-status']");
      if (!(track instanceof HTMLElement) || !(previous instanceof HTMLButtonElement) ||
          !(next instanceof HTMLButtonElement) || !(status instanceof HTMLElement)) {
        continue;
      }
      const items = Array.from(track.children).filter((item) => item instanceof HTMLElement);
      if (items.length === 0) {
        previous.hidden = true;
        next.hidden = true;
        status.hidden = true;
        continue;
      }

      root.dataset.mdsCarousel = "true";
      root.dataset.mdsState = "ready";
      items.forEach((item, index) => {
        item.dataset.mdsRole = "carousel-item";
        item.setAttribute("aria-label", (index + 1) + " of " + items.length);
      });
      let currentIndex = 0;
      const update = (index, scroll) => {
        currentIndex = Math.min(Math.max(index, 0), items.length - 1);
        status.textContent = (currentIndex + 1) + " / " + items.length;
        previous.disabled = currentIndex === 0;
        next.disabled = currentIndex === items.length - 1;
        root.dataset.mdsIndex = String(currentIndex);
        items.forEach((item, itemIndex) => {
          item.dataset.mdsState = itemIndex === currentIndex ? "active" : "inactive";
        });
        if (!scroll) {
          return;
        }
        const current = items[currentIndex];
        const left = current.offsetLeft - track.offsetLeft;
        if (typeof track.scrollTo === "function") {
          track.scrollTo({
            left,
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
          });
        } else {
          track.scrollLeft = left;
        }
      };
      previous.addEventListener("click", () => update(currentIndex - 1, true));
      next.addEventListener("click", () => update(currentIndex + 1, true));
      root.addEventListener("keydown", (event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          update(currentIndex + (event.key === "ArrowRight" ? 1 : -1), true);
        }
      });
      update(0, false);
    }
  }

  function setupOverlays() {
    for (const overlay of document.querySelectorAll(overlaySelector)) {
      if (!(overlay instanceof HTMLElement) || overlay.dataset.mdsOverlay === "true") {
        continue;
      }
      overlay.dataset.mdsOverlay = "true";
      if (overlay.parentElement !== document.body) {
        document.body.append(overlay);
      }
      const open = !overlay.hidden && overlay.getAttribute("aria-hidden") !== "true";
      setOverlayAttributes(overlay, open);
      if (open) {
        setOverlayBackgroundInert(overlay, true);
        activeOverlay = overlay;
      }
    }
    updateOverlayLock();

    if (document.documentElement.dataset.mdsActionRuntime === "true") {
      return;
    }
    document.documentElement.dataset.mdsActionRuntime = "true";
    document.addEventListener("click", handleActionClick);
    document.addEventListener("keydown", handleOverlayKeydown);
  }

  function handleActionClick(event) {
    const eventElement = event.target instanceof Element
      ? event.target
      : event.target instanceof Text
        ? event.target.parentElement
        : null;
    if (!(eventElement instanceof Element)) {
      return;
    }

    const closeControl = eventElement.closest("[data-mds-overlay-close], [data-overlay-close]");
    if (closeControl) {
      const overlay = closeControl.closest(overlaySelector);
      if (overlay instanceof HTMLElement) {
        event.preventDefault();
        closeOverlay(overlay);
      }
      return;
    }

    const control = eventElement.closest("[data-action]");
    if (!(control instanceof HTMLElement)) {
      return;
    }
    const action = control.dataset.action || "";
    if (!builtInActions.has(action)) {
      return;
    }
    const target = resolveActionTarget(control);
    if (!(target instanceof HTMLElement)) {
      control.dataset.mdsActionMissing = "true";
      return;
    }

    event.preventDefault();
    delete control.dataset.mdsActionMissing;
    const open = action === "toggle" ? !isTargetOpen(target) : action === "open" || action === "show";
    setTargetState(target, open, control);
  }

  function resolveActionTarget(control) {
    const targetName = control.dataset.target;
    if (!targetName) {
      return null;
    }
    const byId = document.getElementById(targetName);
    if (byId) {
      return byId;
    }
    try {
      return document.querySelector(targetName);
    } catch {
      return null;
    }
  }

  function isTargetOpen(target) {
    if (target instanceof HTMLDetailsElement) {
      return target.open;
    }
    return !target.hidden;
  }

  function setTargetState(target, open, trigger) {
    if (target.matches(overlaySelector)) {
      if (open) {
        openOverlay(target, trigger);
      } else {
        closeOverlay(target);
      }
    } else if (target instanceof HTMLDetailsElement) {
      target.open = open;
      target.classList.toggle("is-open", open);
      target.dataset.mdsState = open ? "open" : "closed";
    } else {
      target.hidden = !open;
      target.classList.toggle("is-open", open);
      target.dataset.mdsState = open ? "open" : "closed";
      target.setAttribute("aria-hidden", open ? "false" : "true");
    }
    syncTargetControls(target, open);
  }

  function syncTargetControls(target, open) {
    if (!target.id) {
      return;
    }
    for (const control of document.querySelectorAll("[data-target]")) {
      if (!(control instanceof HTMLElement) || control.dataset.target !== target.id) {
        continue;
      }
      control.setAttribute("aria-controls", target.id);
      if (control.hasAttribute("aria-pressed")) {
        control.setAttribute("aria-pressed", open ? "true" : "false");
      }
      if (control.hasAttribute("aria-expanded") || target instanceof HTMLDetailsElement || target.matches(overlaySelector)) {
        control.setAttribute("aria-expanded", open ? "true" : "false");
      }
    }
  }

  function openOverlay(overlay, trigger) {
    if (activeOverlay && activeOverlay !== overlay) {
      closeOverlay(activeOverlay, false);
    }
    if (overlay.parentElement !== document.body) {
      document.body.append(overlay);
    }
    if (trigger instanceof HTMLElement) {
      const disclosure = trigger.closest("details");
      overlayTriggers.set(overlay, disclosure?.querySelector(":scope > summary") || trigger);
    }
    activeOverlay = overlay;
    setOverlayAttributes(overlay, true);
    setOverlayBackgroundInert(overlay, true);
    updateOverlayLock();
    requestAnimationFrame(() => focusOverlay(overlay));
  }

  function closeOverlay(overlay, restoreFocus = true) {
    setOverlayAttributes(overlay, false);
    setOverlayBackgroundInert(overlay, false);
    if (activeOverlay === overlay) {
      activeOverlay = null;
    }
    updateOverlayLock();
    syncTargetControls(overlay, false);
    const returnTarget = overlayTriggers.get(overlay);
    if (restoreFocus && returnTarget instanceof HTMLElement && returnTarget.isConnected) {
      returnTarget.focus({ preventScroll: true });
    }
  }

  function setOverlayAttributes(overlay, open) {
    overlay.hidden = !open;
    overlay.classList.toggle("is-open", open);
    overlay.dataset.mdsState = open ? "open" : "closed";
    overlay.dataset.overlayOpen = open ? "true" : "false";
    overlay.setAttribute("aria-hidden", open ? "false" : "true");
  }

  function setOverlayBackgroundInert(overlay, inert) {
    if (!inert) {
      const states = overlayBackgroundStates.get(overlay);
      if (!states) {
        return;
      }
      for (const [element, wasInert] of states) {
        element.inert = wasInert;
      }
      overlayBackgroundStates.delete(overlay);
      return;
    }
    const states = new Map();
    for (const sibling of Array.from(document.body.children)) {
      if (!(sibling instanceof HTMLElement) || sibling === overlay) {
        continue;
      }
      states.set(sibling, sibling.inert);
      sibling.inert = true;
    }
    overlayBackgroundStates.set(overlay, states);
  }

  function focusOverlay(overlay) {
    if (overlay.hidden) {
      return;
    }
    const panel = overlay.querySelector("[data-mds-role='overlay-panel'], .dialog-panel, .drawer-panel") || overlay;
    const focusTarget = panel.querySelector("[autofocus], " + focusableSelector);
    if (focusTarget instanceof HTMLElement) {
      focusTarget.focus({ preventScroll: true });
    } else if (panel instanceof HTMLElement) {
      panel.tabIndex = -1;
      panel.focus({ preventScroll: true });
    }
  }

  function updateOverlayLock() {
    const hasOpenOverlay = document.querySelector(openOverlaySelector) !== null;
    document.body.classList.toggle("has-overlay", hasOpenOverlay);
  }

  function handleOverlayKeydown(event) {
    if (!(activeOverlay instanceof HTMLElement) || activeOverlay.hidden) {
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      closeOverlay(activeOverlay);
    } else if (event.key === "Tab") {
      trapOverlayFocus(event, activeOverlay);
    }
  }

  function trapOverlayFocus(event, overlay) {
    const focusable = Array.from(overlay.querySelectorAll(focusableSelector)).filter((item) =>
      item instanceof HTMLElement && !item.hidden && item.getAttribute("aria-hidden") !== "true" &&
      item.offsetParent !== null && !item.matches("[data-mds-role='overlay-backdrop'], [data-overlay-close][tabindex='-1']")
    );
    if (focusable.length === 0) {
      event.preventDefault();
      focusOverlay(overlay);
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus({ preventScroll: true });
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    }
  }`;

export const interactiveEnhancementsScript = createEnhancementScript(
  ["setupNativeDetails", "setupTabs", "setupAccordions", "setupCarousels", "setupOverlays"],
  implementation
);
