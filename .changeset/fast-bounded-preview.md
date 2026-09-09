---
"@mds-crate/parser": patch
"@mds-crate/renderer-html": patch
"@mds-crate/theme-loader": patch
"@mds-crate/blocks": patch
"@mds-crate/cli": patch
"@mds-crate/theme-default": patch
"@mds-crate/theme-light": patch
"@mds-crate/theme-dark": patch
"@mds-crate/theme-rich": patch
---

Render each template slot once, scan inline positions and malformed delimiters in linear time, reuse the Markdown processor, and bound parser/render expansion. Add an optional bounded Markdown cache that preserves current diagnostic positions and resolved state dependencies.

Move Editor preview compilation into a Worker with a bounded latest-revision queue and timeout recovery. Apply large text inserts directly to CodeMirror. Lifecycle-aware themes update their preview body without reloading the sandboxed iframe; unchanged interactive components retain state, and removed components release observers and global listeners. Other themes retain full-document reload behavior.
