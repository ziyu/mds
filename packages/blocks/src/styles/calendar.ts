export const calendarStyles = String.raw`:where(.calendar) {
  width: min(100%, 23rem);
}

:where(.calendar-native) {
  display: grid;
  gap: 0.45rem;
}

:where(.calendar-enhanced) {
  display: grid;
  gap: 0.8rem;
  border: 1px solid var(--mds-block-line);
  border-radius: var(--mds-block-radius);
  background: var(--mds-block-surface);
  padding: 0.85rem;
  box-shadow: var(--mds-block-shadow);
}

:where(.calendar-header) {
  display: grid;
  grid-template-columns: 2.25rem minmax(0, 1fr) 2.25rem;
  gap: 0.55rem;
  align-items: center;
}

:where(.calendar-caption) {
  text-align: center;
}

:where(.calendar-previous, .calendar-next) {
  display: inline-grid;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  border: 1px solid var(--mds-block-line);
  border-radius: calc(var(--mds-block-radius) * 0.72);
  background: var(--mds-block-soft);
  color: inherit;
  cursor: pointer;
}

:where(.calendar-weekdays, .calendar-days) {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.22rem;
}

:where(.calendar-weekdays > span) {
  padding-block: 0.2rem;
  color: var(--mds-block-muted);
  font-size: 0.73rem;
  font-weight: 750;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

:where(.calendar-day) {
  aspect-ratio: 1;
  min-width: 0;
  border: 0;
  border-radius: calc(var(--mds-block-radius) * 0.72);
  background: transparent;
  color: inherit;
  font: inherit;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
}

:where(.calendar-day:hover:not(:disabled), .calendar-day:focus-visible) {
  background: var(--mds-block-accent-soft);
  outline: 2px solid transparent;
}

:where(.calendar-day[data-outside="true"]) {
  color: var(--mds-block-muted);
  opacity: 0.56;
}

:where(.calendar-day[data-today="true"]) {
  box-shadow: inset 0 0 0 1px var(--mds-block-accent);
}

:where(.calendar-day[data-range-middle="true"]) {
  border-radius: 0;
  background: var(--mds-block-accent-soft);
}

:where(.calendar-day[aria-selected="true"]) {
  background: var(--mds-block-accent);
  color: var(--mds-block-accent-ink);
  font-weight: 800;
}

:where(.calendar-day:disabled) {
  cursor: not-allowed;
  opacity: 0.32;
}

:where(.calendar-output) {
  min-height: 1.35em;
  color: var(--mds-block-muted);
  font-size: 0.86rem;
  text-align: center;
}

:where(.calendar [hidden]) {
  display: none !important;
}`;
