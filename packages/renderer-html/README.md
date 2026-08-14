# @mds-crate/renderer-html

HTML renderer for MDS source and AST documents.

Render a standalone document directly from source:

```ts
import { renderMdsResult } from "@mds-crate/renderer-html";

const result = renderMdsResult(source);
console.log(result.html, result.diagnostics);
```

Render an embeddable fragment and receive theme assets separately:

```ts
const result = renderMdsResult(source, {
  mode: "fragment",
  theme
});

result.html === result.body;
console.log(result.head, result.css, result.js);
```

In fragment mode, the custom theme shell and theme script are not inserted into `html`. `head` contains generated head additions, including embedded CSS unless `includeCss` is false. `css` and `js` expose the raw theme assets so the host application can apply its own asset and content-security policy.

The AST-based API remains available:

```ts
import { parseMds } from "@mds-crate/parser";
import { renderHtmlResult } from "@mds-crate/renderer-html";

const document = parseMds(source);
const result = renderHtmlResult(document);
```

## URL and trust policy

- Navigation links allow relative and protocol-relative URLs, HTTP(S), `mailto:`, and `tel:`.
- Markdown images, MDS audio/video, embeds, models, files, and downloads allow relative and protocol-relative URLs plus HTTP(S).
- `javascript:`, `data:`, `vbscript:`, `file:`, `blob:`, `ftp:`, encoded equivalents, and other unlisted schemes are neutralized and reported with an `unsafe-url` warning.
- Raw HTML in Markdown source is not rendered.
- Theme block renderers, shell markup, head markup, CSS, and JavaScript are trusted theme output. Applications decide whether to use theme JavaScript.

See the [MDS repository](https://github.com/ziyu/mds) and [release plan](https://github.com/ziyu/mds/blob/main/docs/RELEASE_PLAN.md). Licensed under Apache-2.0.
