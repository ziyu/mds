export type UrlPurpose = "navigation" | "media" | "embed" | "download";

const allowedSchemes: Record<UrlPurpose, ReadonlySet<string>> = {
  navigation: new Set(["http", "https", "mailto", "tel"]),
  media: new Set(["http", "https"]),
  embed: new Set(["http", "https"]),
  download: new Set(["http", "https"])
};

const schemePattern = /^([A-Za-z][A-Za-z0-9+.-]*):/;
const asciiWhitespaceAndControlsPattern = /[\u0000-\u0020\u007f]/g;

export function sanitizeUrl(value: string, purpose: UrlPurpose): string | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  const normalized = normalizeForSchemeDetection(trimmed);
  if (normalized.startsWith("\\\\")) {
    return undefined;
  }

  const scheme = normalized.match(schemePattern)?.[1]?.toLowerCase();
  if (scheme !== undefined && !allowedSchemes[purpose].has(scheme)) {
    return undefined;
  }

  return trimmed;
}

function normalizeForSchemeDetection(value: string): string {
  let normalized = value;
  for (let index = 0; index < 3; index += 1) {
    try {
      const decoded = decodeURIComponent(normalized);
      if (decoded === normalized) {
        break;
      }
      normalized = decoded;
    } catch {
      break;
    }
  }

  return normalized.replace(asciiWhitespaceAndControlsPattern, "");
}
