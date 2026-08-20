import { createEnhancementScript } from "./create-script.js";

const implementation = String.raw`  const supportedMotionTriggers = new Set(["load", "view", "hover", "state"]);
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let motionObserver = null;

  function setupMotion() {
    const elements = Array.from(document.querySelectorAll(
      "[data-mds-role='motion'], [data-mds-role='reveal'], [data-mds-role='scene'], [data-attr-motion], [data-motion]"
    )).filter((element) =>
      element instanceof HTMLElement && element.dataset.mdsMotion !== "true" &&
      (["motion", "reveal", "scene"].includes(element.dataset.mdsRole || "") ||
        (element.getAttribute("data-motion") || "").trim() !== "" || element.hasAttribute("data-attr-motion"))
    );
    if (elements.length === 0) {
      return;
    }

    document.documentElement.classList.add("motion-ready");
    motionObserver = "IntersectionObserver" in window && !prefersReducedMotion
      ? new IntersectionObserver(handleMotionIntersections, { rootMargin: "0px 0px -10%", threshold: 0.12 })
      : null;

    elements.forEach((element) => {
      element.dataset.mdsMotion = "true";
      const role = element.dataset.mdsRole || "";
      const fallbackPreset = role === "reveal" || element.classList.contains("reveal")
        ? "reveal"
        : role === "scene" || element.classList.contains("scene")
          ? "scene"
          : "fade-up";
      const preset = readMotionValue(element, "preset") || readMotionValue(element, "motion") || fallbackPreset;
      const triggerValue = readMotionValue(element, "trigger");
      const trigger = supportedMotionTriggers.has(triggerValue) ? triggerValue : "view";
      const delay = readMotionTime(element, "delay", 0, 0, 4000);
      const duration = readMotionTime(element, "duration", role === "scene" ? 880 : role === "reveal" ? 720 : 640, 120, 4000);
      const stagger = readMotionTime(element, "stagger", 0, 0, 1000);
      const once = readMotionBoolean(element, "once", true);

      element.dataset.motion = preset;
      element.dataset.motionPreset = preset;
      element.dataset.motionTrigger = trigger;
      element.dataset.motionDelay = String(delay);
      element.dataset.motionDuration = String(duration);
      element.dataset.motionOnce = once ? "true" : "false";
      element.dataset.motionReady = "true";
      element.style.setProperty("--motion-delay", delay + "ms");
      element.style.setProperty("--motion-duration", duration + "ms");

      if (stagger > 0 && element.children.length > 1) {
        element.classList.add("has-stagger");
        element.dataset.motionStagger = String(stagger);
        Array.from(element.children).forEach((child, index) => {
          if (!(child instanceof HTMLElement)) {
            return;
          }
          child.classList.add("motion-item");
          child.style.setProperty("--motion-item-delay", delay + index * stagger + "ms");
          child.style.setProperty("--motion-delay", delay + index * stagger + "ms");
        });
      }

      if (prefersReducedMotion || motionObserver === null) {
        enterMotion(element);
      } else if (trigger === "load") {
        requestAnimationFrame(() => requestAnimationFrame(() => enterMotion(element)));
      } else if (trigger === "hover") {
        element.classList.add("is-motion-hover");
        enterMotion(element);
      } else if (trigger === "view") {
        motionObserver.observe(element);
      }
    });

    const replayElements = elements.filter((element) => element.dataset.motionOnce === "false");
    if (replayElements.length > 0) {
      let replayFrame = 0;
      const updateReplayState = () => {
        replayFrame = 0;
        for (const element of replayElements) {
          const rect = element.getBoundingClientRect();
          if (rect.bottom < 0 || rect.top > window.innerHeight) {
            leaveMotion(element);
          }
        }
      };
      window.addEventListener("scroll", () => {
        if (replayFrame === 0) {
          replayFrame = requestAnimationFrame(updateReplayState);
        }
      }, { passive: true });
    }

    requestAnimationFrame(() => requestAnimationFrame(() => {
      for (const element of elements) {
        if (element.dataset.motionTrigger !== "view" || element.dataset.motionState === "in") {
          continue;
        }
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) {
          continue;
        }
        if (rect.bottom >= 0 && rect.right >= 0 && rect.top <= window.innerHeight && rect.left <= window.innerWidth) {
          enterMotion(element);
          if (element.dataset.motionOnce !== "false") {
            motionObserver?.unobserve(element);
          }
        }
      }
    }));
  }

  function handleMotionIntersections(entries) {
    for (const entry of entries) {
      if (!(entry.target instanceof HTMLElement)) {
        continue;
      }
      if (entry.isIntersecting) {
        enterMotion(entry.target);
        if (entry.target.dataset.motionOnce !== "false") {
          motionObserver?.unobserve(entry.target);
        }
      } else if (entry.target.dataset.motionOnce === "false") {
        leaveMotion(entry.target);
      }
    }
  }

  function enterMotion(element) {
    element.dataset.mdsState = "visible";
    element.dataset.motionState = "in";
    element.classList.add("is-visible");
  }

  function leaveMotion(element) {
    element.dataset.mdsState = "hidden";
    delete element.dataset.motionState;
    element.classList.remove("is-visible");
  }

  function readMotionValue(element, name) {
    const runtimeValue = name === "motion"
      ? element.getAttribute("data-motion")
      : element.getAttribute("data-motion-" + name);
    return (runtimeValue || element.getAttribute("data-attr-" + name) || "").trim().toLowerCase();
  }

  function readMotionTime(element, name, fallback, minimum, maximum) {
    const value = Number.parseFloat(readMotionValue(element, name));
    return Number.isFinite(value) ? Math.min(maximum, Math.max(minimum, value)) : fallback;
  }

  function readMotionBoolean(element, name, fallback) {
    const value = readMotionValue(element, name);
    return value === "" ? fallback : truthy(value);
  }`;

export const motionEnhancementsScript = createEnhancementScript(["setupMotion"], implementation);
