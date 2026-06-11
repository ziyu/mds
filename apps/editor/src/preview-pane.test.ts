import { describe, expect, it } from "vitest";
import { injectPreviewNavigationGuard } from "./preview-pane.js";

describe("injectPreviewNavigationGuard", () => {
  it("intercepts local hash links inside srcdoc previews", () => {
    const html = injectPreviewNavigationGuard("<!doctype html><body><a href=\"#contact\">Contact</a></body>");

    expect(html).toContain('href.startsWith("#")');
    expect(html).toContain("event.preventDefault();");
    expect(html).toContain("document.getElementById(targetId)");
    expect(html).toContain('target.scrollIntoView({ block: "start", behavior: "smooth" });');
  });
});
