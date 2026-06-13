export function findToggleTarget(control: HTMLElement): HTMLElement | undefined {
  const targetId = control.dataset.target;
  return targetId ? document.getElementById(targetId) ?? undefined : undefined;
}
