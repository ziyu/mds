export type PreviewSize = "desktop" | "tablet" | "mobile";

export interface PreviewPaneProps {
  html: string;
  size: PreviewSize;
}

export function PreviewPane({ html, size }: PreviewPaneProps) {
  const previewHtml = injectPreviewNavigationGuard(html);

  return (
    <div className={`preview-frame preview-frame-${size}`}>
      <iframe
        title="MDS preview"
        sandbox="allow-scripts allow-forms"
        referrerPolicy="no-referrer"
        srcDoc={previewHtml}
      />
    </div>
  );
}

export function injectPreviewNavigationGuard(html: string): string {
  const script = `<script>
(() => {
  document.addEventListener("click", (event) => {
    const target =
      event.target instanceof Element
        ? event.target
        : event.target instanceof Text
          ? event.target.parentElement
          : null;

    if (!target) {
      return;
    }

    const missingAction = target.closest('[data-action-missing="true"]');
    if (missingAction instanceof HTMLElement) {
      event.preventDefault();
      event.stopPropagation();
      window.parent.postMessage(
        {
          type: "mds-preview-missing-action",
          action: missingAction.dataset.action || "unknown"
        },
        "*"
      );
      return;
    }

    const link = target.closest("a[href]");
    if (!(link instanceof HTMLAnchorElement)) {
      return;
    }

    const href = link.getAttribute("href") || "";
    if (href.startsWith("#")) {
      event.preventDefault();
      const targetId = decodeURIComponent(href.slice(1));
      const target = targetId.length === 0 ? null : document.getElementById(targetId);

      if (target) {
        target.scrollIntoView({ block: "start", behavior: "smooth" });
      } else {
        window.parent.postMessage({ type: "mds-preview-navigation", href }, "*");
      }
      return;
    }

    if (link.hasAttribute("download") || link.target === "_blank") {
      return;
    }

    event.preventDefault();
    window.parent.postMessage({ type: "mds-preview-navigation", href }, "*");
  });
})();
</script>`;

  return html.includes("</body>") ? html.replace("</body>", `${script}</body>`) : `${html}${script}`;
}
