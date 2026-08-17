import type { ThemeSummary } from "@mds-crate/theme-loader/browser";
import type { PreviewSize } from "./preview-pane.js";
import {
  formatThemeBuildOutput,
  formatThemeBuildSummary,
  formatThemeInspectionOutput,
  formatThemeInspectionSummary,
  type ThemeBuildSummary,
  type ThemeInspectionSummary
} from "./theme-build-status.js";

export interface PreviewToolbarProps {
  allowThemeTools: boolean;
  canBuildTheme: boolean;
  effectiveThemeRef: string;
  frontmatterThemeRef: string | undefined;
  isBuildingTheme: boolean;
  isFullscreen: boolean;
  isInspectingTheme: boolean;
  onBuildTheme: () => void;
  onInspectTheme: () => void;
  onPreviewSizeChange: (size: PreviewSize) => void;
  onThemeChange: (ref: string) => void;
  onToggleFullscreen: () => void;
  previewSize: PreviewSize;
  previewThemeRef: string;
  themeBuildSummary: ThemeBuildSummary | undefined;
  themeInspectionSummary: ThemeInspectionSummary | undefined;
  themes: ThemeSummary[];
}

export function PreviewToolbar(props: PreviewToolbarProps) {
  return (
    <div className="preview-toolbar">
      <label className="preview-control theme-select-field">
        <span>Theme</span>
        <select value={props.previewThemeRef} onChange={(event) => props.onThemeChange(event.target.value)}>
          {themeOptions(props.themes, props.previewThemeRef).map((theme) => (
            <option key={theme.name} value={theme.name}>{theme.label}</option>
          ))}
        </select>
      </label>

      {props.allowThemeTools ? (
        <details className="theme-toolbelt">
          <summary
            className="theme-toolbelt-summary"
            title={
              props.frontmatterThemeRef === undefined
                ? `Using selected theme "${props.effectiveThemeRef}"`
                : `Using frontmatter theme "${props.effectiveThemeRef}"`
            }
          >
            Tools
          </summary>
          <div className="theme-toolbelt-body">
            <div className="theme-toolbelt-actions">
              <button
                type="button"
                onClick={props.onBuildTheme}
                disabled={!props.canBuildTheme || props.isBuildingTheme}
                title={props.canBuildTheme ? "Build this package theme" : "This theme is a static artifact and does not need build"}
              >
                {props.isBuildingTheme ? "Building..." : "Build"}
              </button>
              <button type="button" onClick={props.onInspectTheme} disabled={props.isInspectingTheme}>
                {props.isInspectingTheme ? "Inspecting..." : "Inspect"}
              </button>
            </div>
            {props.themeBuildSummary?.ref === props.effectiveThemeRef ? (
              <div className="theme-build-status" role="status">
                <strong>Last build</strong>
                <span>{formatThemeBuildSummary(props.themeBuildSummary)}</span>
                <code>{formatThemeBuildOutput(props.themeBuildSummary)}</code>
              </div>
            ) : null}
            {props.themeInspectionSummary?.ref === props.effectiveThemeRef ? (
              <div className="theme-build-status" role="status">
                <strong>Last inspect</strong>
                <span>{formatThemeInspectionSummary(props.themeInspectionSummary)}</span>
                <code>{formatThemeInspectionOutput(props.themeInspectionSummary)}</code>
              </div>
            ) : null}
          </div>
        </details>
      ) : null}

      <div className="segmented" role="group" aria-label="Preview size">
        {(["desktop", "tablet", "mobile"] satisfies PreviewSize[]).map((size) => (
          <button
            key={size}
            type="button"
            className={props.previewSize === size ? "active" : ""}
            onClick={() => props.onPreviewSizeChange(size)}
          >
            {size}
          </button>
        ))}
      </div>

      <button type="button" className="fullscreen-action" onClick={props.onToggleFullscreen}>
        {props.isFullscreen ? "Exit fullscreen" : "Fullscreen"}
      </button>
    </div>
  );
}

function themeOptions(themes: ThemeSummary[], themeRef: string): ThemeSummary[] {
  if (themes.some((theme) => theme.name === themeRef)) {
    return themes;
  }

  return [{ name: themeRef, label: themeRef }, ...themes];
}
