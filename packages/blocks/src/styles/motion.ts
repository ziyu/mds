export const motionStyles = String.raw`/* Motion state is shared; themes define the visible preset. */
:where([data-motion-ready="true"]) {
  --motion-delay: 0ms;
  --motion-duration: 640ms;
}

@media (prefers-reduced-motion: reduce) {
  :where([data-motion-ready="true"], [data-motion-ready="true"] > .motion-item) {
    animation: none !important;
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    transition-delay: 0ms !important;
  }
}`;
