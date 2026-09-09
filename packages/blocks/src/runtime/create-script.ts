const runtimeBanner = "/* MDS shared block progressive enhancement. */";

export function createEnhancementScript(setupFunctions: readonly string[], implementation: string): string {
  const setupCalls = setupFunctions.map((name) => `    ${name}();`).join("\n");

  return `${runtimeBanner}
(() => {
  const truthy = (value) =>
    value !== null && value.trim() !== "" && !["false", "0", "off", "no"].includes(value.trim().toLowerCase());

  const cleanupByElement = new Map();
  const onUnmount = (element, cleanup) => {
    const callbacks = cleanupByElement.get(element) || [];
    callbacks.push(cleanup);
    cleanupByElement.set(element, callbacks);
  };
  document.addEventListener("mds:preview-unmount", (event) => {
    const root = event.detail?.root;
    if (!(root instanceof Node)) return;
    for (const [element, callbacks] of cleanupByElement) {
      if (root === element || root.contains(element)) {
        callbacks.forEach((cleanup) => cleanup());
        cleanupByElement.delete(element);
      }
    }
  });

${implementation}

  const setup = () => {
${setupCalls}
  };

  document.addEventListener("mds:preview-update", setup);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setup, { once: true });
  } else {
    setup();
  }
})();`;
}
