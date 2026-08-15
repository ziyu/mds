export const blockFoundationStyles = String.raw`/* MDS shared block structural styles. Themes may override every variable and rule. */
:where(.command, .calendar, .data-table-shell, .chart, .context-menu, .menubar, .attachment, .bubble, .marker, .message, .message-scroller) {
  --mds-block-accent: var(--accent, var(--color-primary, #316b5f));
  --mds-block-accent-ink: var(--accent-strong, var(--color-primary-foreground, #ffffff));
  --mds-block-accent-soft: var(--accent-soft, color-mix(in srgb, var(--mds-block-accent), transparent 86%));
  --mds-block-surface: var(--surface, var(--paper, var(--color-card, Canvas)));
  --mds-block-soft: var(--soft, var(--color-muted, color-mix(in srgb, currentColor, transparent 96%)));
  --mds-block-line: var(--line, var(--color-border, color-mix(in srgb, currentColor, transparent 78%)));
  --mds-block-muted: var(--muted, var(--ink-soft, var(--color-muted-foreground, color-mix(in srgb, currentColor, transparent 38%))));
  --mds-block-danger: var(--red, var(--warn, #b42318));
  --mds-block-radius: var(--radius, var(--radius-xl, 0.75rem));
  --mds-block-shadow: var(--shadow-soft, var(--shadow-sm, 0 14px 36px rgb(20 20 20 / 10%)));
  box-sizing: border-box;
}

:where(.command) {
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
}

:where(.menu-list) {
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
}

:where(.calendar) {
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
}

:where(.data-table-shell) {
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

:where(.context-menu) {
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
}

:where(.attachment) {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 0.75rem;
  align-items: center;
  min-width: 0;
  border: 1px solid var(--mds-block-line);
  border-radius: var(--mds-block-radius);
  background: var(--mds-block-surface);
  padding: 0.75rem;
}

:where(.attachment-media) {
  display: grid;
  place-items: center;
  width: 3rem;
  height: 3rem;
  overflow: hidden;
  border-radius: calc(var(--mds-block-radius) * 0.72);
  background: var(--mds-block-soft);
  color: var(--mds-block-accent);
}

:where(.attachment-media img) {
  grid-area: 1 / 1;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

:where(.attachment-media img:not([src])) {
  display: none;
}

:where(.attachment-file) {
  font-size: 1.2rem;
  font-weight: 850;
}

:where(.attachment-content) {
  display: grid;
  gap: 0.18rem;
  min-width: 0;
}

:where(.attachment-title) {
  overflow: hidden;
  color: inherit;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:where(.attachment-description, .attachment-meta) {
  color: var(--mds-block-muted);
  font-size: 0.8rem;
}

:where(.attachment-meta) {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

:where(.attachment-meta > span:empty) {
  display: none;
}

:where(.attachment-meta > span + span:not(:empty))::before {
  content: "·";
  margin-inline-end: 0.35rem;
}

:where(.attachment-description:empty, .attachment-actions:empty) {
  display: none;
}

:where(.attachment-progress) {
  display: none;
  width: 100%;
  height: 0.35rem;
  accent-color: var(--mds-block-accent);
}

:where(.attachment[data-attr-state="uploading"] .attachment-progress, .attachment[data-attr-state="processing"] .attachment-progress) {
  display: block;
}

:where(.attachment[data-attr-state="error"]) {
  border-color: color-mix(in srgb, var(--mds-block-danger), transparent 45%);
}

:where(.bubble) {
  position: relative;
  display: grid;
  gap: 0.35rem;
  width: fit-content;
  max-width: min(80%, 44rem);
}

:where(.bubble[data-attr-align="end"]) {
  margin-inline-start: auto;
}

:where(.bubble-content) {
  border: 1px solid transparent;
  border-radius: calc(var(--mds-block-radius) * 1.25);
  background: var(--mds-block-accent);
  color: var(--mds-block-accent-ink);
  padding: 0.72rem 0.9rem;
}

:where(.bubble[data-attr-variant="secondary"] .bubble-content, .bubble[data-attr-variant="muted"] .bubble-content) {
  background: var(--mds-block-soft);
  color: inherit;
}

:where(.bubble[data-attr-variant="tinted"] .bubble-content) {
  background: var(--mds-block-accent-soft);
  color: inherit;
}

:where(.bubble[data-attr-variant="outline"] .bubble-content) {
  border-color: var(--mds-block-line);
  background: transparent;
  color: inherit;
}

:where(.bubble[data-attr-variant="ghost"]) {
  width: 100%;
  max-width: none;
}

:where(.bubble[data-attr-variant="ghost"] .bubble-content) {
  background: transparent;
  color: inherit;
  padding-inline: 0;
}

:where(.bubble[data-attr-variant="destructive"] .bubble-content) {
  background: var(--mds-block-danger);
  color: #fff;
}

:where(.bubble-content > :first-child, .message-body > :first-child, .marker-content > :first-child) {
  margin-top: 0;
}

:where(.bubble-content > :last-child, .message-body > :last-child, .marker-content > :last-child) {
  margin-bottom: 0;
}

:where(.bubble-reactions) {
  display: flex;
  gap: 0.25rem;
  justify-content: flex-end;
  min-height: 0;
  font-size: 0.82rem;
}

:where(.bubble-reactions:empty) {
  display: none;
}

:where(.marker) {
  display: flex;
  gap: 0.55rem;
  align-items: center;
  justify-content: center;
  color: var(--mds-block-muted);
  font-size: 0.82rem;
  text-align: center;
}

:where(.marker[data-attr-variant="border"]) {
  border: 1px solid var(--mds-block-line);
  border-radius: var(--mds-block-radius);
  background: var(--mds-block-soft);
  padding: 0.55rem 0.75rem;
}

:where(.marker[data-attr-variant="separator"])::before,
:where(.marker[data-attr-variant="separator"])::after {
  content: "";
  flex: 1;
  border-top: 1px solid var(--mds-block-line);
}

:where(.marker-icon:empty) {
  display: none;
}

:where(.message) {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.7rem;
  align-items: end;
}

:where(.message[data-attr-align="end"]) {
  grid-template-columns: minmax(0, 1fr) auto;
}

:where(.message[data-attr-align="end"] .message-avatar) {
  grid-column: 2;
}

:where(.message[data-attr-align="end"] .message-content) {
  grid-column: 1;
  grid-row: 1;
  align-items: end;
}

:where(.message-avatar) {
  width: 2.5rem;
  min-height: 1px;
}

:where(.message-content) {
  display: grid;
  gap: 0.35rem;
  min-width: 0;
}

:where(.message-header, .message-footer) {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  color: var(--mds-block-muted);
  font-size: 0.78rem;
}

:where(.message-header:empty, .message-footer:empty, .message-avatar:empty) {
  display: none;
}

:where(.message-scroller) {
  position: relative;
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--mds-block-line);
  border-radius: var(--mds-block-radius);
  background: var(--mds-block-surface);
  box-shadow: var(--mds-block-shadow);
}

:where(.message-scroller-viewport) {
  max-height: 22rem;
  overflow-y: auto;
  overscroll-behavior: contain;
  scroll-behavior: smooth;
  scrollbar-gutter: stable;
}

:where(.message-scroller-content) {
  display: grid;
  gap: 1rem;
  padding: 1rem;
}

:where(.message-scroller-button) {
  position: absolute;
  right: 0.8rem;
  bottom: 0.8rem;
  border: 1px solid var(--mds-block-line);
  border-radius: 999px;
  background: var(--mds-block-surface);
  color: inherit;
  padding: 0.48rem 0.72rem;
  box-shadow: var(--mds-block-shadow);
  cursor: pointer;
}

:where(.message-scroller-button[hidden]) {
  display: none !important;
}

@media (max-width: 36rem) {
  :where(.chart-point) {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  :where(.chart-point-meter) {
    grid-column: 1 / -1;
    grid-row: 2;
  }

  :where(.bubble) {
    max-width: 92%;
  }
}`;
