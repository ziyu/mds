import { spawn } from "node:child_process";
import { access, mkdir, rm, stat, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";
import { parseMds } from "../packages/parser/src/index.js";
import { renderHtmlResult } from "../packages/renderer-html/src/index.js";
import { buildPackageTheme } from "../packages/theme-builder/src/index.js";
import { loadThemeDirectory } from "../packages/theme-loader/src/index.js";
import { examples } from "../apps/editor/src/examples.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = join(root, ".tmp/visual-smoke");
const themeNames = ["default", "canvas", "rich", "light", "dark"] as const;
const richExample = {
  id: "rich",
  label: "Rich extensions",
  source: `---
title: Rich Theme Extensions
description: Browser fixture for Rich-owned data and conversation behavior.
---

::: page
::: section
## Release data

::: data-table label="Releases" filter="Filter releases" page-size=1 selectable
--- columns
:: data-column key="package" label="Package" sortable
:: data-column key="version" label="Version" sortable

--- rows
::: data-row
::: data-cell column="package"
@mds-crate/blocks
:::
::: data-cell column="version"
0.2.0
:::
:::
::: data-row
::: data-cell column="package"
@mds-crate/theme-rich
:::
::: data-cell column="version"
0.1.0
:::
:::
:::
:::

::: section
## Conversation

::: message-scroller label="Conversation" follow=true height="12rem"
::: message sender="MDS" status="Delivered"
--- body
::: bubble variant="secondary"
All checks passed.
:::
:::
::: message sender="Release bot" status="Delivered"
--- body
The artifact is ready.
:::
:::
:::
:::
`
} as const;
const visualExamples = [...examples, richExample];
const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 820, height: 1000 },
  { name: "desktop", width: 1440, height: 1000 }
] as const;

interface VisualSmokeArtifact {
  example: string;
  theme: string;
  viewport: string;
  width: number;
  height: number;
  html: string;
  screenshot?: string;
  screenshotBytes?: number;
  innerWidth?: number;
  scrollWidth?: number;
}

interface LayoutMetrics {
  innerWidth: number;
  innerHeight: number;
  scrollWidth: number;
  scrollHeight: number;
  overflowElements: Array<{ selector: string; left: number; right: number; width: number }>;
  overflowingContents: Array<{ selector: string; clientWidth: number; scrollWidth: number; overflowX: string }>;
}

interface CommandMetrics {
  enhanced: boolean;
  filters: boolean;
  restores: boolean;
}

interface SharedEnhancementMetrics {
  calendar: boolean;
  dropdownFloating: boolean;
  dropdownItemsFit: boolean;
  contextMenu: boolean;
  contextMenuEnhanced: boolean;
  contextMenuOpen: boolean;
  contextMenuPositioned: boolean;
  contextMenuLeftFits: boolean;
  contextMenuRightFits: boolean;
  contextMenuTopFits: boolean;
  contextMenuBottomFits: boolean;
  contextMenuFloating: boolean;
  contextMenuItemsFit: boolean;
  menubar: boolean;
  menubarFloating: boolean;
  menubarItemsFit: boolean;
}

interface PortableInteractionMetrics {
  tabs: boolean;
  tabsInitialized: boolean;
  tabsHasSourcePanels: boolean;
  tabsRelationships: boolean;
  tabsKeyboard: boolean;
  tabsSelection: boolean;
  tabsVisibility: boolean;
  accordion: boolean;
  detailsToggle: boolean;
  inputGroupOrder: boolean;
  commandActions: boolean;
  dialogClass: boolean;
  dialogAria: boolean;
  dialogBodyLock: boolean;
  dialogFocus: boolean;
  dialogCoversViewport: boolean;
  dialogBackgroundInert: boolean;
  dialogStateClosed: boolean;
  dialogAriaClosed: boolean;
  dialogBodyUnlocked: boolean;
  dialogFocusRestored: boolean;
  drawerOpen: boolean;
  drawerCoversViewport: boolean;
  drawerBackgroundInert: boolean;
  drawerStateClosed: boolean;
  drawerAriaClosed: boolean;
  drawerBodyUnlocked: boolean;
  drawerFocusRestored: boolean;
}

interface CanvasOverlayMetrics {
  dialogPortaled: boolean;
  dialogPanelTopmost: boolean;
  dialogPointerShield: boolean;
  dialogBackgroundInert: boolean;
  dialogBackdropClose: boolean;
  dialogRestoresBackground: boolean;
  drawerPortaled: boolean;
  drawerPanelTopmost: boolean;
  drawerPointerShield: boolean;
  drawerBackgroundInert: boolean;
  drawerBackdropClose: boolean;
  drawerRestoresBackground: boolean;
}

interface MotionEnhancementMetrics {
  normalBlockAttrs: boolean;
  revealPreset: boolean;
  scenePreset: boolean;
  staggerConfigured: boolean;
  entersViewport: boolean;
  staggerCompletes: boolean;
  replays: boolean;
}

interface RichEnhancementMetrics {
  dataTableEnhanced: boolean;
  dataTableFilters: boolean;
  dataTableRestores: boolean;
  dataTablePaginates: boolean;
  dataTableSelects: boolean;
  messageScrollerEnhanced: boolean;
  messageScrollerHeight: boolean;
}

interface ActionStyleMetrics {
  actionExists: boolean;
  actionVisible: boolean;
  actionContrast: boolean;
  actionUsesControlGeometry: boolean;
  drawerExists: boolean;
  drawerOpen: boolean;
  drawerUsesSidePanelGeometry: boolean;
  drawerWidth: number;
  display: string;
  width: number;
  height: number;
  viewportWidth: number;
}

async function main(): Promise<void> {
  const htmlOnly = process.argv.includes("--html-only");
  const requestedTheme = process.argv.find((argument) => argument.startsWith("--theme="))?.slice("--theme=".length);
  const requestedExample = process.argv.find((argument) => argument.startsWith("--example="))?.slice("--example=".length) ?? "components";
  const selectedThemes =
    requestedTheme === undefined
      ? [...themeNames]
      : themeNames.filter((themeName) => themeName === requestedTheme);
  if (selectedThemes.length === 0) {
    throw new Error(`Unknown visual smoke theme: ${requestedTheme}. Expected one of ${themeNames.join(", ")}.`);
  }
  const chrome = htmlOnly ? undefined : await resolveChromeExecutable();
  const selectedExample = visualExamples.find((example) => example.id === requestedExample);
  if (selectedExample === undefined) {
    throw new Error(`Unknown editor example: ${requestedExample}.`);
  }

  await mkdir(outputDirectory, { recursive: true });
  const artifacts: VisualSmokeArtifact[] = [];

  for (const themeName of selectedThemes) {
    const themeDirectory = join(root, "themes", themeName);
    const themeOutput = join(outputDirectory, selectedExample.id, themeName);
    await rm(themeOutput, { recursive: true, force: true });
    const build = await buildPackageTheme(themeDirectory);
    const theme = await loadThemeDirectory(build.outputDirectory);
    const rendered = renderHtmlResult(parseMds(selectedExample.source, { filePath: `examples/${selectedExample.id}.mds` }), {
      theme
    });
    const allowedDiagnostics = rendered.diagnostics.filter(
      (diagnostic) => selectedExample.id === "actions" && diagnostic.code === "missing-action-handler"
    );
    const unexpectedDiagnostics = rendered.diagnostics.filter((diagnostic) => !allowedDiagnostics.includes(diagnostic));
    if (unexpectedDiagnostics.length > 0) {
      throw new Error(
        `${themeName} ${selectedExample.label} render produced diagnostics:\n${rendered.diagnostics
          .map((diagnostic) => `${diagnostic.severity} ${diagnostic.code}: ${diagnostic.message}`)
          .join("\n")}`
      );
    }
    if (selectedExample.id === "actions" && allowedDiagnostics.length !== 2) {
      throw new Error(
        `${themeName} Actions expected exactly 2 missing-action-handler warnings, got ${allowedDiagnostics.length}.`
      );
    }

    const htmlPath = join(themeOutput, `${selectedExample.id}.html`);
    await mkdir(themeOutput, { recursive: true });
    await writeFile(htmlPath, rendered.html, "utf8");

    for (const viewport of viewports) {
      const artifact: VisualSmokeArtifact = {
        example: selectedExample.id,
        theme: themeName,
        viewport: viewport.name,
        width: viewport.width,
        height: viewport.height,
        html: relativeArtifactPath(htmlPath)
      };

      if (chrome !== undefined) {
        const screenshotPath = join(themeOutput, `${selectedExample.id}-${viewport.name}.png`);
        const layout = await captureScreenshot(
          chrome,
          htmlPath,
          screenshotPath,
          viewport.width,
          viewport.height,
          themeName,
          selectedExample.id === "components",
          selectedExample.id === "motion",
          selectedExample.id === "rich",
          themeName === "rich" && selectedExample.id === "actions"
        );
        const screenshotStat = await stat(screenshotPath);
        if (screenshotStat.size === 0) {
          throw new Error(`Chrome produced an empty screenshot: ${screenshotPath}`);
        }
        artifact.screenshot = relativeArtifactPath(screenshotPath);
        artifact.screenshotBytes = screenshotStat.size;
        artifact.innerWidth = layout.innerWidth;
        artifact.scrollWidth = layout.scrollWidth;
      }

      artifacts.push(artifact);
    }
  }

  const manifestPath =
    selectedThemes.length === themeNames.length
      ? join(outputDirectory, selectedExample.id, "manifest.json")
      : join(outputDirectory, selectedExample.id, selectedThemes[0]!, "manifest.json");
  await writeFile(
    manifestPath,
    `${JSON.stringify(
      {
        example: selectedExample.id,
        generatedAt: new Date().toISOString(),
        chrome: chrome ?? null,
        artifacts
      },
      null,
      2
    )}\n`,
    "utf8"
  );
  console.log(`Visual smoke passed: ${selectedExample.id}, ${selectedThemes.length} themes x ${viewports.length} viewports.`);
  console.log(`Artifacts: ${outputDirectory}`);
}

async function resolveChromeExecutable(): Promise<string> {
  const candidates = [
    process.env.CHROME_BIN,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser"
  ].filter((candidate): candidate is string => candidate !== undefined && candidate.length > 0);

  for (const candidate of candidates) {
    try {
      await access(candidate, constants.X_OK);
      return candidate;
    } catch {
      // Try the next platform-specific location.
    }
  }

  throw new Error("Chrome was not found. Set CHROME_BIN or run `pnpm test:visual -- --html-only`.");
}

async function captureScreenshot(
  chrome: string,
  htmlPath: string,
  screenshotPath: string,
  width: number,
  height: number,
  themeName: (typeof themeNames)[number],
  verifyEnhancements: boolean,
  verifyMotion: boolean,
  verifyRichExtensions: boolean,
  verifyActionStyles: boolean
): Promise<LayoutMetrics> {
  const profileDirectory = `${screenshotPath}.chrome-profile`;
  await rm(profileDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  const child = spawn(
    chrome,
    [
      "--headless=new",
      "--disable-gpu",
      "--disable-background-networking",
      "--disable-component-update",
      "--hide-scrollbars",
      "--no-first-run",
      "--no-default-browser-check",
      "--allow-file-access-from-files",
      "--remote-debugging-port=0",
      `--user-data-dir=${profileDirectory}`
    ],
    { stdio: ["ignore", "ignore", "pipe"] }
  );
  let client: CdpClient | undefined;
  let removeRuntimeErrorListener: (() => void) | undefined;
  const runtimeErrors: string[] = [];

  try {
    client = await CdpClient.connect(await waitForDevToolsUrl(child, 30_000));
    const target = await client.send<{ targetId: string }>("Target.createTarget", { url: "about:blank" });
    const attached = await client.send<{ sessionId: string }>("Target.attachToTarget", {
      targetId: target.targetId,
      flatten: true
    });
    const sessionId = attached.sessionId;
    await client.send(
      "Emulation.setDeviceMetricsOverride",
      {
        width,
        height,
        deviceScaleFactor: 1,
        mobile: false,
        screenWidth: width,
        screenHeight: height
      },
      sessionId
    );
    const initialState = await client.send<{ result: { value: { scrollX: number; scrollY: number; focusIsBody: boolean } } }>(
      "Runtime.evaluate",
      {
        expression: "({scrollX,scrollY,focusIsBody:document.activeElement===document.body})",
        returnByValue: true
      },
      sessionId
    );
    if (initialState.result.value.scrollX !== 0 || initialState.result.value.scrollY !== 0 || !initialState.result.value.focusIsBody) {
      throw new Error(`Unexpected initial navigation state for ${screenshotPath}: ${JSON.stringify(initialState.result.value)}.`);
    }
    await client.send("Page.enable", {}, sessionId);
    await client.send("Runtime.enable", {}, sessionId);
    removeRuntimeErrorListener = client.onEvent((message) => {
      if (message.sessionId !== sessionId) {
        return;
      }
      if (message.method === "Runtime.exceptionThrown") {
        const details = (message.params as { exceptionDetails?: { text?: string; exception?: { description?: string } } } | undefined)
          ?.exceptionDetails;
        runtimeErrors.push(details?.exception?.description ?? details?.text ?? "Uncaught browser exception");
      }
      if (message.method === "Runtime.consoleAPICalled") {
        const params = message.params as
          | { type?: string; args?: Array<{ value?: unknown; description?: string }> }
          | undefined;
        if (params?.type === "error") {
          runtimeErrors.push(
            params.args?.map((argument) => String(argument.value ?? argument.description ?? "")).join(" ") ||
              "Browser console error"
          );
        }
      }
    });
    const domReady = client.waitForEvent("Page.domContentEventFired", sessionId, 15_000);
    await client.send("Page.navigate", { url: pathToFileURL(htmlPath).href }, sessionId);
    await domReady;
    await client.send(
      "Runtime.evaluate",
      {
        expression: "new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))",
        awaitPromise: true
      },
      sessionId
    );
    if (verifyEnhancements) {
      const commandEvaluated = await client.send<{ result: { value: CommandMetrics } }>(
      "Runtime.evaluate",
      {
        expression: `(() => {
          const command = document.querySelector('section.command');
          const search = command?.querySelector('.command-search');
          const input = command?.querySelector('.command-input');
          const empty = command?.querySelector('.command-empty');
          const items = command === null ? [] : [...command.querySelectorAll('.menu-item')];
          if (!(search instanceof HTMLElement) || !(input instanceof HTMLInputElement) || !(empty instanceof HTMLElement) || items.length === 0) {
            return { enhanced: false, filters: false, restores: false };
          }
          const enhanced = command.classList.contains('is-enhanced') && !search.hidden;
          input.value = '__mds_no_matching_command__';
          input.dispatchEvent(new Event('input', { bubbles: true }));
          const filters = items.every((item) => item.hidden) && !empty.hidden;
          input.value = '';
          input.dispatchEvent(new Event('input', { bubbles: true }));
          const restores = items.every((item) => !item.hidden) && empty.hidden;
          return { enhanced, filters, restores };
        })()`,
        returnByValue: true
      },
      sessionId
    );
      const command = commandEvaluated.result.value;
      if (!command.enhanced || !command.filters || !command.restores) {
        throw new Error(
          `Command enhancement failed for ${screenshotPath}: ${JSON.stringify(command)}.`
        );
      }
      const remainingEvaluated = await client.send<{ result: { value: SharedEnhancementMetrics } }>(
      "Runtime.evaluate",
      {
        expression: `(async () => {
          const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
          const insideViewport = (rect) => rect.left >= -1 && rect.right <= innerWidth + 1 && rect.top >= -1 && rect.bottom <= innerHeight + 1;
          const enforceRichMenuLayout = ${themeName === "rich" ? "true" : "false"};
          const menuItemsFit = (content) => {
            if (!(content instanceof HTMLElement)) return false;
            const contentRect = content.getBoundingClientRect();
            const labels = [...content.querySelectorAll('.menu-item-label')];
            return contentRect.width >= Math.min(240, innerWidth - 16) - 1 && labels.length > 0 && labels.every((label) => {
              if (!(label instanceof HTMLElement)) return false;
              const style = getComputedStyle(label);
              const lineHeight = Number.parseFloat(style.lineHeight) || Number.parseFloat(style.fontSize) * 1.2;
              return style.whiteSpace === 'nowrap' && style.overflowWrap !== 'anywhere' &&
                label.getBoundingClientRect().height <= lineHeight * 1.5;
            });
          };
          document.documentElement.style.scrollBehavior = 'auto';

          const calendarRoot = document.querySelector('.calendar');
          const calendarNative = calendarRoot?.querySelector('.calendar-native');
          const calendarTarget = [...(calendarRoot?.querySelectorAll('.calendar-day') ?? [])]
            .find((button) => !button.disabled && button.dataset.outside === 'false' && button.getAttribute('aria-selected') !== 'true');
          const calendarBefore = calendarRoot?.getAttribute('data-value');
          calendarTarget?.click();
          const calendar = calendarRoot instanceof HTMLElement &&
            calendarRoot.classList.contains('is-enhanced') &&
            calendarNative instanceof HTMLElement && calendarNative.hidden &&
            calendarTarget instanceof HTMLButtonElement &&
            calendarRoot.getAttribute('data-value') !== calendarBefore;

          const standaloneDropdown = [...document.querySelectorAll('.dropdown-menu')]
            .find((menu) => menu.closest('.menubar') === null);
          const standaloneTrigger = standaloneDropdown?.querySelector(':scope > summary');
          const standaloneContent = standaloneDropdown?.querySelector(':scope > .dropdown-menu-content');
          standaloneDropdown?.scrollIntoView({ block: 'center' });
          if (standaloneDropdown instanceof HTMLDetailsElement) standaloneDropdown.open = true;
          await nextFrame();
          await nextFrame();
          const standaloneRootRect = standaloneDropdown?.getBoundingClientRect();
          const standaloneTriggerRect = standaloneTrigger?.getBoundingClientRect();
          const standaloneContentRect = standaloneContent?.getBoundingClientRect();
          const dropdownFloating = standaloneDropdown instanceof HTMLDetailsElement &&
            standaloneTrigger instanceof HTMLElement && standaloneContent instanceof HTMLElement &&
            standaloneRootRect !== undefined && standaloneTriggerRect !== undefined && standaloneContentRect !== undefined &&
            getComputedStyle(standaloneContent).position === 'absolute' &&
            standaloneRootRect.height <= standaloneTriggerRect.height + 4 &&
            standaloneContentRect.width <= Math.min(374, innerWidth - 8) + 1 &&
            insideViewport(standaloneContentRect);
          const dropdownItemsFit = !enforceRichMenuLayout || menuItemsFit(standaloneContent);
          if (standaloneDropdown instanceof HTMLDetailsElement) standaloneDropdown.open = false;

          const contextRoot = document.querySelector('.context-menu');
          const contextTrigger = contextRoot?.querySelector('.context-menu-trigger');
          const contextContent = contextRoot?.querySelector('.context-menu-content');
          contextRoot?.scrollIntoView({ block: 'center' });
          if (contextRoot instanceof HTMLDetailsElement) contextRoot.open = true;
          await nextFrame();
          await nextFrame();
          const contextRootRect = contextRoot?.getBoundingClientRect();
          const contextTriggerRect = contextTrigger?.getBoundingClientRect();
          const contextAnchoredRect = contextContent?.getBoundingClientRect();
          const contextMenuFloating = contextRoot instanceof HTMLDetailsElement &&
            contextTrigger instanceof HTMLElement && contextContent instanceof HTMLElement &&
            contextRootRect !== undefined && contextTriggerRect !== undefined && contextAnchoredRect !== undefined &&
            getComputedStyle(contextContent).position === 'absolute' &&
            contextRootRect.height <= contextTriggerRect.height + 4 &&
            insideViewport(contextAnchoredRect);
          if (contextRoot instanceof HTMLDetailsElement) contextRoot.open = false;
          if (contextTrigger instanceof HTMLElement) {
            contextTrigger.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 40, clientY: 40 }));
          }
          await nextFrame();
          await nextFrame();
          const contextFixedRect = contextContent?.getBoundingClientRect();
          const contextMenuEnhanced = contextRoot instanceof HTMLDetailsElement && contextRoot.classList.contains('is-enhanced');
          const contextMenuOpen = contextRoot instanceof HTMLDetailsElement && contextRoot.open && contextRoot.classList.contains('is-context-open');
          const contextMenuPositioned = contextContent instanceof HTMLElement && getComputedStyle(contextContent).position === 'fixed';
          const contextMenuLeftFits = contextFixedRect !== undefined && contextFixedRect.left >= -1;
          const contextMenuRightFits = contextFixedRect !== undefined && contextFixedRect.right <= innerWidth + 1;
          const contextMenuTopFits = contextFixedRect !== undefined && contextFixedRect.top >= -1;
          const contextMenuBottomFits = contextFixedRect !== undefined && contextFixedRect.bottom <= innerHeight + 1;
          const contextMenu = contextRoot instanceof HTMLDetailsElement &&
            contextMenuEnhanced && contextMenuOpen && contextMenuPositioned &&
            contextFixedRect !== undefined && insideViewport(contextFixedRect);
          const contextMenuItemsFit = !enforceRichMenuLayout || menuItemsFit(contextContent);
          if (contextRoot instanceof HTMLDetailsElement) contextRoot.open = false;

          const menubarRoot = document.querySelector('.menubar');
          const menubarTriggers = [...(menubarRoot?.querySelectorAll('.dropdown-menu > summary') ?? [])];
          if (menubarRoot instanceof HTMLElement) menubarRoot.style.marginLeft = 'auto';
          menubarRoot?.scrollIntoView({ block: 'center' });
          await nextFrame();
          const menubarClosedRect = menubarRoot?.getBoundingClientRect();
          let menubarKeyboard = false;
          if (menubarTriggers[0] instanceof HTMLElement && menubarTriggers[1] instanceof HTMLElement) {
            menubarTriggers[0].focus();
            menubarTriggers[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
            menubarKeyboard = document.activeElement === menubarTriggers[1];
            menubarTriggers[1].blur();
          }
          const menubarMenu = menubarTriggers[1]?.closest('.dropdown-menu');
          const menubarContent = menubarMenu?.querySelector(':scope > .dropdown-menu-content');
          if (menubarMenu instanceof HTMLDetailsElement) menubarMenu.open = true;
          await nextFrame();
          await nextFrame();
          const menubarOpenRect = menubarRoot?.getBoundingClientRect();
          const menubarContentRect = menubarContent?.getBoundingClientRect();
          const menubarFloating = menubarRoot instanceof HTMLElement && menubarContent instanceof HTMLElement &&
            menubarClosedRect !== undefined && menubarOpenRect !== undefined && menubarContentRect !== undefined &&
            getComputedStyle(menubarContent).position === 'absolute' &&
            Math.abs(menubarOpenRect.width - menubarClosedRect.width) <= 1 &&
            Math.abs(menubarOpenRect.height - menubarClosedRect.height) <= 1 &&
            insideViewport(menubarContentRect);
          const menubarItemsFit = !enforceRichMenuLayout || menuItemsFit(menubarContent);
          const menubar = menubarRoot instanceof HTMLElement &&
            menubarRoot.classList.contains('is-enhanced') && menubarKeyboard;
          if (menubarMenu instanceof HTMLDetailsElement) menubarMenu.open = false;
          if (menubarRoot instanceof HTMLElement) menubarRoot.style.removeProperty('margin-left');

          window.scrollTo(0, 0);
          return { calendar, dropdownFloating, dropdownItemsFit, contextMenu, contextMenuEnhanced, contextMenuOpen, contextMenuPositioned, contextMenuLeftFits, contextMenuRightFits, contextMenuTopFits, contextMenuBottomFits, contextMenuFloating, contextMenuItemsFit, menubar, menubarFloating, menubarItemsFit };
        })()`,
        awaitPromise: true,
        returnByValue: true
      },
      sessionId
    );
      const remaining = remainingEvaluated.result.value;
      if (Object.values(remaining).some((value) => !value)) {
        throw new Error(
          `Shared block enhancement failed for ${screenshotPath}: ${JSON.stringify(remaining)}.`
        );
      }
      {
        const portableEvaluated = await client.send<{ result: { value: PortableInteractionMetrics } }>(
      "Runtime.evaluate",
      {
        expression: `(async () => {
          const tabsRoot = document.querySelector('[data-mds-role="tabs"]');
          const tabButtons = [...(tabsRoot?.querySelectorAll('[data-mds-role="tab"]') ?? [])];
          const tabPanels = [...(tabsRoot?.querySelectorAll('[data-mds-role="tab-panel"]') ?? [])];
          const tabsHasSourcePanels = (tabsRoot?.querySelectorAll('[data-slot], .tabs-item').length ?? 0) > 1;
          const tabsInitialized = tabsRoot instanceof HTMLElement && tabsRoot.dataset.mdsTabs === 'true' && tabButtons.length > 1;
          const tabsRelationships = tabButtons.length === tabPanels.length &&
            tabButtons.every((button, index) => button.getAttribute('aria-controls') === tabPanels[index]?.id) &&
            tabPanels.every((panel, index) => panel.getAttribute('aria-labelledby') === tabButtons[index]?.id);
          let tabsKeyboard = false;
          let tabsSelection = false;
          let tabsVisibility = false;
          if (tabsInitialized && tabsRelationships && tabButtons[0] instanceof HTMLElement && tabButtons[1] instanceof HTMLElement) {
            tabButtons[0].focus();
            tabButtons[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
            tabsKeyboard = document.activeElement === tabButtons[1];
            tabsSelection = tabButtons[1].getAttribute('aria-selected') === 'true';
            tabsVisibility =
              tabPanels[0] instanceof HTMLElement && tabPanels[0].hidden &&
              tabPanels[1] instanceof HTMLElement && !tabPanels[1].hidden;
          }
          const tabs = tabsInitialized && tabsRelationships && tabsKeyboard && tabsSelection && tabsVisibility;

          const accordionRoot = document.querySelector('[data-mds-role="accordion"]');
          const accordionButtons = [...(accordionRoot?.querySelectorAll('[data-mds-role="accordion-trigger"]') ?? [])];
          const accordionPanels = [...(accordionRoot?.querySelectorAll('[data-mds-role="accordion-panel"]') ?? [])];
          let accordion = accordionRoot instanceof HTMLElement && accordionRoot.dataset.mdsAccordion === 'true' &&
            accordionButtons.length > 1 && accordionButtons.length === accordionPanels.length &&
            accordionButtons[0]?.getAttribute('aria-expanded') === 'true' &&
            accordionPanels[0] instanceof HTMLElement && !accordionPanels[0].hidden;
          if (accordion && accordionButtons[1] instanceof HTMLButtonElement) {
            accordionButtons[1].click();
            accordion = accordionButtons[0]?.getAttribute('aria-expanded') === 'false' &&
              accordionButtons[1].getAttribute('aria-expanded') === 'true' &&
              accordionPanels[0] instanceof HTMLElement && accordionPanels[0].hidden &&
              accordionPanels[1] instanceof HTMLElement && !accordionPanels[1].hidden;
          }

          const detailsControl = document.querySelector('.toggle-control[data-target="componentDetails"]');
          const detailsTarget = document.querySelector('#componentDetails');
          let detailsToggle = detailsControl instanceof HTMLButtonElement && detailsTarget instanceof HTMLDetailsElement;
          detailsControl?.click();
          detailsToggle = detailsToggle && detailsTarget instanceof HTMLDetailsElement && detailsTarget.open &&
            detailsControl?.getAttribute('aria-pressed') === 'true';
          detailsControl?.click();
          detailsToggle = detailsToggle && detailsTarget instanceof HTMLDetailsElement && !detailsTarget.open &&
            detailsControl?.getAttribute('aria-pressed') === 'false';

          const inputGroupFrame = document.querySelector('.input-group-frame');
          const inputGroupPrefix = inputGroupFrame?.querySelector('.input-group-prefix');
          const inputGroupControl = inputGroupFrame?.querySelector('.input-group-control');
          const inputGroupSuffix = inputGroupFrame?.querySelector('.input-group-suffix');
          const prefixRect = inputGroupPrefix?.getBoundingClientRect();
          const controlRect = inputGroupControl?.getBoundingClientRect();
          const suffixRect = inputGroupSuffix?.getBoundingClientRect();
          const inputGroupOrder = inputGroupPrefix instanceof HTMLElement && inputGroupControl instanceof HTMLInputElement &&
            inputGroupSuffix instanceof HTMLElement && prefixRect !== undefined && controlRect !== undefined && suffixRect !== undefined &&
            prefixRect.right <= controlRect.left + 1 && controlRect.right <= suffixRect.left + 1;

          const commandAction = document.querySelector('button.action.command');
          const commandActions = commandAction instanceof HTMLButtonElement &&
            commandAction.closest('[data-mds-role="command"]') === null &&
            commandAction.dataset.mdsCommand === undefined;

          const coversViewport = (overlay) => {
            if (!(overlay instanceof HTMLElement)) return false;
            const backdrop = overlay.querySelector('[data-mds-role="overlay-backdrop"]');
            if (!(backdrop instanceof HTMLElement)) return false;
            const rootRect = overlay.getBoundingClientRect();
            const backdropRect = backdrop.getBoundingClientRect();
            const covers = (rect) => rect.top <= 1 && rect.left <= 1 &&
              rect.right >= window.innerWidth - 1 && rect.bottom >= window.innerHeight - 1;
            return getComputedStyle(overlay).position === 'fixed' && covers(rootRect) && covers(backdropRect);
          };

          const dialogTrigger = document.querySelector('[data-action="open"][data-target="componentDialog"]');
          const dialogRoot = document.querySelector('#componentDialog');
          dialogTrigger?.click();
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          const dialogClass = dialogRoot instanceof HTMLElement && dialogRoot.classList.contains('is-open');
          const dialogAria = dialogRoot instanceof HTMLElement && dialogRoot.getAttribute('aria-hidden') === 'false';
          const dialogBodyLock = document.body.classList.contains('has-overlay');
          const dialogBackgroundInert = dialogTrigger instanceof HTMLElement && Boolean(dialogTrigger.closest('[inert]'));
          const dialogFocus = dialogTrigger instanceof HTMLElement && dialogRoot instanceof HTMLElement &&
            dialogRoot.contains(document.activeElement);
          const dialogCoversViewport = coversViewport(dialogRoot);
          dialogRoot?.querySelector('[data-mds-overlay-close]')?.click();
          const dialogStateClosed = dialogRoot instanceof HTMLElement && dialogRoot.hidden && !dialogRoot.classList.contains('is-open');
          const dialogAriaClosed = dialogRoot instanceof HTMLElement && dialogRoot.getAttribute('aria-hidden') === 'true';
          const dialogBodyUnlocked = !document.body.classList.contains('has-overlay');
          const dialogFocusRestored = document.activeElement === dialogTrigger;

          const drawerTrigger = document.querySelector('[data-action="show"][data-target="componentDrawer"]');
          const drawerRoot = document.querySelector('#componentDrawer');
          drawerTrigger?.click();
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          const drawerOpen = drawerTrigger instanceof HTMLElement && drawerRoot instanceof HTMLElement &&
            drawerRoot.classList.contains('is-open') && drawerRoot.getAttribute('aria-hidden') === 'false' &&
            document.body.classList.contains('has-overlay') && drawerRoot.contains(document.activeElement);
          const drawerCoversViewport = coversViewport(drawerRoot);
          const drawerBackgroundInert = drawerTrigger instanceof HTMLElement && Boolean(drawerTrigger.closest('[inert]'));
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
          const drawerStateClosed = drawerRoot instanceof HTMLElement && drawerRoot.hidden && !drawerRoot.classList.contains('is-open');
          const drawerAriaClosed = drawerRoot instanceof HTMLElement && drawerRoot.getAttribute('aria-hidden') === 'true';
          const drawerBodyUnlocked = !document.body.classList.contains('has-overlay');
          const drawerFocusRestored = document.activeElement === drawerTrigger;

          window.scrollTo(0, 0);
          return { tabs, tabsInitialized, tabsHasSourcePanels, tabsRelationships, tabsKeyboard, tabsSelection, tabsVisibility, accordion, detailsToggle, inputGroupOrder, commandActions, dialogClass, dialogAria, dialogBodyLock, dialogFocus, dialogCoversViewport, dialogBackgroundInert, dialogStateClosed, dialogAriaClosed, dialogBodyUnlocked, dialogFocusRestored, drawerOpen, drawerCoversViewport, drawerBackgroundInert, drawerStateClosed, drawerAriaClosed, drawerBodyUnlocked, drawerFocusRestored };
        })()`,
        awaitPromise: true,
        returnByValue: true
      },
      sessionId
    );
        const portableEnhancements = portableEvaluated.result.value;
        if (Object.values(portableEnhancements).some((value) => !value)) {
          throw new Error(
            `Portable interaction enhancement failed for ${screenshotPath}: ${JSON.stringify(portableEnhancements)}.`
          );
        }
      }
      if (themeName === "canvas") {
        const canvasOverlayEvaluated = await client.send<{ result: { value: CanvasOverlayMetrics } }>(
          "Runtime.evaluate",
          {
            expression: `(async () => {
              const nextFrames = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
              const hasInertAncestor = (element) => {
                let current = element;
                while (current instanceof HTMLElement && current !== document.body) {
                  if (current.hasAttribute('inert')) return true;
                  current = current.parentElement;
                }
                return false;
              };
              const pointerShielded = (overlay) => {
                const hit = document.elementFromPoint(8, 8);
                return hit instanceof HTMLElement && hit.matches('[data-mds-role="overlay-backdrop"]') && overlay.contains(hit);
              };
              const overlayTopmost = (overlay) => {
                if (!(overlay instanceof HTMLElement)) return false;
                const rect = overlay.getBoundingClientRect();
                const x = Math.min(Math.max(rect.left + rect.width / 2, 0), innerWidth - 1);
                const y = Math.min(Math.max(rect.top + rect.height / 2, 0), innerHeight - 1);
                const hit = document.elementFromPoint(x, y);
                return hit === overlay || (hit instanceof Node && overlay.contains(hit));
              };

              const dialogTrigger = document.querySelector('[data-action="open"][data-target="componentDialog"]');
              const dialogRoot = document.querySelector('#componentDialog');
              dialogTrigger?.click();
              await nextFrames();
              const dialogPortaled = dialogRoot instanceof HTMLElement && dialogRoot.parentElement === document.body;
              const dialogPanelTopmost = overlayTopmost(dialogRoot);
              const dialogPointerShield = dialogRoot instanceof HTMLElement && pointerShielded(dialogRoot);
              const dialogBackgroundInert = dialogTrigger instanceof HTMLElement && hasInertAncestor(dialogTrigger);
              dialogRoot?.querySelector('[data-mds-role="overlay-backdrop"]')?.click();
              const dialogBackdropClose = dialogRoot instanceof HTMLElement && dialogRoot.hidden;
              const dialogRestoresBackground = dialogTrigger instanceof HTMLElement && !hasInertAncestor(dialogTrigger);

              const drawerTrigger = document.querySelector('[data-action="show"][data-target="componentDrawer"]');
              const drawerRoot = document.querySelector('#componentDrawer');
              drawerTrigger?.click();
              await nextFrames();
              const drawerPortaled = drawerRoot instanceof HTMLElement && drawerRoot.parentElement === document.body;
              const drawerPanelTopmost = overlayTopmost(drawerRoot);
              const drawerPointerShield = drawerRoot instanceof HTMLElement && pointerShielded(drawerRoot);
              const drawerBackgroundInert = drawerTrigger instanceof HTMLElement && hasInertAncestor(drawerTrigger);
              drawerRoot?.querySelector('[data-mds-role="overlay-backdrop"]')?.click();
              const drawerBackdropClose = drawerRoot instanceof HTMLElement && drawerRoot.hidden;
              const drawerRestoresBackground = drawerTrigger instanceof HTMLElement && !hasInertAncestor(drawerTrigger);

              window.scrollTo(0, 0);
              return { dialogPortaled, dialogPanelTopmost, dialogPointerShield, dialogBackgroundInert, dialogBackdropClose, dialogRestoresBackground, drawerPortaled, drawerPanelTopmost, drawerPointerShield, drawerBackgroundInert, drawerBackdropClose, drawerRestoresBackground };
            })()`,
            awaitPromise: true,
            returnByValue: true
          },
          sessionId
        );
        const canvasOverlay = canvasOverlayEvaluated.result.value;
        if (Object.values(canvasOverlay).some((value) => !value)) {
          throw new Error(
            `Canvas overlay interaction failed for ${screenshotPath}: ${JSON.stringify(canvasOverlay)}.`
          );
        }
      }
    }
    if (verifyMotion) {
      const motionEvaluated = await client.send<{ result: { value: MotionEnhancementMetrics } }>(
        "Runtime.evaluate",
        {
          expression: `(async () => {
            const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
            const hero = document.querySelector('[data-attr-motion][data-attr-trigger="load"]');
            const reveal = document.querySelector('[data-mds-role="reveal"]');
            const scene = document.querySelector('[data-mds-role="scene"]');
            const group = document.querySelector('[data-mds-role="motion"]');
            const items = [...(group?.children ?? [])];

            const normalBlockAttrs = hero instanceof HTMLElement &&
              hero.hasAttribute('data-motion-ready') &&
              hero.dataset.motionPreset === 'fade-up' &&
              hero.dataset.motionTrigger === 'load' &&
              hero.style.getPropertyValue('--motion-delay') === '120ms' &&
              hero.style.getPropertyValue('--motion-duration') === '900ms';
            const revealPreset = reveal instanceof HTMLElement &&
              reveal.dataset.motionPreset === 'blur-in' &&
              reveal.style.getPropertyValue('--motion-delay') === '80ms' &&
              reveal.style.getPropertyValue('--motion-duration') === '760ms';
            const scenePreset = scene instanceof HTMLElement &&
              scene.dataset.motionPreset === 'scene' &&
              scene.getAttribute('data-attr-variant') === 'spotlight';
            const staggerConfigured = group instanceof HTMLElement &&
              group.classList.contains('has-stagger') &&
              group.dataset.motionOnce === 'false' &&
              items.length === 3 &&
              items.every((item, index) => item instanceof HTMLElement &&
                item.classList.contains('motion-item') &&
                item.style.getPropertyValue('--motion-item-delay') === String(index * 160) + 'ms');

            group?.scrollIntoView({ block: 'center' });
            await wait(450);
            const entersViewport = group instanceof HTMLElement && group.classList.contains('is-visible');
            await wait(1_050);
            const staggerCompletes = items.length === 3 &&
              items.every((item) => Number.parseFloat(getComputedStyle(item).opacity) > 0.98);

            if (group instanceof HTMLElement) {
              group.style.transition = 'none';
              group.style.transform = 'translateY(-100000px)';
              window.dispatchEvent(new Event('scroll'));
            }
            await wait(220);
            const replays = group instanceof HTMLElement && !group.classList.contains('is-visible');
            if (group instanceof HTMLElement) {
              group.style.removeProperty('transition');
              group.style.removeProperty('transform');
            }
            window.scrollTo(0, 0);
            window.dispatchEvent(new Event('scroll'));
            await wait(1_050);
            return { normalBlockAttrs, revealPreset, scenePreset, staggerConfigured, entersViewport, staggerCompletes, replays };
          })()`,
          awaitPromise: true,
          returnByValue: true
        },
        sessionId
      );
      const motion = motionEvaluated.result.value;
      if (Object.values(motion).some((value) => !value)) {
        throw new Error(`Portable motion enhancement failed for ${screenshotPath}: ${JSON.stringify(motion)}.`);
      }
    }
    if (verifyRichExtensions) {
      const richEvaluated = await client.send<{ result: { value: RichEnhancementMetrics } }>(
        "Runtime.evaluate",
        {
          expression: `(() => {
            const shell = document.querySelector('.data-table-shell');
            const input = shell?.querySelector('.data-table-filter-input');
            const rows = [...(shell?.querySelectorAll('tbody > tr') ?? [])];
            const pagination = shell?.querySelector('.data-table-pagination');
            const next = shell?.querySelector('.data-table-next');
            const firstCheckbox = shell?.querySelector('.data-table-row-select');
            const dataTableEnhanced = shell instanceof HTMLElement && shell.dataset.mdsDataTable === 'true' &&
              shell.classList.contains('is-enhanced') && input instanceof HTMLInputElement && !input.closest('header')?.hidden;

            if (input instanceof HTMLInputElement) {
              input.value = 'theme-rich';
              input.dispatchEvent(new Event('input', { bubbles: true }));
            }
            const dataTableFilters = rows.length === 2 && rows.filter((row) => row instanceof HTMLElement && !row.hidden).length === 1 &&
              rows.some((row) => row instanceof HTMLElement && !row.hidden && row.textContent?.includes('theme-rich'));

            if (input instanceof HTMLInputElement) {
              input.value = '';
              input.dispatchEvent(new Event('input', { bubbles: true }));
            }
            const dataTableRestores = rows.filter((row) => row instanceof HTMLElement && !row.hidden).length === 1 &&
              pagination instanceof HTMLElement && !pagination.hidden && next instanceof HTMLButtonElement && !next.disabled;
            next?.click();
            const dataTablePaginates = rows[1] instanceof HTMLElement && !rows[1].hidden && next instanceof HTMLButtonElement && next.disabled;
            if (firstCheckbox instanceof HTMLInputElement) firstCheckbox.click();
            const dataTableSelects = firstCheckbox instanceof HTMLInputElement && firstCheckbox.checked &&
              firstCheckbox.closest('tr')?.getAttribute('aria-selected') === 'true';

            const scroller = document.querySelector('.message-scroller');
            const viewport = scroller?.querySelector('.message-scroller-viewport');
            const messageScrollerEnhanced = scroller instanceof HTMLElement && scroller.dataset.mdsMessageScroller === 'true' &&
              scroller.classList.contains('is-enhanced');
            const messageScrollerHeight = viewport instanceof HTMLElement && viewport.style.maxHeight === '12rem';

            return { dataTableEnhanced, dataTableFilters, dataTableRestores, dataTablePaginates, dataTableSelects, messageScrollerEnhanced, messageScrollerHeight };
          })()`,
          returnByValue: true
        },
        sessionId
      );
      const rich = richEvaluated.result.value;
      if (Object.values(rich).some((value) => !value)) {
        throw new Error(`Rich theme enhancement failed for ${screenshotPath}: ${JSON.stringify(rich)}.`);
      }
    }
    if (verifyActionStyles) {
      const actionEvaluated = await client.send<{ result: { value: ActionStyleMetrics } }>(
        "Runtime.evaluate",
        {
          expression: `(async () => {
            const action = document.querySelector('button.action.command[data-action="open"][data-target="actionDetails"]');
            if (!(action instanceof HTMLButtonElement)) {
              return { actionExists: false, actionVisible: false, actionContrast: false, actionUsesControlGeometry: false, drawerExists: false, drawerOpen: false, drawerUsesSidePanelGeometry: false, drawerWidth: 0, display: '', width: 0, height: 0, viewportWidth: innerWidth };
            }
            const channelValues = (value) => (value.match(/[\\d.]+/g) ?? []).slice(0, 3).map(Number);
            const luminance = (value) => {
              const channels = channelValues(value).map((channel) => {
                const normalized = channel / 255;
                return normalized <= 0.04045 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
              });
              return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
            };
            const style = getComputedStyle(action);
            const foreground = luminance(style.color);
            const background = luminance(style.backgroundColor);
            const contrast = (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
            const rect = action.getBoundingClientRect();
            const actionExists = true;
            const actionVisible = style.visibility !== 'hidden' && Number.parseFloat(style.opacity) > 0.98 && rect.width > 0 && rect.height > 0;
            const actionContrast = contrast >= 4.5;
            const actionUsesControlGeometry = (style.display === 'inline-flex' || style.display === 'flex') &&
              rect.height <= 56 && rect.width < innerWidth * 0.8;
            document.documentElement.style.scrollBehavior = 'auto';
            action.scrollIntoView({ block: 'center' });
            await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
            const drawerAction = document.querySelector('button.action.command[data-action="show"][data-target="actionDrawer"]');
            const drawer = document.querySelector('#actionDrawer');
            const drawerPanel = drawer?.querySelector('[data-mds-role="overlay-panel"]');
            const drawerExists = drawerAction instanceof HTMLButtonElement && drawer instanceof HTMLElement && drawerPanel instanceof HTMLElement;
            if (drawerAction instanceof HTMLButtonElement) drawerAction.click();
            await new Promise((resolve) => setTimeout(resolve, 320));
            const drawerRect = drawerPanel instanceof HTMLElement ? drawerPanel.getBoundingClientRect() : { width: 0 };
            const drawerOpen = drawer instanceof HTMLElement && !drawer.hidden && drawer.getAttribute('aria-hidden') === 'false';
            const drawerWidth = drawerRect.width;
            const drawerUsesSidePanelGeometry = innerWidth <= 560
              ? drawerWidth <= innerWidth - 16
              : drawerWidth <= Math.min(540, innerWidth * 0.72);
            return { actionExists, actionVisible, actionContrast, actionUsesControlGeometry, drawerExists, drawerOpen, drawerUsesSidePanelGeometry, drawerWidth, display: style.display, width: rect.width, height: rect.height, viewportWidth: innerWidth };
          })()`,
          awaitPromise: true,
          returnByValue: true
        },
        sessionId
      );
      const actionStyles = actionEvaluated.result.value;
      if (!actionStyles.actionExists || !actionStyles.actionVisible || !actionStyles.actionContrast || !actionStyles.actionUsesControlGeometry ||
          !actionStyles.drawerExists || !actionStyles.drawerOpen || !actionStyles.drawerUsesSidePanelGeometry) {
        throw new Error(`Rich action styling failed for ${screenshotPath}: ${JSON.stringify(actionStyles)}.`);
      }
    }
    const evaluated = await client.send<{ result: { value: LayoutMetrics } }>(
      "Runtime.evaluate",
      {
        expression:
          "({innerWidth,innerHeight,scrollWidth:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth),scrollHeight:Math.max(document.documentElement.scrollHeight,document.body.scrollHeight),overflowElements:[...document.querySelectorAll('*')].map((element)=>{const rect=element.getBoundingClientRect();return {selector:element.tagName.toLowerCase()+(element.id?'#'+element.id:'')+(typeof element.className==='string'&&element.className.trim()?'.'+element.className.trim().split(/\\s+/).join('.'):''),left:Math.round(rect.left),right:Math.round(rect.right),width:Math.round(rect.width)}}).filter((entry)=>entry.right>innerWidth+1||entry.left<-1).slice(0,12),overflowingContents:[...document.querySelectorAll('*')].map((element)=>({selector:element.tagName.toLowerCase()+(element.id?'#'+element.id:'')+(typeof element.className==='string'&&element.className.trim()?'.'+element.className.trim().split(/\\s+/).join('.'):''),clientWidth:element.clientWidth,scrollWidth:element.scrollWidth,overflowX:getComputedStyle(element).overflowX})).filter((entry)=>entry.scrollWidth>entry.clientWidth+1&&entry.overflowX==='visible').slice(0,12)})",
        returnByValue: true
      },
      sessionId
    );
    const layout = evaluated.result.value;
    if (layout.innerWidth !== width) {
      throw new Error(`Chrome viewport mismatch for ${screenshotPath}: expected ${width}, got ${layout.innerWidth}.`);
    }
    if (layout.scrollWidth > layout.innerWidth + 1) {
      throw new Error(
        `Horizontal overflow in ${screenshotPath}: scrollWidth=${layout.scrollWidth}, innerWidth=${layout.innerWidth}. ` +
          `Offenders: ${layout.overflowElements
            .map((entry) => `${entry.selector}[${entry.left},${entry.right};w=${entry.width}]`)
            .join(", ")}. Overflowing contents: ${layout.overflowingContents
            .map((entry) => `${entry.selector}[${entry.clientWidth}->${entry.scrollWidth};${entry.overflowX}]`)
            .join(", ")}.`
      );
    }
    if (runtimeErrors.length > 0) {
      throw new Error(`Browser runtime errors in ${screenshotPath}: ${runtimeErrors.join(" | ")}.`);
    }
    const screenshot = await client.send<{ data: string }>(
      "Page.captureScreenshot",
      { format: "png", fromSurface: true, captureBeyondViewport: false },
      sessionId
    );
    await writeFile(screenshotPath, screenshot.data, "base64");
    return layout;
  } finally {
    removeRuntimeErrorListener?.();
    client?.close();
    await stopProcess(child);
    await rm(profileDirectory, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}

async function stopProcess(child: ReturnType<typeof spawn>): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  child.kill("SIGTERM");
  const exited = await Promise.race([
    new Promise<boolean>((resolveExit) => child.once("exit", () => resolveExit(true))),
    delay(1_000).then(() => false)
  ]);
  if (exited || child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  child.kill("SIGKILL");
  await Promise.race([
    new Promise<void>((resolveExit) => child.once("exit", () => resolveExit())),
    delay(2_000)
  ]);
}

async function waitForDevToolsUrl(
  child: ReturnType<typeof spawn>,
  timeoutMs: number
): Promise<string> {
  return new Promise((resolveUrl, rejectUrl) => {
    const stderr = child.stderr;
    if (stderr === null) {
      rejectUrl(new Error("Chrome stderr is unavailable."));
      return;
    }

    const timeout = setTimeout(() => {
      cleanup();
      rejectUrl(new Error(`Chrome did not expose a DevTools URL within ${timeoutMs}ms.`));
    }, timeoutMs);
    let output = "";
    const onData = (chunk: Buffer): void => {
      output += chunk.toString();
      const match = output.match(/DevTools listening on (ws:\/\/\S+)/);
      if (match?.[1] !== undefined) {
        cleanup();
        resolveUrl(match[1]);
      }
    };
    const onExit = (code: number | null): void => {
      cleanup();
      rejectUrl(new Error(`Chrome exited before exposing DevTools (exit ${String(code)}).`));
    };
    const cleanup = (): void => {
      clearTimeout(timeout);
      stderr.off("data", onData);
      child.off("exit", onExit);
    };
    stderr.on("data", onData);
    child.once("exit", onExit);
  });
}

interface CdpEvent {
  method: string;
  sessionId?: string;
  params?: unknown;
}

class CdpClient {
  private nextId = 1;
  private readonly pending = new Map<
    number,
    { resolve: (value: unknown) => void; reject: (error: Error) => void }
  >();
  private readonly eventWaiters: Array<{
    method: string;
    sessionId?: string;
    resolve: () => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
  }> = [];
  private readonly eventListeners = new Set<(message: CdpEvent) => void>();

  private constructor(private readonly socket: WebSocket) {
    socket.addEventListener("message", (event) => this.handleMessage(String(event.data)));
  }

  static async connect(url: string): Promise<CdpClient> {
    const socket = new WebSocket(url);
    await new Promise<void>((resolveOpen, rejectOpen) => {
      socket.addEventListener("open", () => resolveOpen(), { once: true });
      socket.addEventListener("error", () => rejectOpen(new Error(`Could not connect to Chrome DevTools: ${url}`)), {
        once: true
      });
    });
    return new CdpClient(socket);
  }

  send<T = Record<string, unknown>>(
    method: string,
    params: Record<string, unknown> = {},
    sessionId?: string
  ): Promise<T> {
    const id = this.nextId;
    this.nextId += 1;
    return new Promise<T>((resolveResult, rejectResult) => {
      this.pending.set(id, {
        resolve: (value) => resolveResult(value as T),
        reject: rejectResult
      });
      this.socket.send(JSON.stringify({ id, method, params, ...(sessionId === undefined ? {} : { sessionId }) }));
    });
  }

  waitForEvent(method: string, sessionId: string | undefined, timeoutMs: number): Promise<void> {
    return new Promise((resolveEvent, rejectEvent) => {
      const waiter = {
        method,
        ...(sessionId === undefined ? {} : { sessionId }),
        resolve: resolveEvent,
        reject: rejectEvent,
        timeout: setTimeout(() => {
          const index = this.eventWaiters.indexOf(waiter);
          if (index >= 0) {
            this.eventWaiters.splice(index, 1);
          }
          rejectEvent(new Error(`Timed out waiting for Chrome DevTools event ${method}.`));
        }, timeoutMs)
      };
      this.eventWaiters.push(waiter);
    });
  }

  onEvent(listener: (message: CdpEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  close(): void {
    this.socket.close();
  }

  private handleMessage(raw: string): void {
    const message = JSON.parse(raw) as {
      id?: number;
      method?: string;
      sessionId?: string;
      params?: unknown;
      result?: unknown;
      error?: { message?: string };
    };
    if (message.id !== undefined) {
      const pending = this.pending.get(message.id);
      if (pending !== undefined) {
        this.pending.delete(message.id);
        if (message.error !== undefined) {
          pending.reject(new Error(message.error.message ?? "Chrome DevTools command failed."));
        } else {
          pending.resolve(message.result ?? {});
        }
      }
      return;
    }

    if (message.method !== undefined) {
      for (const listener of this.eventListeners) {
        listener({
          method: message.method,
          ...(message.sessionId === undefined ? {} : { sessionId: message.sessionId }),
          ...(message.params === undefined ? {} : { params: message.params })
        });
      }
      const index = this.eventWaiters.findIndex(
        (waiter) => waiter.method === message.method && waiter.sessionId === message.sessionId
      );
      if (index >= 0) {
        const waiter = this.eventWaiters.splice(index, 1)[0]!;
        clearTimeout(waiter.timeout);
        waiter.resolve();
      }
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

function relativeArtifactPath(path: string): string {
  return path.slice(outputDirectory.length + 1);
}

await main();
