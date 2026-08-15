export const dataStyles = String.raw`:where(.data-table-shell) {
  display: grid;
  gap: 0.8rem;
  min-width: 0;
}

:where(.data-table-toolbar, .data-table-pagination) {
  display: flex;
  flex-wrap: wrap;
  gap: 0.7rem;
  align-items: end;
  justify-content: space-between;
}

:where(.data-table-filter) {
  display: grid;
  flex: 1 1 16rem;
  gap: 0.35rem;
  max-width: 24rem;
}

:where(.data-table-filter-input) {
  width: 100%;
}

:where(.data-table-summary, .data-table-page) {
  color: var(--mds-block-muted);
  font-size: 0.84rem;
  font-variant-numeric: tabular-nums;
}

:where(.data-table-scroll) {
  max-width: 100%;
  overflow-x: auto;
  border: 1px solid var(--mds-block-line);
  border-radius: var(--mds-block-radius);
  background: var(--mds-block-surface);
  box-shadow: var(--mds-block-shadow);
}

:where(.data-table) {
  width: 100%;
  min-width: 38rem;
  border-collapse: collapse;
  font-variant-numeric: tabular-nums;
}

:where(.data-table th, .data-table td) {
  padding: 0.72rem 0.85rem;
  border-bottom: 1px solid var(--mds-block-line);
  text-align: start;
  vertical-align: middle;
}

:where(.data-table th) {
  background: var(--mds-block-soft);
  color: var(--mds-block-muted);
  font-size: 0.76rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.045em;
}

:where(.data-table tbody tr:last-child td) {
  border-bottom: 0;
}

:where(.data-table tbody tr[aria-selected="true"]) {
  background: var(--mds-block-accent-soft);
}

:where(.data-table-sort) {
  display: inline-flex;
  gap: 0.4rem;
  align-items: center;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-transform: inherit;
  letter-spacing: inherit;
  cursor: pointer;
}

:where(.data-table-sort-indicator) {
  color: var(--mds-block-accent);
}

:where(.data-table-selection) {
  width: 2.8rem;
  text-align: center !important;
}

:where(.data-table-empty) {
  border: 1px dashed var(--mds-block-line);
  border-radius: var(--mds-block-radius);
  padding: 2rem;
  color: var(--mds-block-muted);
  text-align: center;
}

:where(.data-table-previous, .data-table-next) {
  border: 1px solid var(--mds-block-line);
  border-radius: calc(var(--mds-block-radius) * 0.72);
  background: var(--mds-block-surface);
  color: inherit;
  padding: 0.48rem 0.78rem;
  cursor: pointer;
}

:where(.data-table-previous:disabled, .data-table-next:disabled) {
  cursor: not-allowed;
  opacity: 0.45;
}

:where(.data-table-shell [hidden]) {
  display: none !important;
}

:where(.chart) {
  display: grid;
  gap: 1rem;
  margin: 0;
  border: 1px solid var(--mds-block-line);
  border-radius: var(--mds-block-radius);
  background: var(--mds-block-surface);
  padding: clamp(1rem, 3vw, 1.4rem);
  box-shadow: var(--mds-block-shadow);
}

:where(.chart-heading) {
  font-size: 1.05rem;
  font-weight: 800;
}

:where(.chart-description, .chart-legend) {
  color: var(--mds-block-muted);
  font-size: 0.86rem;
}

:where(.chart-description:empty, .chart-legend:empty) {
  display: none;
}

:where(.chart-plot) {
  display: grid;
  gap: 1rem;
}

:where(.chart-series) {
  display: grid;
  gap: 0.65rem;
}

:where(.chart-series-label) {
  margin: 0;
  color: var(--mds-block-muted);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.045em;
}

:where(.chart-series-points) {
  display: grid;
  gap: 0.5rem;
}

:where(.chart-point) {
  display: grid;
  grid-template-columns: minmax(6rem, 0.8fr) minmax(8rem, 2fr) minmax(3rem, auto);
  gap: 0.7rem;
  align-items: center;
}

:where(.chart-point-meter) {
  width: 100%;
  height: 0.75rem;
  accent-color: var(--mds-block-accent);
}

:where(.chart-point-value) {
  text-align: end;
  font-variant-numeric: tabular-nums;
}
@media (max-width: 36rem) {
  :where(.chart-point) {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  :where(.chart-point-meter) {
    grid-column: 1 / -1;
    grid-row: 2;
  }
}`;
