# Rendering performance

The Editor compiles previews in a dedicated module Worker. Editing and saving remain synchronous with the current source; preview results are versioned and only the newest requested revision can be displayed. At most one compilation runs and one pending revision is retained. Typing is coalesced for 120 ms. A compilation exceeding 10 seconds terminates its Worker and reports an error; the next edit starts a new Worker. Copy HTML and Export are disabled until the current source and theme have a completed result.

Large, cancelable `insertText` events (4,096+ inserted or selected UTF-16 units, outside composition) enter CodeMirror as one transaction. This avoids constructing and diffing a large native contenteditable DOM. Paste and ongoing composition keep their existing handlers.

## Compiler costs and limits

- Each template slot's children are evaluated once per block renderer invocation, and reused by `{{ slots }}` and `{{ slot:name }}`. Custom child renderers must not depend on being called twice. Diagnostics are emitted once for that evaluation.
- Inline positions advance through UTF-16 text once. Failed delimiter candidates are bounded too, including unclosed runs of `[` and `{{`.
- The frozen remark/GFM processor is shared. `createMarkdownRenderCache()` optionally caches sanitized Markdown output across renders. Cache keys are **fully interpolated Markdown**, so changes to state and `each` locals invalidate only affected Markdown values. Diagnostics are regenerated at current node positions. HTML block renderer functions and their side effects are never cached.
- The Editor owns one cache per Worker/theme version. The default cache retains at most 512 entries and 2,000,000 UTF-16 units of keys/output/unsafe URL records; this is a storage budget, not a measured heap-byte limit. Returned cache results are immutable. `clear()` releases entries and resets counters.
- MDS parsing and block traversal still process the complete source. Reuse is at MDS Markdown-node boundaries; a single large Markdown node still requires full remark parsing when changed. Splitting it arbitrarily would change reference definitions, footnote numbering and list/table semantics.

```ts
import { parseMds } from '@mds-crate/parser';
import { createMarkdownRenderCache, renderHtmlResult } from '@mds-crate/renderer-html';

const markdownCache = createMarkdownRenderCache();
const document = parseMds(source, { maxDepth: 128 });
const result = renderHtmlResult(document, {
  theme,
  markdownCache,
  limits: { maxDepth: 128, maxNodes: 100_000, maxOutputLength: 8_000_000 }
});
```

These are the default limits. Parse depth counts the document's parse frame and nested block/slot frames. Render depth includes nested node evaluation. The renderer validates input AST depth/node count before recursive collection, counts expanded nodes/list iterations, and checks intermediate/final output length including theme assets. Exceeding a budget throws a descriptive `RangeError`. Limits must be positive safe integers. They bound MDS work; arbitrary custom renderer code is still trusted code and cannot be preempted by a synchronous API. The Editor's Worker timeout adds preemption there.

## Incremental preview contract

A compatible theme shell opts in with:

```html
<meta name="mds-preview-updates" content="morph">
```

Default, Light, Dark and Rich support this contract. Third-party themes without the marker retain full `srcdoc` reloads. Document switches and shell/head/script changes also reload. Exported HTML remains a standalone document without the Editor bridge.

The Editor retains an opaque-origin iframe (`sandbox="allow-scripts allow-forms"`, never `allow-same-origin`) and posts body updates. The bridge validates the parent window, a per-load random token and increasing revision numbers. Parent acknowledgements are checked against that iframe and token. Unresponsive/failed patching falls back to a full reload.

The bridge compares previous **source DOM** with the next source DOM and maps it to live nodes. It preserves unchanged subtrees and runtime-owned attributes; source attribute changes are applied. Explicit IDs preserve identity across sibling reordering. Changed stateful components are remounted; their internal interaction state can reset. Unchanged components keep their state. Matching unchanged form defaults preserve entered values across remounts; changed source defaults take effect. File input values cannot be restored across remounts. Scroll and surviving focus are preserved.

Themes opting in must implement these synchronous lifecycle events:

- `mds:preview-unmount`, with `event.detail.root`: release external listeners/observers and state associated with this root or its descendants before removal. Runtime-portaled descendants receive cleanup too.
- `mds:preview-update`: initialize newly added roots idempotently. Already enhanced roots must not register duplicate handlers.

Built-in block runtimes use these events, including cleanup for menu listeners, motion observers/replay listeners and overlay scroll/inert state. Rich additionally cleans up message-scroller observers. Arbitrary third-party scripts should opt in only after implementing and testing this lifecycle.

## Reproducible regression checks

```sh
pnpm build
pnpm check
pnpm test
pnpm test:performance
pnpm test:preview-e2e
pnpm test:editor-e2e
pnpm test:visual
pnpm test:visual:motion
pnpm test:visual:rich
```

Browser tests require Chrome; set `CHROME_BIN` if it is not in a standard location. Set `MDS_PERF_OUTPUT=/absolute/path/result.json` for either performance script to retain results. The render matrix includes ~1/10/100/500 KB Markdown, 500–4,000 interpolations, 3–24 nested slots and a 500-card single-block edit. CI checks deterministic slot invocation counts, bounded cache reuse, a broad interpolation growth guard, and browser behavior. Tight machine-dependent millisecond thresholds are intentionally not used on shared CI hosts.

The browser test covers initial file load, large source replacement, single-character editing, form/tab state, stateful component remounting, overlay removal, message spoof rejection, save fidelity, and repeated mount/unmount DOM/listener growth after GC. It reports beforeinput-to-acknowledged-DOM-update p50/p95 and parent long tasks. Acknowledgement is not actual paint or standard INP. Single-character results include the 120 ms coalescing delay. Five samples describe this run, not production tail latency.

## Reference validation (2026-09-09)

Apple M2 Max, Node 26.5.0, local headless Chrome at 1440 × 1000. This is a local sample, not a cross-device guarantee.

| Browser workload | Whole-document replacement | Single-character preview p50 | Observed p95 | Parent tasks >50 ms during typing |
| --- | ---: | ---: | ---: | ---: |
| markdown-10k | 179.7 ms | 123.6 ms | 126.6 ms | 0 |
| markdown-100k | 298.6 ms | 261.3 ms | 272.3 ms | 0 |
| interpolation-4000 | 226.9 ms | 151.7 ms | 169.2 ms | 0 |

The preview figures include the deliberate 120 ms input-coalescing window. This reduces repeated work during typing; it does not make every isolated key's preview arrive sooner than the old synchronous path. Across local runs, 100 KB preview p50 varied approximately 220–261 ms. The main improvement for ordinary large Markdown is keeping compilation off the editor thread; a changed monolithic Markdown node still needs full parsing.

4,000 interpolations parsed in 1.76 ms p50. Twelve nested slots required exactly 12 block-renderer calls (previously 4,095), with render p50 0.081 ms in the regression fixture. Editing one of 500 cards produced one Markdown cache miss and 499 hits, with output equal to an uncached render.

After eight component mount/unmount cycles, settled post-GC DOM counters were 60 → 60 nodes and 18 → 18 listeners. Finite animation callbacks are allowed to complete before this snapshot; this short run is not a long-duration heap-leak proof.

Validation passed: full workspace build, type checks, all 334 tests, deterministic comparison of 10,000 mixed inline inputs against the previous parser, rendering complexity/cache checks, both Editor browser suites, components and motion across five themes × three viewports, and Rich extensions across three viewports.
