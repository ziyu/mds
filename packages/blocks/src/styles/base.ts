const blockBaseDeclarations = String.raw`  --mds-block-accent: var(--accent, var(--color-primary, #316b5f));
  --mds-block-accent-ink: var(--accent-strong, var(--color-primary-foreground, #ffffff));
  --mds-block-accent-soft: var(--accent-soft, color-mix(in srgb, var(--mds-block-accent), transparent 86%));
  --mds-block-surface: var(--surface, var(--paper, var(--color-card, Canvas)));
  --mds-block-soft: var(--soft, var(--color-muted, color-mix(in srgb, currentColor, transparent 96%)));
  --mds-block-line: var(--line, var(--color-border, color-mix(in srgb, currentColor, transparent 78%)));
  --mds-block-muted: var(--muted, var(--ink-soft, var(--color-muted-foreground, color-mix(in srgb, currentColor, transparent 38%))));
  --mds-block-danger: var(--red, var(--warn, #b42318));
  --mds-block-radius: var(--radius, var(--radius-xl, 0.75rem));
  --mds-block-shadow: var(--shadow-soft, var(--shadow-sm, 0 14px 36px rgb(20 20 20 / 10%)));
  box-sizing: border-box;`;

export function createBlockBaseStyles(selectors: readonly string[]): string {
  return String.raw`/* MDS shared block structural styles. Themes may override every variable and rule. */
:where(${selectors.join(", ")}) {
${blockBaseDeclarations}
}`;
}
