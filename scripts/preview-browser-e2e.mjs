import assert from 'node:assert/strict';
import { mkdtemp, realpath, writeFile, readFile, rm, mkdir, cp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { CdpClient, startEditor, readEditorStartup, resolveChromeExecutable, launchChromeWithRetries, waitForExit, evaluate, waitForExpression, replaceEditorText } from './editor-browser-e2e.mjs';

const project = await realpath(await mkdtemp(join(tmpdir(), 'mds-preview-e2e-')));
let server, chrome, client;
const rows = [];
try {
  const richPackage = join(project, 'node_modules/@test/mds-theme-rich');
  await mkdir(richPackage, { recursive: true });
  await cp(resolve('themes/rich/dist/theme'), join(richPackage, 'dist/theme'), { recursive: true });
  await writeFile(join(richPackage, 'package.json'), JSON.stringify({ name: '@test/mds-theme-rich', mdsTheme: { dist: './dist/theme' } }));
  await writeFile(join(project, 'package.json'), JSON.stringify({ private: true, dependencies: { '@test/mds-theme-rich': '1.0.0' } }));
  const source = `::: page
::: card intro
# Preview test
Hello original
:::
::: form contact
? email 邮箱 邮箱地址
:::
::: tabs samples
--- One
First panel
--- Two
Second panel
:::
::: dialog modal
--- body
Dialog body
:::
:: button label="Open" action="open" target="modal"
:::
`;
  const input = join(project, 'page.mds');
  await writeFile(input, source);
  server = startEditor(resolve('packages/cli/dist/index.js'), input);
  const editor = await readEditorStartup(server, 15000);
  const launched = await launchChromeWithRetries(await resolveChromeExecutable(), project);
  chrome = launched.child;
  client = await CdpClient.connect(launched.devToolsUrl);
  const { targetId } = await client.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await client.send('Target.attachToTarget', { targetId, flatten: true });
  await client.send('Page.enable', {}, sessionId);
  await client.send('Runtime.enable', {}, sessionId);
  await client.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false }, sessionId);
  await client.send('Page.navigate', { url: editor.url }, sessionId);
  const main = (expression) => evaluate(client, sessionId, expression);
  const ready = () => waitForExpression(client, sessionId, `document.querySelector('.preview-frame')?.getAttribute('aria-busy') === 'false' && [...document.querySelectorAll('button')].find(b => b.textContent === 'Export')?.disabled === false`);
  await ready().catch(async (error) => { console.error(await main(`document.body.innerText`)); throw error; });
  await waitForExpression(client, sessionId, `document.querySelector('iframe')?.srcdoc.includes('Hello original') === true && document.querySelector('iframe')?.dataset.previewReady === 'true'`);
  let frameSession = sessionId;
  let contextId;
  const frameContext = async () => {
    const { frameTree } = await client.send('Page.getFrameTree', {}, sessionId);
    const frameId = frameTree.childFrames?.[0]?.frame.id;
    try {
      contextId = (await client.send('Page.createIsolatedWorld', { frameId, worldName: 'mds-preview-test' }, sessionId)).executionContextId;
      frameSession = sessionId;
    } catch {
      const { targetInfos } = await client.send('Target.getTargets');
      const target = targetInfos.find(t => t.type === 'iframe' && t.url === 'about:srcdoc');
      assert(target, 'preview iframe target exists');
      frameSession = (await client.send('Target.attachToTarget', { targetId: target.targetId, flatten: true })).sessionId;
      contextId = undefined;
    }
  };
  await frameContext();
  const frame = async (expression) => {
    const result = await client.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, ...(contextId ? { contextId } : {}) }, frameSession);
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text + ': ' + result.exceptionDetails.exception?.description);
    return result.result.value;
  };
  const patchReady = async (previous) => {
    await ready();
    await waitForExpression(client, sessionId, `Number(document.querySelector('iframe').dataset.previewRevision) > ${previous}`).catch(async error => { console.error(await main(`({text: document.querySelector('.cm-content').innerText.slice(0, 400), ready: document.querySelector('iframe').dataset, diagnostics: document.querySelector('.diagnostics-pane')?.innerText})`)); throw error; });
  };
  await frame(`window.__preserved = 42; document.querySelector('input').value = 'kept@example.com'; document.querySelectorAll('[role="tab"]')[1].click();`);
  const oldSrcdoc = await main(`document.querySelector('iframe').srcdoc`);
  let revision = await main(`Number(document.querySelector('iframe').dataset.previewRevision)`);
  await replaceEditorText(client, sessionId, source.replace('Hello original', 'Hello changed'));
  await patchReady(revision);
  assert.equal(await main(`document.querySelector('iframe').srcdoc`), oldSrcdoc, 'same-theme edits must not reload srcdoc');
  assert.equal(await frame('window.__preserved'), 42);
  assert.equal(await frame(`document.querySelector('input').value`), 'kept@example.com');
  assert.equal(await frame(`document.querySelectorAll('[role="tab"]')[1].getAttribute('aria-selected')`), 'true');
  assert.equal(await frame(`document.body.textContent.includes('Hello changed')`), true);
  assert.equal(await main(`document.querySelector('iframe').sandbox.contains('allow-same-origin')`), false);
  // Spoofed messages cannot mutate the preview even when the source is the parent.
  await main(`document.querySelector('iframe').contentWindow.postMessage({ type: 'mds-preview-update', token: 'wrong', revision: 9999, body: 'SPOOFED' }, '*')`);
  assert.equal(await frame(`document.body.textContent.includes('SPOOFED')`), false);

  // Changed interactive roots remount once; unchanged roots retain state.
  revision = await main(`Number(document.querySelector('iframe').dataset.previewRevision)`);
  await replaceEditorText(client, sessionId, source.replace('First panel', 'Updated panel'));
  await patchReady(revision);
  assert.equal(await frame(`document.querySelectorAll('[role="tab"]').length`), 2);
  await frame(`document.querySelectorAll('[role="tab"]')[1].click()`);
  assert.equal(await frame(`document.querySelectorAll('[role="tab"]')[1].getAttribute('aria-selected')`), 'true');
  assert.equal(await frame(`document.querySelector('input').value`), 'kept@example.com');

  // Portaled overlays must be cleaned up, including body inert/scroll state.
  await frame(`document.querySelector('[data-action="open"]').click()`);
  assert.equal(await frame(`document.getElementById('modal').hidden`), false);
  await frame(`new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))`);
  revision = await main(`Number(document.querySelector('iframe').dataset.previewRevision)`);
  await replaceEditorText(client, sessionId, '::: page\n# Only content\n:::');
  await patchReady(revision);
  assert.equal(await frame(`document.getElementById('modal') === null`), true);
  assert.equal(await frame(`document.querySelectorAll('[inert]').length`), 0);

  // Repeated mount/unmount cycles must not accumulate global listeners or DOM.
  const leak = `::: page\n::: dropdown menu\n--- trigger\nMenu\n--- content\n:: menu-item label="Item"\n:::\n::: motion moving once=false\nMotion\n:::\n:::`;
  await client.send('HeapProfiler.collectGarbage', {}, frameSession);
  const before = await client.send('Memory.getDOMCounters', {}, frameSession);
  for (let i = 0; i < 8; i++) {
    revision = await main(`Number(document.querySelector('iframe').dataset.previewRevision)`);
    await replaceEditorText(client, sessionId, leak);
    await patchReady(revision);
    revision = await main(`Number(document.querySelector('iframe').dataset.previewRevision)`);
    await replaceEditorText(client, sessionId, '::: page\n# Only content\n:::');
    await patchReady(revision);
  }
  // Let finite mount animation callbacks retire before measuring retained nodes.
  await frame(`new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve))))`);
  await client.send('HeapProfiler.collectGarbage', {}, frameSession);
  const after = await client.send('Memory.getDOMCounters', {}, frameSession);
  assert(after.jsEventListeners <= before.jsEventListeners + 10, `listener growth: ${JSON.stringify({ before, after })}`);
  assert(after.nodes <= before.nodes + 100, `DOM growth: ${JSON.stringify({ before, after })}`);
  console.log('Preview correctness passed: Worker, stable iframe, forms, tabs, remount, portals, spoof rejection, bounded listeners/DOM.');

  // Measure beforeinput -> acknowledged DOM patch, separate from actual paint/INP.
  await main(`(() => {
    window.__samples = []; window.__tasks = [];
    new PerformanceObserver(list => window.__tasks.push(...list.getEntries().map(e => ({ start: e.startTime, duration: e.duration })))).observe({ type: 'longtask' });
    document.addEventListener('beforeinput', () => { window.__start = performance.now(); }, true);
    window.addEventListener('message', e => {
      if (e.source === document.querySelector('iframe').contentWindow && e.data?.type === 'mds-preview-updated') window.__samples.push({ start: window.__start, end: performance.now() });
    });
  })()`);
  const paragraph = '## Heading\n\nA paragraph with **bold**, *emphasis* and [a link](https://example.com). Additional words for documentation.\n\n';
  const workloads = [
    ['markdown-10k', paragraph.repeat(Math.ceil(10000 / paragraph.length))],
    ['markdown-100k', paragraph.repeat(Math.ceil(100000 / paragraph.length))],
    ['interpolation-4000', '@state name MDS\n\n' + 'Hello {{ name }}\n'.repeat(4000)]
  ];
  for (const [name, text] of workloads) {
    revision = await main(`Number(document.querySelector('iframe').dataset.previewRevision)`);
    const replacementStart = performance.now();
    await replaceEditorText(client, sessionId, text);
    await patchReady(revision);
    const replacementMs = performance.now() - replacementStart;
    await main(`window.__samples = []; window.__tasks = [];`);
    for (let i = 0; i < 5; i++) {
      await client.send('Input.insertText', { text: 'x' }, sessionId);
      await waitForExpression(client, sessionId, `window.__samples.length >= ${i + 1}`);
    }
    await main(`[...document.querySelectorAll('button')].find(b => b.textContent === 'Save').click()`);
    await waitForExpression(client, sessionId, `document.querySelector('.file-state')?.textContent === 'Saved'`);
    assert.equal(await readFile(input, 'utf8'), text + 'xxxxx', 'large replacement and subsequent typing must preserve every character');
    const stats = await main(`({ samples: window.__samples.map(s => s.end - s.start), longestTask: Math.max(0, ...window.__tasks.map(t => t.duration)) })`);
    stats.samples.sort((a, b) => a - b);
    const row = { name, replacementMs, previewP50: stats.samples[2], previewP95: stats.samples[4], longestParentTask: stats.longestTask };
    rows.push(row);
    console.log(JSON.stringify(row));
  }
  const richSource = `---
theme: @test/mds-theme-rich
---
::: page
# Rich preview
::: data-table label="Rows" filter="Search" page-size=1 selectable
--- columns
:: data-column key="name" label="Name" sortable
--- rows
::: data-row
::: data-cell column="name"
Alice
:::
:::
::: data-row
::: data-cell column="name"
Bob
:::
:::
:::
::: message-scroller height="12rem"
::: message
Original message
:::
:::
:::
`;
  console.log('Checking Rich theme and recovery...');
  await replaceEditorText(client, sessionId, richSource);
  await ready();
  await waitForExpression(client, sessionId, `document.querySelector('iframe').srcdoc.includes('setupDataTables') && document.querySelector('iframe').dataset.previewReady === 'true'`);
  await frameContext();
  await frame(`document.querySelector('.data-table-filter-input').value = 'Bob'; document.querySelector('.data-table-filter-input').dispatchEvent(new Event('input'));`);
  revision = await main(`Number(document.querySelector('iframe').dataset.previewRevision)`);
  await replaceEditorText(client, sessionId, richSource.replace('Original message', 'Updated message'));
  await patchReady(revision);
  assert.equal(await frame(`document.querySelector('.data-table-filter-input').value`), 'Bob');
  assert.equal(await frame(`document.querySelector('.message-scroller').textContent.includes('Updated message')`), true);
  assert.equal(await frame(`document.querySelectorAll('.data-table-sort').length`), 1);
  // A parser budget error must be visible and the next valid edit must recover.
  console.log('Checking parser limit recovery...');
  await replaceEditorText(client, sessionId, '::: card\n'.repeat(500));
  await waitForExpression(client, sessionId, `document.body.innerText.includes('maxDepth')`);
  await replaceEditorText(client, sessionId, '# Recovered');
  await ready();
  await main(`[...document.querySelectorAll('button')].find(b => b.textContent === 'Save').click()`);
  await waitForExpression(client, sessionId, `document.querySelector('.file-state')?.textContent === 'Saved'`);
  // Synchronous Worker construction failures must report a diagnostic, not spin forever.
  await client.send('Page.addScriptToEvaluateOnNewDocument', { source: `window.Worker = class { constructor() { throw new Error('Worker startup deliberately blocked'); } };` }, sessionId);
  await client.send('Page.reload', {}, sessionId);
  await waitForExpression(client, sessionId, `document.body.innerText.includes('Worker startup deliberately blocked') && document.querySelector('.preview-frame')?.getAttribute('aria-busy') === 'false'`);
  console.log('Additional preview checks passed: Rich lifecycle, theme switch, budget-error recovery, synchronous Worker failure.');
  if (process.env.MDS_PERF_OUTPUT) await writeFile(process.env.MDS_PERF_OUTPUT, JSON.stringify({ rows, memory: { before, after } }, null, 2));
} finally {
  client?.close();
  if (chrome) { chrome.kill('SIGKILL'); await waitForExit(chrome, 2000, true); }
  if (server) { server.kill('SIGTERM'); await waitForExit(server, 5000, true); }
  await rm(project, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
