---
"@mds-crate/cli": patch
"@mds-crate/theme-builder": patch
---

Preserve edits typed while an Editor save is pending, prevent duplicate save requests, and serialize file saves so concurrent requests cannot bypass revision conflict checks.

Reject theme build outputs that would delete or overwrite source files or build assets, including overlaps through symbolic links, before modifying existing files.
