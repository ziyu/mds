export const menuStyles = String.raw`:where(.dropdown-menu, .context-menu) {
  position: relative;
  width: fit-content;
}

:where(.context-menu-trigger) {
  cursor: context-menu;
  user-select: none;
}

:where(.dropdown-menu-content, .context-menu-content) {
  position: absolute;
  z-index: 100;
  top: calc(100% + 0.4rem);
  left: 0;
  overflow: auto;
  width: max-content;
  min-width: max(100%, 13rem);
  max-width: min(22rem, calc(100vw - 1rem));
  max-height: min(24rem, var(--mds-menu-available-height, calc(100vh - 1rem)));
  margin: 0;
  border: 1px solid var(--mds-block-line);
  border-radius: var(--mds-block-radius);
  background: var(--mds-block-surface);
  padding: 0.35rem;
  box-shadow: var(--mds-block-shadow);
}

:where(.dropdown-menu.is-menu-align-end > .dropdown-menu-content, .context-menu.is-menu-align-end > .context-menu-content) {
  right: 0;
  left: auto;
}

:where(.dropdown-menu.is-menu-drop-up > .dropdown-menu-content, .context-menu.is-menu-drop-up > .context-menu-content) {
  top: auto;
  bottom: calc(100% + 0.4rem);
}

:where(.context-menu.is-context-open > .context-menu-content) {
  position: fixed;
  z-index: 100;
  top: 0;
  right: auto;
  bottom: auto;
  left: 0;
  margin: 0;
}

:where(.menubar) {
  width: fit-content;
  max-width: 100%;
  border: 1px solid var(--mds-block-line);
  border-radius: var(--mds-block-radius);
  background: var(--mds-block-surface);
  padding: 0.25rem;
  box-shadow: var(--mds-block-shadow);
}

:where(.menubar-list) {
  display: flex;
  flex-wrap: wrap;
  gap: 0.1rem;
  align-items: center;
}

:where(.menubar .dropdown-menu) {
  width: fit-content;
}

:where(.menubar .dropdown-menu > summary) {
  border-radius: calc(var(--mds-block-radius) * 0.65);
  padding: 0.42rem 0.68rem;
  list-style: none;
}

:where(.menubar .dropdown-menu > summary::-webkit-details-marker) {
  display: none;
}

:where(.menubar .dropdown-menu[open] > summary, .menubar .dropdown-menu > summary:hover) {
  background: var(--mds-block-accent-soft);
  color: var(--mds-block-accent);
}`;
