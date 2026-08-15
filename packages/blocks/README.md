# @mds-crate/blocks

Shared MDS block vocabulary, capability metadata, profiles, and reusable structural theme templates.

The package exports nine focused primitive packs and `foundationBlocks`. `foundationBlocks` composes core layout, display, navigation, controls, native forms, interactive containers, and menus; themes may add the separate media and motion packs. Themes can override only the templates whose structure or behavior must differ.

Foundation controls render as usable native HTML without a browser component runtime. The 63-block shared vocabulary includes calendar selection, context menus, menubars, native form controls, media semantics, and the existing action and motion contracts. Packs carry de-duplicated structural CSS and progressive enhancement before theme-owned assets, so external themes get functional fallbacks and retain full styling control.

Data tables, charts, documentation systems, guided sequences, galleries, conversation layouts, and similar compositions are intentionally not shared primitives. Themes can implement them as extensions; `@mds-crate/theme-rich` is the official package that preserves broad built-in coverage.

## Source layout

- `src/index.ts` is the stable public barrel; it must not contain block implementations.
- `src/vocabulary/` owns machine-readable metadata, one module per profile.
- `src/packs/` owns theme templates, one module per profile, while `src/packs/index.ts` owns only pack composition.
- `src/runtime/` and `src/styles/` own progressive enhancement and structural CSS by capability. Enhanced packs include only the assets they use.

Keep profile vocabulary and pack modules aligned when adding a block. Cross-profile composition belongs in the aggregators, not in an individual profile module.

See the [block layer design](https://github.com/ziyu/mds/blob/main/docs/BLOCK_LAYER.md). Licensed under Apache-2.0.
