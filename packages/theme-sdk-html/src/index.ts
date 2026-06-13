import type { HtmlTheme } from "@mds/html-types";
import {
  createThemeFromJsxTheme,
  createThemeSourceFromJsxTheme,
  defineJsxTheme,
  raw,
  type JsxThemeDefinition,
  type RawHtml,
  type TemplateBlock,
  type ThemeTemplateProps
} from "@mds/theme-loader/jsx";
import type { ThemeSourceInput } from "@mds/theme-loader";

export type HtmlThemeBlock = TemplateBlock;
export type HtmlTemplateValue = RawHtml | string | number | boolean | null | undefined;
export type HtmlThemeBlockComponent = (block: HtmlThemeBlock) => HtmlTemplateValue;

export interface HtmlThemeDefinition extends Omit<JsxThemeDefinition, "blocks"> {
  blocks: Record<string, HtmlThemeBlockComponent>;
}

export function defineHtmlTheme(theme: HtmlThemeDefinition): HtmlThemeDefinition {
  return theme;
}

export function createThemeSourceFromHtmlTheme(theme: HtmlThemeDefinition): ThemeSourceInput {
  return createThemeSourceFromJsxTheme(toJsxTheme(theme));
}

export function createThemeFromHtmlTheme(theme: HtmlThemeDefinition): HtmlTheme {
  return createThemeFromJsxTheme(toJsxTheme(theme));
}

export function html(strings: TemplateStringsArray, ...values: HtmlTemplateValue[]): RawHtml {
  let output = "";

  for (let index = 0; index < strings.length; index += 1) {
    output += strings[index] ?? "";
    if (index < values.length) {
      output += renderHtmlTemplateValue(values[index]);
    }
  }

  return raw(output);
}

export function unsafeHtml(value: string): RawHtml {
  return raw(value);
}

function toJsxTheme(theme: HtmlThemeDefinition): JsxThemeDefinition {
  return defineJsxTheme({
    ...theme,
    blocks: Object.fromEntries(
      Object.entries(theme.blocks).map(([block, component]) => [
        block,
        (props: ThemeTemplateProps) => {
          const rendered = component(props);
          return isRawHtml(rendered) ? rendered : raw(renderHtmlTemplateValue(rendered));
        }
      ])
    )
  });
}

function renderHtmlTemplateValue(value: HtmlTemplateValue): string {
  if (value === null || value === undefined || typeof value === "boolean") {
    return "";
  }

  if (isRawHtml(value)) {
    return value.__rawHtml;
  }

  return escapeHtml(String(value));
}

function isRawHtml(value: unknown): value is RawHtml {
  return typeof value === "object" && value !== null && "__rawHtml" in value && typeof value.__rawHtml === "string";
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export type { RawHtml, TemplateBlock, ThemeTemplateProps };
