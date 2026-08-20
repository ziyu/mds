const overlayTriggers = new WeakMap<HTMLElement, HTMLElement>();
const overlayBackgroundStates = new WeakMap<HTMLElement, Map<HTMLElement, boolean>>();

document.addEventListener("click", (event: MouseEvent) => {
  const target = getEventElement(event.target);
  if (target === null) {
    return;
  }

  const openOverlay = getOpenOverlay();
  if (openOverlay !== null && target === document.body) {
    setControlledVisibility(openOverlay, false);
    return;
  }

  const command = target.closest("[data-action]");
  if (command === null) {
    return;
  }

  const action = command.getAttribute("data-action") ?? "";
  const selector = command.getAttribute("data-target");
  const controlled =
    selector === null
      ? command.closest(".mds-block")?.querySelector<HTMLElement>("[data-toggle-target]")
      : document.getElementById(selector) ?? queryElement(selector);

  if (controlled === undefined || controlled === null) {
    command.setAttribute("data-action-missing", "true");
    return;
  }

  if (controlled.tagName === "DETAILS") {
    if (action === "open" || action === "show") {
      controlled.setAttribute("open", "");
    } else if (action === "close" || action === "hide") {
      controlled.removeAttribute("open");
    } else if (action === "toggle") {
      toggleAttribute(controlled, "open");
      togglePressedState(command);
    }
    return;
  }

  if (action === "open" || action === "show") {
    setControlledVisibility(controlled, true, command instanceof HTMLElement ? command : undefined);
  } else if (action === "close" || action === "hide") {
    setControlledVisibility(controlled, false);
  } else if (action === "toggle") {
    setControlledVisibility(controlled, controlled.hasAttribute("hidden"), command instanceof HTMLElement ? command : undefined);
    togglePressedState(command);
  }
}, { capture: true });

function togglePressedState(command: Element): void {
  if (!command.hasAttribute("aria-pressed")) {
    return;
  }

  command.setAttribute("aria-pressed", command.getAttribute("aria-pressed") === "true" ? "false" : "true");
}

function queryElement(selector: string): Element | null {
  try {
    return document.querySelector(selector);
  } catch {
    return null;
  }
}

function toggleAttribute(element: Element, name: string): void {
  if (element.hasAttribute(name)) {
    element.removeAttribute(name);
  } else {
    element.setAttribute(name, "");
  }
}

function getEventElement(target: EventTarget | null): Element | null {
  if (target instanceof Element) {
    return target;
  }

  if (target instanceof Text) {
    return target.parentElement;
  }

  return null;
}

document.addEventListener("keydown", (event: KeyboardEvent) => {
  if (event.key !== "Escape") {
    return;
  }

  const lightbox = document.querySelector<HTMLElement>(".lightbox:not([hidden])");
  if (lightbox !== null) {
    closeLightbox(lightbox);
    return;
  }

  const openOverlay = getOpenOverlay();
  if (openOverlay === null) {
    return;
  }

  setControlledVisibility(openOverlay, false);
});

document.addEventListener("submit", (event: SubmitEvent) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) {
    return;
  }

  event.preventDefault();
  if (!validateForm(form)) {
    return;
  }

  setFormStatus(form, "success", "Form captured locally.");
});

function setControlledVisibility(controlled: Element, visible: boolean, trigger?: HTMLElement): void {
  if (visible) {
    controlled.removeAttribute("hidden");
  } else {
    controlled.setAttribute("hidden", "");
  }

  if (!isOverlay(controlled) || !(controlled instanceof HTMLElement)) {
    return;
  }

  controlled.setAttribute("data-overlay-open", visible ? "true" : "false");
  controlled.setAttribute("aria-hidden", visible ? "false" : "true");

  if (visible) {
    if (trigger !== undefined) {
      overlayTriggers.set(controlled, getOverlayReturnTarget(trigger));
    }
    setOverlayBackgroundInert(controlled, true);
    document.body.classList.add("has-overlay");
    requestAnimationFrame(() => focusOverlay(controlled));
    return;
  }

  setOverlayBackgroundInert(controlled, false);
  updateOverlayLock();
  overlayTriggers.get(controlled)?.focus();
}

function isOverlay(element: Element): boolean {
  return element.classList.contains("mds-dialog") || element.classList.contains("mds-drawer");
}

function getOpenOverlay(): HTMLElement | null {
  return document.querySelector<HTMLElement>(".mds-dialog:not([hidden]), .mds-drawer:not([hidden])");
}

function setOverlayBackgroundInert(overlay: HTMLElement, inert: boolean): void {
  if (!inert) {
    const states = overlayBackgroundStates.get(overlay);
    if (states === undefined) {
      return;
    }
    for (const [element, wasInert] of states) {
      element.inert = wasInert;
    }
    overlayBackgroundStates.delete(overlay);
    return;
  }

  const states = new Map<HTMLElement, boolean>();
  let branch: HTMLElement = overlay;
  while (branch.parentElement !== null) {
    const parent = branch.parentElement;
    for (const sibling of Array.from(parent.children)) {
      if (!(sibling instanceof HTMLElement) || sibling === branch || states.has(sibling)) {
        continue;
      }
      states.set(sibling, sibling.inert);
      sibling.inert = true;
    }
    branch = parent;
    if (parent === document.body) {
      break;
    }
  }
  overlayBackgroundStates.set(overlay, states);
}

function focusOverlay(overlay: HTMLElement): void {
  const focusTarget = overlay.querySelector<HTMLElement>(
    "[autofocus], button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex='-1'])"
  );
  if (focusTarget !== null) {
    focusTarget.focus();
    return;
  }
  overlay.tabIndex = -1;
  overlay.focus();
}

function updateOverlayLock(): void {
  const hasOpenOverlay = document.querySelector(".mds-dialog:not([hidden]), .mds-drawer:not([hidden])") !== null;
  document.body.classList.toggle("has-overlay", hasOpenOverlay);
}

function getOverlayReturnTarget(trigger: HTMLElement): HTMLElement {
  const disclosure = trigger.closest<HTMLDetailsElement>("details");
  const summary = disclosure?.querySelector<HTMLElement>(":scope > summary");
  return summary ?? trigger;
}

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let motionObserver: IntersectionObserver | undefined;

function setupMotion(): void {
  const motionBlocks = getMotionBlocks();
  if (motionBlocks.length === 0) {
    return;
  }

  prepareMotion(motionBlocks);
  setupMotionReplay(motionBlocks);

  if (reduceMotion) {
    for (const element of motionBlocks) {
      enterMotion(element);
    }
    return;
  }

  scheduleMotionEnter(motionBlocks);
}

function setupMotionReplay(motionBlocks: HTMLElement[]): void {
  const replayBlocks = motionBlocks.filter((element) => element.dataset.motionOnce === "false");
  if (replayBlocks.length === 0) return;

  let frame: number | undefined;
  const update = (): void => {
    frame = undefined;
    for (const element of replayBlocks) {
      if (isElementInReplayViewport(element)) {
        enterMotion(element);
      } else {
        delete element.dataset.motionState;
      }
    }
  };
  const schedule = (): void => {
    if (frame !== undefined) return;
    frame = requestAnimationFrame(update);
  };

  window.addEventListener("scroll", schedule, { passive: true });
}

function getMotionBlocks(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>("[data-motion]")).filter(
    (element) => (element.dataset.motion ?? "").trim().length > 0
  );
}

function prepareMotion(motionBlocks: HTMLElement[]): void {
  document.documentElement.classList.add("motion-ready");

  for (const [index, element] of motionBlocks.entries()) {
    normalizeMotionBooleans(element);
    applyMotionTiming(element, index);
  }
}

function normalizeMotionBooleans(element: HTMLElement): void {
  if ((element.dataset.motionOnce ?? "").trim() === "" && element.dataset.attrOnce !== undefined) {
    element.dataset.motionOnce = element.dataset.attrOnce;
  }
}

function scheduleMotionEnter(motionBlocks: HTMLElement[]): void {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      motionObserver?.disconnect();
      motionObserver = createMotionObserver();

      for (const element of motionBlocks) {
        if (element.dataset.motionTrigger === "load" || isElementInViewport(element)) {
          enterMotion(element);
          if (element.dataset.motionOnce === "false") {
            motionObserver.observe(element);
          }
          continue;
        }
        motionObserver.observe(element);
      }
    });
  });
}

function createMotionObserver(): IntersectionObserver {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!(entry.target instanceof HTMLElement)) {
          continue;
        }
        if (!entry.isIntersecting) {
          if (entry.target.dataset.motionOnce === "false") {
            delete entry.target.dataset.motionState;
          }
          continue;
        }
        enterMotion(entry.target);
        if (entry.target.dataset.motionOnce !== "false") {
          observer.unobserve(entry.target);
        }
      }
    },
    {
      rootMargin: "-34% 0px -34% 0px",
      threshold: 0
    }
  );

  return observer;
}

function applyMotionTiming(element: HTMLElement, index: number): void {
  setMsVariable(element, "--motion-delay", element.dataset.motionDelay);
  setMsVariable(element, "--motion-duration", element.dataset.motionDuration);

  if (element.dataset.motionDelay === undefined) {
    element.style.setProperty("--motion-delay", `${Math.min(index * 48, 360)}ms`);
  }

  const stagger = parseNumber(element.dataset.motionStagger);
  if (stagger === undefined) {
    return;
  }

  const children = Array.from(element.children).filter((child): child is HTMLElement => child instanceof HTMLElement);
  children.forEach((child, index) => {
    child.style.setProperty("--motion-delay", `${stagger * index}ms`);
  });
}

function enterMotion(element: HTMLElement): void {
  element.dataset.motionState = "in";
}

function isElementInViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return rect.bottom >= 0 && rect.right >= 0 && rect.top <= window.innerHeight && rect.left <= window.innerWidth;
}

function isElementInReplayViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return rect.bottom >= window.innerHeight * 0.35 && rect.top <= window.innerHeight * 0.65;
}

function setMsVariable(element: HTMLElement, name: string, value: string | undefined): void {
  const parsed = parseNumber(value);
  if (parsed !== undefined) {
    element.style.setProperty(name, `${parsed}ms`);
  }
}

function parseNumber(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === "") {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupCanvasEnhancements, { once: true });
} else {
  setupCanvasEnhancements();
}

function setupCanvasEnhancements(): void {
  setupMotion();
  setupDetails();
  setupTabs();
  setupAccordions();
  setupCarousels();
  setupOverlays();
  setupCodeGroups();
  setupGalleryLightbox();
  setupForms();
  setupVideos();
}

function setupDetails(): void {
  for (const details of Array.from(document.querySelectorAll<HTMLDetailsElement>(".mds-details"))) {
    details.open = details.dataset.attrOpen === "true" || details.dataset.attrOpen === "";
  }
}

function setupTabs(): void {
  const roots = Array.from(document.querySelectorAll<HTMLElement>(".mds-tabs")).filter(
    (root) => root.dataset.enhanced !== "true"
  );

  roots.forEach((root, rootIndex) => {
    const panels = Array.from(root.querySelectorAll<HTMLElement>(":scope > .tabs-item"));
    if (panels.length === 0) {
      return;
    }

    root.dataset.enhanced = "true";
    const baseId = root.id || `canvas-tabs-${rootIndex + 1}`;
    const tablist = document.createElement("div");
    tablist.className = "canvas-tablist";
    tablist.setAttribute("role", "tablist");
    tablist.setAttribute("aria-label", root.dataset.attrLabel || "Sections");
    root.prepend(tablist);

    const tabs = panels.map((panel, index) => {
      const tab = document.createElement("button");
      const tabId = `${baseId}-tab-${index + 1}`;
      const panelId = panel.id || `${baseId}-panel-${index + 1}`;
      tab.id = tabId;
      tab.type = "button";
      tab.className = "canvas-tab";
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-controls", panelId);
      tab.textContent = panel.dataset.slot || `Tab ${index + 1}`;
      panel.id = panelId;
      panel.classList.add("canvas-tab-panel");
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", tabId);
      tab.addEventListener("click", () => selectTab(tabs, panels, index));
      tab.addEventListener("keydown", (event) => handleTabKeydown(event, tabs, panels, index));
      tablist.append(tab);
      return tab;
    });

    selectTab(tabs, panels, 0, false);
  });
}

function selectTab(tabs: HTMLButtonElement[], panels: HTMLElement[], selectedIndex: number, focus = true): void {
  tabs.forEach((tab, index) => {
    const selected = index === selectedIndex;
    tab.setAttribute("aria-selected", selected ? "true" : "false");
    tab.tabIndex = selected ? 0 : -1;
    panels[index]!.hidden = !selected;
  });
  if (focus) {
    tabs[selectedIndex]?.focus();
  }
}

function handleTabKeydown(
  event: KeyboardEvent,
  tabs: HTMLButtonElement[],
  panels: HTMLElement[],
  currentIndex: number
): void {
  let nextIndex: number | undefined;
  if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
  if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
  if (event.key === "Home") nextIndex = 0;
  if (event.key === "End") nextIndex = tabs.length - 1;
  if (nextIndex === undefined) return;
  event.preventDefault();
  selectTab(tabs, panels, nextIndex);
}

function setupAccordions(): void {
  const roots = Array.from(document.querySelectorAll<HTMLElement>(".mds-accordion")).filter(
    (root) => root.dataset.enhanced !== "true"
  );

  roots.forEach((root, rootIndex) => {
    const panels = Array.from(root.querySelectorAll<HTMLElement>(":scope > .accordion-item"));
    if (panels.length === 0) return;

    root.dataset.enhanced = "true";
    const baseId = root.id || `canvas-accordion-${rootIndex + 1}`;
    const triggers = panels.map((panel, index) => {
      const trigger = document.createElement("button");
      const triggerId = `${baseId}-trigger-${index + 1}`;
      const panelId = panel.id || `${baseId}-panel-${index + 1}`;
      trigger.id = triggerId;
      trigger.type = "button";
      trigger.className = "accordion-trigger";
      trigger.setAttribute("aria-controls", panelId);
      trigger.innerHTML = `<span>${panel.dataset.slot || `Section ${index + 1}`}</span><span aria-hidden="true">+</span>`;
      panel.id = panelId;
      panel.classList.add("accordion-panel");
      panel.setAttribute("role", "region");
      panel.setAttribute("aria-labelledby", triggerId);
      trigger.addEventListener("click", () => selectAccordion(triggers, panels, index));
      root.insertBefore(trigger, panel);
      return trigger;
    });

    selectAccordion(triggers, panels, 0, false);
  });
}

function selectAccordion(
  triggers: HTMLButtonElement[],
  panels: HTMLElement[],
  selectedIndex: number,
  focus = true
): void {
  triggers.forEach((trigger, index) => {
    const expanded = index === selectedIndex;
    trigger.setAttribute("aria-expanded", expanded ? "true" : "false");
    const marker = trigger.lastElementChild;
    if (marker !== null) marker.textContent = expanded ? "−" : "+";
    panels[index]!.hidden = !expanded;
  });
  if (focus) triggers[selectedIndex]?.focus();
}

function setupCarousels(): void {
  const roots = Array.from(document.querySelectorAll<HTMLElement>(".mds-carousel")).filter(
    (root) => root.dataset.enhanced !== "true"
  );

  for (const root of roots) {
    const track = root.querySelector<HTMLElement>(":scope > .carousel-track");
    const previous = root.querySelector<HTMLButtonElement>(":scope > .carousel-controls > .carousel-previous");
    const next = root.querySelector<HTMLButtonElement>(":scope > .carousel-controls > .carousel-next");
    const status = root.querySelector<HTMLElement>(":scope > .carousel-controls > .carousel-status");
    const items = Array.from(track?.children ?? []).filter((item): item is HTMLElement => item instanceof HTMLElement);
    if (track === null || previous === null || next === null || status === null || items.length === 0) continue;

    root.dataset.enhanced = "true";
    items.forEach((item) => item.classList.add("canvas-carousel-item"));
    let currentIndex = 0;
    const show = (index: number): void => {
      currentIndex = Math.min(Math.max(index, 0), items.length - 1);
      const currentItem = items[currentIndex]!;
      track.scrollTo({
        left: currentItem.offsetLeft - track.offsetLeft,
        behavior: reduceMotion ? "auto" : "smooth"
      });
      status.textContent = `${currentIndex + 1} / ${items.length}`;
      previous.disabled = currentIndex === 0;
      next.disabled = currentIndex === items.length - 1;
    };
    previous.addEventListener("click", () => show(currentIndex - 1));
    next.addEventListener("click", () => show(currentIndex + 1));
    show(0);
  }
}

function setupOverlays(): void {
  for (const overlay of Array.from(document.querySelectorAll<HTMLElement>(".mds-dialog, .mds-drawer"))) {
    // Promote modal surfaces out of page-local stacking contexts so their
    // z-index is compared directly with the body-level interaction shield.
    if (overlay.parentElement !== document.body) {
      document.body.append(overlay);
    }
    overlay.setAttribute("aria-hidden", overlay.hidden ? "true" : "false");
    if (!overlay.hidden) {
      setOverlayBackgroundInert(overlay, true);
    }
  }
  updateOverlayLock();
}

function setupCodeGroups(): void {
  const groups = Array.from(document.querySelectorAll<HTMLElement>(".code-group")).filter(
    (group) => group.dataset.enhanced !== "true"
  );

  for (const group of groups) {
    const panels = Array.from(group.querySelectorAll<HTMLElement>(":scope > .code-group-item"));
    if (panels.length < 2) {
      continue;
    }

    group.dataset.enhanced = "true";
    const tablist = document.createElement("div");
    tablist.className = "code-group-tabs";
    tablist.setAttribute("role", "tablist");
    group.prepend(tablist);

    panels.forEach((panel, index) => {
      const label = panel.dataset.slot ?? `Option ${index + 1}`;
      const tabId = `${group.id || `code-group-${index}`}-tab-${index}`;
      const panelId = panel.id || `${group.id || "code-group"}-panel-${index}`;
      panel.id = panelId;
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", tabId);
      panel.hidden = index !== 0;

      const button = document.createElement("button");
      button.id = tabId;
      button.className = "code-group-tab";
      button.type = "button";
      button.setAttribute("role", "tab");
      button.setAttribute("aria-controls", panelId);
      button.setAttribute("aria-selected", index === 0 ? "true" : "false");
      button.textContent = label;
      button.addEventListener("click", () => selectCodeGroupPanel(panels, tablist, index));
      tablist.append(button);
    });
  }
}

function selectCodeGroupPanel(panels: HTMLElement[], tablist: HTMLElement, selectedIndex: number): void {
  const tabs = Array.from(tablist.querySelectorAll<HTMLButtonElement>(".code-group-tab"));
  panels.forEach((panel, index) => {
    panel.hidden = index !== selectedIndex;
  });
  tabs.forEach((tab, index) => {
    tab.setAttribute("aria-selected", index === selectedIndex ? "true" : "false");
  });
}

function setupGalleryLightbox(): void {
  const galleries = Array.from(document.querySelectorAll<HTMLElement>(".gallery")).filter(
    (gallery) => gallery.dataset.enhanced !== "true"
  );

  for (const gallery of galleries) {
    const figures = Array.from(gallery.querySelectorAll<HTMLElement>(":scope > .figure"));
    if (figures.length === 0) {
      continue;
    }

    gallery.dataset.enhanced = "true";
    for (const figure of figures) {
      figure.tabIndex = 0;
      figure.setAttribute("role", "button");
      figure.setAttribute("aria-label", getFigureLabel(figure));
      figure.addEventListener("click", (event) => {
        if (event.target instanceof Element && event.target.closest("a, button, input, select, textarea, summary") !== null) {
          return;
        }
        openLightbox(figure);
      });
      figure.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }
        event.preventDefault();
        openLightbox(figure);
      });
    }
  }
}

function getFigureLabel(figure: HTMLElement): string {
  const caption = figure.querySelector(".figure-caption")?.textContent?.trim();
  return caption === undefined || caption.length === 0 ? "Open gallery item" : `Open ${caption}`;
}

function openLightbox(figure: HTMLElement): void {
  const lightbox = getOrCreateLightbox();
  const content = lightbox.querySelector<HTMLElement>(".lightbox-content");
  if (content === null) {
    return;
  }

  content.replaceChildren(figure.cloneNode(true));
  lightbox.hidden = false;
  lightbox.focus();
}

function closeLightbox(lightbox: HTMLElement): void {
  lightbox.hidden = true;
  lightbox.querySelector(".lightbox-content")?.replaceChildren();
}

function getOrCreateLightbox(): HTMLElement {
  const existing = document.querySelector<HTMLElement>(".lightbox");
  if (existing !== null) {
    return existing;
  }

  const lightbox = document.createElement("div");
  lightbox.className = "lightbox";
  lightbox.hidden = true;
  lightbox.tabIndex = -1;
  lightbox.setAttribute("role", "dialog");
  lightbox.setAttribute("aria-modal", "true");

  const close = document.createElement("button");
  close.className = "lightbox-close";
  close.type = "button";
  close.setAttribute("aria-label", "Close gallery preview");
  close.textContent = "×";
  close.addEventListener("click", () => closeLightbox(lightbox));

  const content = document.createElement("div");
  content.className = "lightbox-content";
  lightbox.append(close, content);
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) {
      closeLightbox(lightbox);
    }
  });
  document.body.append(lightbox);
  return lightbox;
}

function setupForms(): void {
  const forms = Array.from(document.querySelectorAll<HTMLFormElement>("form")).filter((form) => form.dataset.formEnhanced !== "true");
  for (const form of forms) {
    form.dataset.formEnhanced = "true";
    const shouldValidate = form.dataset.attrValidate === "true" || form.dataset.attrValidate === "";
    if (!shouldValidate) {
      continue;
    }

    form.addEventListener(
      "invalid",
      (event) => {
        const field = event.target;
        if (isFormControl(field)) {
          updateFieldValidity(field);
          setFormStatus(form, "error", "Please complete the highlighted fields.");
        }
      },
      true
    );

    for (const field of getFormControls(form)) {
      field.required = true;
      field.addEventListener("input", () => updateFieldValidity(field));
      field.addEventListener("change", () => updateFieldValidity(field));
    }
  }
}

function validateForm(form: HTMLFormElement): boolean {
  const shouldValidate = form.dataset.attrValidate === "true" || form.dataset.attrValidate === "";
  if (!shouldValidate) {
    return true;
  }

  let valid = true;
  for (const field of getFormControls(form)) {
    valid = updateFieldValidity(field) && valid;
  }

  if (!valid) {
    setFormStatus(form, "error", "Please complete the highlighted fields.");
  }

  return valid;
}

function getFormControls(form: HTMLFormElement): Array<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> {
  return Array.from(form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("input, select, textarea")).filter(
    (field) => field.type !== "hidden" && field.type !== "submit" && field.type !== "reset" && !field.disabled
  );
}

function isFormControl(value: EventTarget | null): value is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement {
  return value instanceof HTMLInputElement || value instanceof HTMLSelectElement || value instanceof HTMLTextAreaElement;
}

function setFormStatus(form: HTMLFormElement, state: "error" | "success", text: string): void {
  let status = form.querySelector<HTMLElement>(".form-status");
  if (status === null) {
    status = document.createElement("p");
    status.className = "form-status";
    status.setAttribute("role", "status");
    form.append(status);
  }
  status.dataset.state = state;
  status.textContent = text;
}

function updateFieldValidity(field: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): boolean {
  const wrapper = field.closest<HTMLElement>(".form-field");
  const valid = field.validity.valid;
  if (wrapper === null) {
    return valid;
  }

  wrapper.dataset.invalid = valid ? "false" : "true";
  let message = wrapper.querySelector<HTMLElement>(".field-error");
  if (valid) {
    message?.remove();
    return true;
  }

  if (message === null) {
    message = document.createElement("span");
    message.className = "field-error";
    wrapper.append(message);
  }
  message.textContent = field.validationMessage || "This field is required.";
  return false;
}

function setupVideos(): void {
  for (const video of Array.from(document.querySelectorAll<HTMLVideoElement>("video"))) {
    video.setAttribute("playsinline", "");
    if (!video.hasAttribute("preload")) {
      video.preload = "metadata";
    }
  }
}
