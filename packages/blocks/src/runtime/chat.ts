import { createEnhancementScript } from "./create-script.js";

const implementation = String.raw`  function setupMessageScrollers() {
    for (const scroller of document.querySelectorAll(".message-scroller")) {
      if (!(scroller instanceof HTMLElement) || scroller.dataset.mdsMessageScroller === "true") {
        continue;
      }
      const viewport = scroller.querySelector(".message-scroller-viewport");
      const content = scroller.querySelector(".message-scroller-content");
      const button = scroller.querySelector(".message-scroller-button");
      if (!(viewport instanceof HTMLElement) || !(content instanceof HTMLElement) || !(button instanceof HTMLButtonElement)) {
        continue;
      }
      const followValue = scroller.getAttribute("data-attr-follow");
      const follow = followValue === null ? true : truthy(followValue);
      const height = scroller.getAttribute("data-attr-height");
      if (height !== null && /^\d+(?:\.\d+)?(?:px|rem|vh|dvh|%)$/.test(height)) {
        viewport.style.maxHeight = height;
      }
      scroller.dataset.mdsMessageScroller = "true";
      scroller.classList.add("is-enhanced");
      let atEnd = true;
      const update = () => {
        atEnd = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <= 32;
        button.hidden = atEnd;
        button.tabIndex = atEnd ? -1 : 0;
      };
      viewport.addEventListener("scroll", update, { passive: true });
      button.addEventListener("click", () => {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
      });
      const observer = new MutationObserver(() => {
        if (follow && atEnd) {
          viewport.scrollTop = viewport.scrollHeight;
        }
        update();
      });
      observer.observe(content, { childList: true, subtree: true, characterData: true });
      requestAnimationFrame(() => {
        if (follow) {
          viewport.scrollTop = viewport.scrollHeight;
        }
        update();
      });
    }
  }`;

export const chatEnhancementsScript = createEnhancementScript(["setupMessageScrollers"], implementation);
