document.addEventListener("click", (event: MouseEvent) => {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }

  const command = target.closest("[data-action]");
  if (!(command instanceof HTMLElement)) {
    return;
  }

  const action = command.dataset.action;
  const selector = command.dataset.target;
  const controlled =
    selector === undefined
      ? command.closest(".mds-block")?.querySelector<HTMLElement>("[data-toggle-target]")
      : document.getElementById(selector) ?? document.querySelector<HTMLElement>(selector);

  if (controlled === undefined || controlled === null) {
    command.setAttribute("data-action-missing", "true");
    return;
  }

  if (controlled instanceof HTMLDetailsElement) {
    if (action === "open" || action === "show") {
      controlled.open = true;
    } else if (action === "close" || action === "hide") {
      controlled.open = false;
    } else if (action === "toggle") {
      controlled.open = !controlled.open;
    }
    return;
  }

  if (action === "open" || action === "show") {
    controlled.hidden = false;
  } else if (action === "close" || action === "hide") {
    controlled.hidden = true;
  } else if (action === "toggle") {
    controlled.hidden = !controlled.hidden;
  }
});

document.addEventListener("submit", (event: SubmitEvent) => {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) {
    return;
  }

  event.preventDefault();
  let status = form.querySelector<HTMLElement>(".form-status");
  if (status === null) {
    status = document.createElement("p");
    status.className = "form-status";
    status.setAttribute("role", "status");
    form.append(status);
  }

  status.textContent = "Form captured locally.";
});

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let motionObserver: IntersectionObserver | undefined;

function setupMotion(): void {
  const motionBlocks = getMotionBlocks();
  if (motionBlocks.length === 0) {
    return;
  }

  prepareMotion(motionBlocks);

  if (reduceMotion) {
    for (const element of motionBlocks) {
      enterMotion(element);
    }
    return;
  }

  scheduleMotionEnter(motionBlocks);
}

function getMotionBlocks(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>("[data-motion]")).filter(
    (element) => (element.dataset.motion ?? "").trim().length > 0
  );
}

function prepareMotion(motionBlocks: HTMLElement[]): void {
  document.documentElement.classList.add("motion-ready");

  for (const [index, element] of motionBlocks.entries()) {
    applyMotionTiming(element, index);
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
        if (!entry.isIntersecting || !(entry.target instanceof HTMLElement)) {
          continue;
        }
        enterMotion(entry.target);
        if (entry.target.dataset.motionOnce !== "false") {
          observer.unobserve(entry.target);
        }
      }
    },
    {
      rootMargin: "0px 0px -12% 0px",
      threshold: 0.12
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
  document.addEventListener("DOMContentLoaded", setupMotion, { once: true });
} else {
  setupMotion();
}
