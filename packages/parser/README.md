# @mds-crate/parser

Parser for the Markdown-based MDS authoring language.

```ts
import { parseMds } from "@mds-crate/parser";

const document = parseMds(source, { filePath: "page.mds" });
```

The parser produces `@mds-crate/ast` nodes and structured diagnostics. It does not load themes or render HTML.

See the [language specification](https://github.com/ziyu/mds/blob/main/SPEC.md). Licensed under Apache-2.0.
