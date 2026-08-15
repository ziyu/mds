# @mds-crate/blocks

Shared MDS block vocabulary, capability metadata, profiles, and reusable structural theme templates.

The package exports focused block packs, `foundationBlocks`, and `standardBlocks`. `foundationBlocks` prioritizes core layout, display, navigation, controls, native forms, interactive containers, and menus; `standardBlocks` adds specialized content, marketing, and motion profiles. Themes can compose those packs and override only the templates whose structure or behavior must differ.

Foundation controls render as usable native HTML without a browser component runtime. The standard vocabulary also includes calendar selection, sortable/filterable native data tables, meter-backed charts, context menus, menubars, and portable chat composition. Packs carry de-duplicated structural CSS and progressive enhancement before theme-owned assets, so external themes get functional fallbacks and retain full styling control. Existing action attributes bridge through `data-action` and `data-target`, while the interactive-action and motion contracts remain unchanged.

See the [block layer design](https://github.com/ziyu/mds/blob/main/docs/BLOCK_LAYER.md). Licensed under Apache-2.0.
