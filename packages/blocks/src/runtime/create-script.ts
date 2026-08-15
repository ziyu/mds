const runtimeBanner = "/* MDS shared block progressive enhancement. */";

export function createEnhancementScript(setupFunctions: readonly string[], implementation: string): string {
  const setupCalls = setupFunctions.map((name) => `    ${name}();`).join("\n");

  return `${runtimeBanner}
(() => {
  const truthy = (value) =>
    value !== null && value.trim() !== "" && !["false", "0", "off", "no"].includes(value.trim().toLowerCase());

${implementation}

  const setup = () => {
${setupCalls}
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setup, { once: true });
  } else {
    setup();
  }
})();`;
}
