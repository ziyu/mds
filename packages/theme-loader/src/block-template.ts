export interface ThemeTemplateEntry {
  blockType: string;
  template: string;
}

export function collectTemplateEntries(template: string, fallbackBlockType: string): ThemeTemplateEntry[] {
  const entries = [...template.matchAll(/<template\b([^>]*)>([\s\S]*?)<\/template>/gi)].flatMap((match) => {
    const blockTypes = parseTemplateBlockTypes(match[1] ?? "");
    const body = match[2] ?? "";
    return blockTypes.map((blockType) => ({
      blockType,
      template: body
    }));
  });

  return entries.length === 0
    ? [
        {
          blockType: fallbackBlockType,
          template
        }
      ]
    : entries;
}

export function blockTypeFromPath(path: string): string {
  const fileName = path.split("/").at(-1) ?? path;
  return fileName.endsWith(".html") ? fileName.slice(0, -".html".length) : fileName;
}

function parseTemplateBlockTypes(attributes: string): string[] {
  const match = attributes.match(/\sdata-block=(["'])(.*?)\1/i);
  if (match === null) {
    return [];
  }

  return (match[2] ?? "").split(/\s+/).filter(Boolean);
}
