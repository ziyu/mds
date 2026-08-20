/* Canvas-only enhancements. Portable primitive behavior comes from @mds-crate/blocks. */

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupCanvasEnhancements, { once: true });
} else {
  setupCanvasEnhancements();
}

document.addEventListener("keydown", (event: KeyboardEvent) => {
  if (event.key !== "Escape") {
    return;
  }
  const lightbox = document.querySelector<HTMLElement>(".lightbox:not([hidden])");
  if (lightbox !== null) {
    closeLightbox(lightbox);
  }
});

function setupCanvasEnhancements(): void {
  setupCodeGroups();
  setupGalleryLightbox();
  setupVideos();
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
  lightbox.focus({ preventScroll: true });
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

function setupVideos(): void {
  for (const video of Array.from(document.querySelectorAll<HTMLVideoElement>("video"))) {
    video.setAttribute("playsinline", "");
    if (!video.hasAttribute("preload")) {
      video.preload = "metadata";
    }
  }
}
