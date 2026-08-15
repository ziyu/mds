# @mds-crate/blocks

Shared MDS block vocabulary, capability metadata, profiles, and reusable structural theme templates.

The package exports focused block packs, `foundationBlocks`, and `standardBlocks`. `foundationBlocks` prioritizes core layout, display, navigation, controls, native forms, interactive containers, and menus; `standardBlocks` adds reusable data, documentation, media, guidance, chat, and motion profiles. Themes can compose those packs and override only the templates whose structure or behavior must differ.

Foundation controls render as usable native HTML without a browser component runtime. The standard vocabulary also includes calendar selection, sortable/filterable native data tables, meter-backed charts, context menus, menubars, and portable chat composition. Packs carry de-duplicated structural CSS and progressive enhancement before theme-owned assets, so external themes get functional fallbacks and retain full styling control. Existing action attributes bridge through `data-action` and `data-target`, while the interactive-action and motion contracts remain unchanged.

## Source layout

- `src/index.ts` is the stable public barrel; it must not contain block implementations.
- `src/vocabulary/` owns machine-readable metadata, one module per profile.
- `src/packs/` owns theme templates, one module per profile, while `src/packs/index.ts` owns only pack composition.
- `src/runtime/` and `src/styles/` own progressive enhancement and structural CSS by capability. Enhanced packs include only the assets they use.

Keep profile vocabulary and pack modules aligned when adding a block. Cross-profile composition belongs in the aggregators, not in an individual profile module.

See the [block layer design](https://github.com/ziyu/mds/blob/main/docs/BLOCK_LAYER.md). Licensed under Apache-2.0.
