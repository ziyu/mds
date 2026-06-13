import { findToggleTarget } from "./lib/actions";

document.addEventListener("click", (event: MouseEvent) => {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }

  const control = target.closest("[data-action='toggle']");
  if (!(control instanceof HTMLElement)) {
    return;
  }

  findToggleTarget(control)?.classList.toggle("is-open");
});
