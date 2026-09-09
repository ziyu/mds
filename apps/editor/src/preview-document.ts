export function splitPreviewDocument(html: string) {
  const open = /<body(?:\s[^>]*)?>/i.exec(html);
  const end = html.toLowerCase().lastIndexOf('</body>');
  if (!open || end < open.index) return undefined;
  const start = open.index + open[0].length;
  const scripts: string[] = [];
  const body = html.slice(start, end).replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, (script) => { scripts.push(script); return ''; });
  return {
    body,
    signature: html.slice(0, start) + html.slice(end) + scripts.join('\n'),
    incremental: /<meta\s+name="mds-preview-updates"\s+content="morph"\s*\/?>/i.test(html.slice(0, start))
  };
}
