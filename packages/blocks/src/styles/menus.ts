export const menuStyles = String.raw`:where(.context-menu) {
  position: relative;
  width: fit-content;
}

:where(.context-menu-trigger) {
  cursor: context-menu;
  user-select: none;
}

:where(.context-menu-content) {
  min-width: 13rem;
  margin-top: 0.45rem;
  border: 1px solid var(--mds-block-line);
  border-radius: var(--mds-block-radius);
  background: var(--mds-block-surface);
  padding: 0.35rem;
  box-shadow: var(--mds-block-shadow);
}

:where(.context-menu.is-context-open > .context-menu-content) {
  position: fixed;
  z-index: 100;
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
  width: auto;
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
