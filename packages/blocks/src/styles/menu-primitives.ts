export const menuPrimitiveStyles = String.raw`:where(.menu-list) {
  display: grid;
  gap: 0.18rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

:where(.menu-group-label) {
  display: block;
  padding: 0.5rem 0.65rem 0.3rem;
  color: var(--mds-block-muted, currentColor);
  font-size: 0.78rem;
}

:where(.menu-item-control) {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
  border: 1px solid transparent;
  border-radius: calc(var(--mds-block-radius, 0.75rem) * 0.72);
  background: transparent;
  color: inherit;
  padding: 0.48rem 0.65rem;
  text-align: start;
  cursor: pointer;
}

:where(.menu-item-control:hover, .menu-item-control:focus-visible) {
  background: var(--mds-block-accent-soft, color-mix(in srgb, currentColor, transparent 92%));
}

:where(.menu-item-label) {
  min-width: 0;
  flex: 1;
}

:where(.menu-item-shortcut) {
  margin-inline-start: auto;
  color: var(--mds-block-muted, currentColor);
  font-size: 0.75em;
}

:where(.menu-item-shortcut:empty) {
  display: none;
}

:where(.menu-separator) {
  margin: 0.3rem 0;
  border-top: 1px solid var(--mds-block-line, color-mix(in srgb, currentColor, transparent 78%));
}`;
