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
