export const interactiveStyles = String.raw`/* Portable interaction geometry and state visibility. */
:where(
  [data-mds-role="tab-panel"],
  [data-mds-role="accordion-panel"],
  [data-mds-role="dialog"],
  [data-mds-role="drawer"]
)[hidden] {
  display: none !important;
}

:where([data-mds-role="carousel-track"]) {
  display: flex;
  max-width: 100%;
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  scroll-snap-type: inline mandatory;
}

:where([data-mds-role="carousel-item"]) {
  flex: 0 0 100%;
  min-width: 0;
  scroll-snap-align: start;
}

:where([data-mds-role="carousel-controls"]) {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

:where([data-mds-role="dialog"], [data-mds-role="drawer"]) {
  position: fixed;
  z-index: var(--mds-overlay-z, 1000);
  inset: 0;
  isolation: isolate;
  pointer-events: auto;
}

:where([data-mds-role="overlay-backdrop"]) {
  position: absolute;
  z-index: 0;
  inset: 0;
  width: 100%;
  height: 100%;
}

:where([data-mds-role="overlay-panel"]) {
  position: relative;
  z-index: 1;
  max-width: 100%;
  max-height: 100%;
  overflow: auto;
}`;
