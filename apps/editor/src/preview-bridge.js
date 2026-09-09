/* Runs inside the opaque-origin preview, before theme initialization. */
(() => {
  const token = document.currentScript.dataset.previewToken;
  const liveNodes = new WeakMap();
  let previous;
  let revision = 0;
  const children = (node) => Array.from(node.childNodes).filter((child) => !(child instanceof Element && child.tagName === 'SCRIPT'));
  const remember = (source, live) => {
    liveNodes.set(source, live);
    const actual = children(live);
    children(source).forEach((child, index) => remember(child, actual[index]));
  };
  const send = (type, extra = {}) => window.parent.postMessage({ type, token, ...extra }, '*');
  const key = (node) => node instanceof Element ? node.getAttribute('id') || node.getAttribute('data-preview-key') : null;
  const compatible = (a, b) => a.nodeType === b.nodeType && a.nodeName === b.nodeName && key(a) === key(b);
  const enhanced = (node) => node instanceof Element && (
    ['mdsDetails', 'mdsToggle', 'mdsOverlay', 'mdsMotion', 'mdsTabs', 'mdsAccordion', 'mdsCarousel', 'mdsCalendar', 'mdsCommand', 'mdsMenubar', 'mdsFloatingMenu', 'mdsContextMenu', 'mdsDataTable', 'mdsMessageScroller', 'mdsValidation'].some((name) => node.dataset[name] === 'true')
  );
  const unmount = (source) => {
    const live = liveNodes.get(source);
    if (!live) return;
    document.dispatchEvent(new CustomEvent('mds:preview-unmount', { detail: { root: live } }));
    // Overlays may have been portaled to body by the runtime.
    const removePortals = (node) => {
      for (const child of children(node)) {
        const actual = liveNodes.get(child);
        if (actual && !live.contains(actual)) {
          document.dispatchEvent(new CustomEvent('mds:preview-unmount', { detail: { root: actual } }));
          actual.remove();
        }
        removePortals(child);
      }
    };
    removePortals(source);
    live.remove();
  };
  const controls = (root) => root instanceof Element ? [root, ...root.querySelectorAll('input, textarea, select')].filter((node) => node.matches('input, textarea, select')) : [];
  const preserveControls = (oldRoot, newRoot) => {
    const fields = controls(oldRoot);
    const next = controls(newRoot);
    let focus;
    fields.forEach((old, index) => {
      const field = next.find((candidate) => old.id ? candidate.id === old.id : old.name && candidate.name === old.name && candidate.type === old.type) ?? next[index];
      if (!field || field.tagName !== old.tagName || field.type !== old.type || field.name !== old.name || field.id !== old.id) return;
      if (field.type === 'file') return;
      if (old instanceof HTMLSelectElement) {
        if (old.innerHTML === field.innerHTML) Array.from(field.options).forEach((option, i) => { option.selected = old.options[i].selected; });
      } else if (old.defaultValue === field.defaultValue) {
        field.value = old.value;
        if (old.defaultChecked === field.defaultChecked) field.checked = old.checked;
      }
      if (document.activeElement === old) {
        focus = () => {
          field.focus({ preventScroll: true });
          if (typeof old.selectionStart === 'number') field.setSelectionRange(old.selectionStart, old.selectionEnd, old.selectionDirection);
        };
      }
    });
    return focus;
  };
  const patch = (old, next) => {
    const live = liveNodes.get(old);
    if (!live) throw new Error('Preview node mapping was lost.');
    if (old.isEqualNode(next)) { rememberUnchanged(old, next); return live; }
    if (!compatible(old, next) || enhanced(live)) {
      const replacement = next.cloneNode(true);
      const restoreFocus = preserveControls(live, replacement);
      remember(next, replacement);
      live.before(replacement);
      unmount(old);
      restoreFocus?.();
      return replacement;
    }
    liveNodes.set(next, live);
    if (!(next instanceof Element)) {
      live.nodeValue = next.nodeValue;
      return live;
    }
    // Apply only source changes: keep runtime-owned attributes and user state.
    for (const attr of old.attributes) if (!next.hasAttribute(attr.name)) live.removeAttribute(attr.name);
    for (const attr of next.attributes) if (old.getAttribute(attr.name) !== attr.value) live.setAttribute(attr.name, attr.value);
    if (next instanceof HTMLInputElement) {
      if (old.getAttribute('value') !== next.getAttribute('value')) live.value = next.value;
      if (old.hasAttribute('checked') !== next.hasAttribute('checked')) live.checked = next.checked;
    }
    if (next instanceof HTMLTextAreaElement && old.textContent !== next.textContent) live.value = next.value;
    const changedSelection = next instanceof HTMLSelectElement &&
      Array.from(old.options).filter(option => option.selected).map(option => option.value).join('\0') !==
      Array.from(next.options).filter(option => option.selected).map(option => option.value).join('\0');
    patchChildren(old, next, live);
    if (changedSelection) Array.from(live.options).forEach((option, index) => { option.selected = next.options[index]?.selected ?? false; });
    return live;
  };
  const rememberUnchanged = (old, next) => {
    liveNodes.set(next, liveNodes.get(old));
    const previousChildren = children(old);
    children(next).forEach((child, index) => rememberUnchanged(previousChildren[index], child));
  };
  const patchChildren = (old, next, parent) => {
    const oldChildren = children(old);
    const nextChildren = children(next);
    const unused = new Set(oldChildren);
    const keyed = new Map(oldChildren.filter(key).map((node) => [key(node), node]));
    let cursor = null;
    nextChildren.forEach((child, index) => {
      let match = key(child) ? keyed.get(key(child)) : oldChildren[index];
      if (!unused.has(match) || !compatible(match, child)) match = undefined;
      let actual;
      if (match) {
        unused.delete(match);
        actual = patch(match, child);
      } else {
        actual = child.cloneNode(true);
        remember(child, actual);
      }
      // Keep runtime portals in place; reorder only nodes belonging to this parent.
      if (!actual.parentNode || actual.parentNode === parent) {
        const before = cursor ? cursor.nextSibling : parent.firstChild;
        if (actual !== before) parent.insertBefore(actual, before);
        cursor = actual;
      }
    });
    unused.forEach(unmount);
  };
  document.addEventListener('DOMContentLoaded', () => {
    previous = document.body.cloneNode(true);
    remember(previous, document.body);
    send('mds-preview-ready');
  }, { once: true });
  window.addEventListener('message', (event) => {
    const data = event.data;
    if (event.source !== window.parent || !data || data.token !== token || data.type !== 'mds-preview-update' || !Number.isSafeInteger(data.revision) || data.revision <= revision || typeof data.body !== 'string' || !previous) return;
    try {
      const next = new DOMParser().parseFromString('<!doctype html><body>' + data.body + '</body>', 'text/html').body;
      const scroll = [window.scrollX, window.scrollY];
      const active = document.activeElement;
      patchChildren(previous, next, document.body);
      previous = next;
      document.dispatchEvent(new CustomEvent('mds:preview-update'));
      if (active instanceof HTMLElement && active.isConnected && document.activeElement !== active) active.focus({ preventScroll: true });
      window.scrollTo(...scroll);
      revision = data.revision;
      send('mds-preview-updated', { revision });
    } catch (error) {
      send('mds-preview-reload');
    }
  });
})();
