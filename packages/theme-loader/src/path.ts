export function normalizeRelativePosixPath(path: string): string {
  const segments = path.split("/").filter((segment) => segment.length > 0 && segment !== ".");
  return segments.length === 0 ? "." : segments.join("/");
}
