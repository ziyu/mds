export const chatStyles = String.raw`:where(.attachment) {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 0.75rem;
  align-items: center;
  min-width: 0;
  border: 1px solid var(--mds-block-line);
  border-radius: var(--mds-block-radius);
  background: var(--mds-block-surface);
  padding: 0.75rem;
}

:where(.attachment-media) {
  display: grid;
  place-items: center;
  width: 3rem;
  height: 3rem;
  overflow: hidden;
  border-radius: calc(var(--mds-block-radius) * 0.72);
  background: var(--mds-block-soft);
  color: var(--mds-block-accent);
}

:where(.attachment-media img) {
  grid-area: 1 / 1;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

:where(.attachment-media img:not([src])) {
  display: none;
}

:where(.attachment-file) {
  font-size: 1.2rem;
  font-weight: 850;
}

:where(.attachment-content) {
  display: grid;
  gap: 0.18rem;
  min-width: 0;
}

:where(.attachment-title) {
  overflow: hidden;
  color: inherit;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:where(.attachment-description, .attachment-meta) {
  color: var(--mds-block-muted);
  font-size: 0.8rem;
}

:where(.attachment-meta) {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

:where(.attachment-meta > span:empty) {
  display: none;
}

:where(.attachment-meta > span + span:not(:empty))::before {
  content: "·";
  margin-inline-end: 0.35rem;
}

:where(.attachment-description:empty, .attachment-actions:empty) {
  display: none;
}

:where(.attachment-progress) {
  display: none;
  width: 100%;
  height: 0.35rem;
  accent-color: var(--mds-block-accent);
}

:where(.attachment[data-attr-state="uploading"] .attachment-progress, .attachment[data-attr-state="processing"] .attachment-progress) {
  display: block;
}

:where(.attachment[data-attr-state="error"]) {
  border-color: color-mix(in srgb, var(--mds-block-danger), transparent 45%);
}

:where(.bubble) {
  position: relative;
  display: grid;
  gap: 0.35rem;
  width: fit-content;
  max-width: min(80%, 44rem);
}

:where(.bubble[data-attr-align="end"]) {
  margin-inline-start: auto;
}

:where(.bubble-content) {
  border: 1px solid transparent;
  border-radius: calc(var(--mds-block-radius) * 1.25);
  background: var(--mds-block-accent);
  color: var(--mds-block-accent-ink);
  padding: 0.72rem 0.9rem;
}

:where(.bubble[data-attr-variant="secondary"] .bubble-content, .bubble[data-attr-variant="muted"] .bubble-content) {
  background: var(--mds-block-soft);
  color: inherit;
}

:where(.bubble[data-attr-variant="tinted"] .bubble-content) {
  background: var(--mds-block-accent-soft);
  color: inherit;
}

:where(.bubble[data-attr-variant="outline"] .bubble-content) {
  border-color: var(--mds-block-line);
  background: transparent;
  color: inherit;
}

:where(.bubble[data-attr-variant="ghost"]) {
  width: 100%;
  max-width: none;
}

:where(.bubble[data-attr-variant="ghost"] .bubble-content) {
  background: transparent;
  color: inherit;
  padding-inline: 0;
}

:where(.bubble[data-attr-variant="destructive"] .bubble-content) {
  background: var(--mds-block-danger);
  color: #fff;
}

:where(.bubble-content > :first-child, .message-body > :first-child, .marker-content > :first-child) {
  margin-top: 0;
}

:where(.bubble-content > :last-child, .message-body > :last-child, .marker-content > :last-child) {
  margin-bottom: 0;
}

:where(.bubble-reactions) {
  display: flex;
  gap: 0.25rem;
  justify-content: flex-end;
  min-height: 0;
  font-size: 0.82rem;
}

:where(.bubble-reactions:empty) {
  display: none;
}

:where(.marker) {
  display: flex;
  gap: 0.55rem;
  align-items: center;
  justify-content: center;
  color: var(--mds-block-muted);
  font-size: 0.82rem;
  text-align: center;
}

:where(.marker[data-attr-variant="border"]) {
  border: 1px solid var(--mds-block-line);
  border-radius: var(--mds-block-radius);
  background: var(--mds-block-soft);
  padding: 0.55rem 0.75rem;
}

:where(.marker[data-attr-variant="separator"])::before,
:where(.marker[data-attr-variant="separator"])::after {
  content: "";
  flex: 1;
  border-top: 1px solid var(--mds-block-line);
}

:where(.marker-icon:empty) {
  display: none;
}

:where(.message) {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.7rem;
  align-items: end;
}

:where(.message[data-attr-align="end"]) {
  grid-template-columns: minmax(0, 1fr) auto;
}

:where(.message[data-attr-align="end"] .message-avatar) {
  grid-column: 2;
}

:where(.message[data-attr-align="end"] .message-content) {
  grid-column: 1;
  grid-row: 1;
  align-items: end;
}

:where(.message-avatar) {
  width: 2.5rem;
  min-height: 1px;
}

:where(.message-content) {
  display: grid;
  gap: 0.35rem;
  min-width: 0;
}

:where(.message-header, .message-footer) {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  color: var(--mds-block-muted);
  font-size: 0.78rem;
}

:where(.message-header:empty, .message-footer:empty, .message-avatar:empty) {
  display: none;
}

:where(.message-scroller) {
  position: relative;
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--mds-block-line);
  border-radius: var(--mds-block-radius);
  background: var(--mds-block-surface);
  box-shadow: var(--mds-block-shadow);
}

:where(.message-scroller-viewport) {
  max-height: 22rem;
  overflow-y: auto;
  overscroll-behavior: contain;
  scroll-behavior: smooth;
  scrollbar-gutter: stable;
}

:where(.message-scroller-content) {
  display: grid;
  gap: 1rem;
  padding: 1rem;
}

:where(.message-scroller-button) {
  position: absolute;
  right: 0.8rem;
  bottom: 0.8rem;
  border: 1px solid var(--mds-block-line);
  border-radius: 999px;
  background: var(--mds-block-surface);
  color: inherit;
  padding: 0.48rem 0.72rem;
  box-shadow: var(--mds-block-shadow);
  cursor: pointer;
}

:where(.message-scroller-button[hidden]) {
  display: none !important;
}
@media (max-width: 36rem) {
  :where(.bubble) {
    max-width: 92%;
  }
}`;
