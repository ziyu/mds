import { useEffect, useRef, useState } from "react";
import type { ThemeSource } from "@mds-crate/theme-loader/browser";
import type { PreviewResult } from "./preview-compiler.js";
import { PreviewScheduler } from "./preview-scheduler.js";

export function usePreview(source: string, theme: ThemeSource | undefined) {
  const scheduler = useRef<PreviewScheduler | null>(null);
  const latest = useRef({ source, theme, revision: 0 });
  const themeVersion = useRef({ theme, id: theme ? 1 : 0, next: 2 });
  const [completed, setCompleted] = useState<{ source: string; theme: ThemeSource | undefined; result: PreviewResult }>();

  useEffect(() => {
    const instance = new PreviewScheduler(
      () => new Worker(new URL('./preview.worker.ts', import.meta.url), { type: 'module' }),
      (result) => {
        setCompleted({ ...latest.current, result });
      },
      (message, revision) => {
        setCompleted({ ...latest.current, result: {
          revision, html: '', diagnostics: [{ code: 'preview-worker-failed', severity: 'error', source: 'renderer', message }],
          duration: 0, error: message
        } });
      }
    );
    scheduler.current = instance;
    return () => { instance.dispose(); scheduler.current = null; };
  }, []);

  useEffect(() => {
    const version = themeVersion.current;
    if (version.theme !== theme) {
      version.theme = theme;
      version.id = theme ? version.next++ : 0;
    }
    latest.current = { source, theme, revision: 0 };
    const revision = scheduler.current!.schedule({ source, themeId: version.id, ...(theme ? { theme } : {}) });
    latest.current = { source, theme, revision };
  }, [source, theme]);

  return {
    result: completed?.result,
    pending: completed?.source !== source || completed?.theme !== theme,
    themeId: themeVersion.current.id
  };
}
