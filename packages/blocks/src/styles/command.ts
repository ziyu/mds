export const commandStyles = String.raw`:where(.command) {
  display: grid;
  gap: 0.75rem;
  width: min(100%, 36rem);
  border: 1px solid var(--mds-block-line);
  border-radius: var(--mds-block-radius);
  background: var(--mds-block-surface);
  padding: 0.75rem;
  box-shadow: var(--mds-block-shadow);
}

:where(.command-search) {
  display: grid;
  gap: 0.4rem;
}

:where(.command-input) {
  width: 100%;
}

:where(.command-empty) {
  margin: 0;
  padding: 1rem;
  color: var(--mds-block-muted);
  text-align: center;
}

:where(.command [hidden]) {
  display: none !important;
}`;
