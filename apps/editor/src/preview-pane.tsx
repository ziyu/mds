export type PreviewSize = "desktop" | "tablet" | "mobile";

export interface PreviewPaneProps {
  html: string;
  size: PreviewSize;
}

export function PreviewPane({ html, size }: PreviewPaneProps) {
  return (
    <div className={`preview-frame preview-frame-${size}`}>
      <iframe
        title="MDS preview"
        sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
        referrerPolicy="no-referrer"
        srcDoc={html}
      />
    </div>
  );
}
