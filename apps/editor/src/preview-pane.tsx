import { useEffect, useRef } from "react";
import bridgeScript from "./preview-bridge.js?raw";
import { splitPreviewDocument } from "./preview-document.js";

export type PreviewSize = "desktop" | "tablet" | "mobile";

export interface PreviewPaneProps {
  html: string;
  size: PreviewSize;
  pending?: boolean;
  documentKey?: string;
}

export function PreviewPane({ html, size, pending, documentKey }: PreviewPaneProps) {
  const frame = useRef<HTMLIFrameElement>(null);
  const latest = useRef({ html, documentKey });
  latest.current = { html, documentKey };
  const session = useRef({ token: '', signature: '', documentKey, ready: false, incremental: false, revision: 0, loadedHtml: '' });

  useEffect(() => {
    const iframe = frame.current!;
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    const load = () => {
      clearTimeout(watchdog);
      const doc = splitPreviewDocument(latest.current.html);
      session.current = {
        token: crypto.randomUUID(), signature: doc?.signature ?? '', documentKey: latest.current.documentKey,
        ready: false, incremental: doc?.incremental === true, revision: session.current.revision + 1, loadedHtml: latest.current.html
      };
      const state = session.current;
      const script = `<script data-preview-token="${state.token}">${bridgeScript}</script>`;
      const guarded = injectPreviewNavigationGuard(latest.current.html);
      iframe.dataset.previewReady = 'false';
      iframe.srcdoc = /<head(?:\s[^>]*)?>/i.test(guarded)
        ? guarded.replace(/<head(?:\s[^>]*)?>/i, (head) => head + script)
        : /<body(?:\s[^>]*)?>/i.test(guarded)
          ? guarded.replace(/<body(?:\s[^>]*)?>/i, (body) => `<head>${script}</head>${body}`)
          : `<!doctype html><head>${script}</head><body>${guarded}</body>`;
      iframe.dataset.previewRevision = String(state.revision);
    };
    const update = () => {
      const state = session.current;
      if (state.token && state.loadedHtml === latest.current.html && state.documentKey === latest.current.documentKey) return;
      const doc = splitPreviewDocument(latest.current.html);
      if (!state.token || state.documentKey !== latest.current.documentKey || !state.incremental || !doc?.incremental || state.signature !== doc.signature) {
        load();
      } else if (state.ready && state.loadedHtml !== latest.current.html) {
        state.loadedHtml = latest.current.html;
        iframe.contentWindow?.postMessage({ type: 'mds-preview-update', token: state.token, revision: ++state.revision, body: doc.body }, '*');
        clearTimeout(watchdog);
        watchdog = setTimeout(load, 3000);
      }
    };
    const message = (event: MessageEvent) => {
      const state = session.current;
      if (event.source !== iframe.contentWindow || event.data?.token !== state.token) return;
      if (event.data.type === 'mds-preview-ready') { state.ready = true; iframe.dataset.previewReady = 'true'; update(); }
      if (event.data.type === 'mds-preview-updated' && event.data.revision === state.revision) {
        clearTimeout(watchdog);
        iframe.dataset.previewRevision = String(state.revision);
      }
      if (event.data.type === 'mds-preview-reload') load();
    };
    window.addEventListener('message', message);
    iframe.addEventListener('mds-preview-source', update);
    update();
    return () => {
      window.removeEventListener('message', message);
      iframe.removeEventListener('mds-preview-source', update);
      clearTimeout(watchdog);
      session.current.token = '';
    };
  }, []);

  useEffect(() => { frame.current?.dispatchEvent(new Event('mds-preview-source')); }, [html, documentKey]);

  return (
    <div className={`preview-frame preview-frame-${size}`} aria-busy={pending}>
      <iframe ref={frame} title="MDS preview" sandbox="allow-scripts allow-forms" referrerPolicy="no-referrer" />
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
      let targetId;
      try { targetId = decodeURIComponent(href.slice(1)); } catch { targetId = href.slice(1); }
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
