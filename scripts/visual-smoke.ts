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
const themeNames = ["default", "canvas"] as const;
const viewports = [
  { name: "mobile", width: 390, height: 844 },
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
  contextMenu: boolean;
  contextMenuFloating: boolean;
  menubar: boolean;
  menubarFloating: boolean;
}

interface DefaultEnhancementMetrics {
  tabs: boolean;
  accordion: boolean;
  detailsToggle: boolean;
  commandActions: boolean;
  dialogClass: boolean;
  dialogAria: boolean;
  dialogBodyLock: boolean;
  dialogFocus: boolean;
  dialogCoversViewport: boolean;
  dialogClose: boolean;
  drawerOpen: boolean;
  drawerCoversViewport: boolean;
  drawerClose: boolean;
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
  const selectedExample = examples.find((example) => example.id === requestedExample);
  if (selectedExample === undefined) {
    throw new Error(`Unknown editor example: ${requestedExample}.`);
  }

  await mkdir(outputDirectory, { recursive: true });
  const artifacts: VisualSmokeArtifact[] = [];

  for (const themeName of selectedThemes) {
    const themeDirectory = join(root, "themes", themeName);
    const themeOutput = join(outputDirectory, themeName);
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
          selectedExample.id === "motion"
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
      ? join(outputDirectory, "manifest.json")
      : join(outputDirectory, selectedThemes[0]!, "manifest.json");
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
  verifyMotion: boolean
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
    await client.send("Page.enable", {}, sessionId);
    await client.send("Runtime.enable", {}, sessionId);
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
          const contextMenu = contextRoot instanceof HTMLDetailsElement &&
            contextRoot.classList.contains('is-enhanced') && contextRoot.open &&
            contextRoot.classList.contains('is-context-open') &&
            contextContent instanceof HTMLElement && getComputedStyle(contextContent).position === 'fixed' &&
            contextFixedRect !== undefined && insideViewport(contextFixedRect);
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
          const menubar = menubarRoot instanceof HTMLElement &&
            menubarRoot.classList.contains('is-enhanced') && menubarKeyboard;
          if (menubarMenu instanceof HTMLDetailsElement) menubarMenu.open = false;
          if (menubarRoot instanceof HTMLElement) menubarRoot.style.removeProperty('margin-left');

          window.scrollTo(0, 0);
          return { calendar, dropdownFloating, contextMenu, contextMenuFloating, menubar, menubarFloating };
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
      if (themeName === "default") {
        const defaultEvaluated = await client.send<{ result: { value: DefaultEnhancementMetrics } }>(
      "Runtime.evaluate",
      {
        expression: `(async () => {
          const tabsRoot = document.querySelector('.tabs');
          const tabButtons = [...(tabsRoot?.querySelectorAll('.tab-button') ?? [])];
          const tabPanels = [...(tabsRoot?.querySelectorAll('.tabs-item') ?? [])];
          let tabs = tabButtons.length > 1 && tabButtons.length === tabPanels.length &&
            tabButtons.every((button, index) => button.id === \`tabs-1-\${index + 1}-tab\`) &&
            tabPanels.every((panel, index) => panel.id === \`tabs-1-\${index + 1}-panel\`);
          if (tabs && tabButtons[0] instanceof HTMLElement && tabButtons[1] instanceof HTMLElement) {
            tabButtons[0].focus();
            tabButtons[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
            tabs = document.activeElement === tabButtons[1] &&
              tabButtons[1].getAttribute('aria-selected') === 'true' &&
              tabPanels[0] instanceof HTMLElement && tabPanels[0].hidden &&
              tabPanels[1] instanceof HTMLElement && !tabPanels[1].hidden;
          }

          const accordionRoot = document.querySelector('.accordion');
          const accordionButtons = [...(accordionRoot?.querySelectorAll('.accordion-button') ?? [])];
          const accordionPanels = [...(accordionRoot?.querySelectorAll('.accordion-panel') ?? [])];
          let accordion = accordionRoot instanceof HTMLElement && accordionRoot.classList.contains('is-enhanced') &&
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

          const commandAction = document.querySelector('button.action.command');
          const commandActions = commandAction instanceof HTMLButtonElement &&
            getComputedStyle(commandAction).display === 'inline-flex' &&
            commandAction.closest('section.command') === null;

          const coversViewport = (overlay) => {
            if (!(overlay instanceof HTMLElement)) return false;
            const backdrop = overlay.querySelector('.dialog-backdrop, .drawer-backdrop');
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
          const dialogFocus = dialogTrigger instanceof HTMLElement && dialogRoot instanceof HTMLElement &&
            dialogRoot.contains(document.activeElement);
          const dialogCoversViewport = coversViewport(dialogRoot);
          dialogRoot?.querySelector('[data-overlay-close]')?.click();
          const dialogClose = dialogRoot instanceof HTMLElement && !dialogRoot.classList.contains('is-open') &&
            dialogRoot.getAttribute('aria-hidden') === 'true' && !document.body.classList.contains('has-overlay') &&
            document.activeElement === dialogTrigger;

          const drawerTrigger = document.querySelector('[data-action="show"][data-target="componentDrawer"]');
          const drawerRoot = document.querySelector('#componentDrawer');
          drawerTrigger?.click();
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          const drawerOpen = drawerTrigger instanceof HTMLElement && drawerRoot instanceof HTMLElement &&
            drawerRoot.classList.contains('is-open') && drawerRoot.getAttribute('aria-hidden') === 'false' &&
            document.body.classList.contains('has-overlay') && drawerRoot.contains(document.activeElement);
          const drawerCoversViewport = coversViewport(drawerRoot);
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
          const drawerClose = drawerRoot instanceof HTMLElement && !drawerRoot.classList.contains('is-open') &&
            drawerRoot.getAttribute('aria-hidden') === 'true' && !document.body.classList.contains('has-overlay') &&
            document.activeElement === drawerTrigger;

          window.scrollTo(0, 0);
          return { tabs, accordion, detailsToggle, commandActions, dialogClass, dialogAria, dialogBodyLock, dialogFocus, dialogCoversViewport, dialogClose, drawerOpen, drawerCoversViewport, drawerClose };
        })()`,
        awaitPromise: true,
        returnByValue: true
      },
      sessionId
    );
        const defaultEnhancements = defaultEvaluated.result.value;
        if (Object.values(defaultEnhancements).some((value) => !value)) {
          throw new Error(
            `Default theme enhancement failed for ${screenshotPath}: ${JSON.stringify(defaultEnhancements)}.`
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
              const pointerShielded = () => document.elementFromPoint(8, 8) === document.body;
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
              const dialogPointerShield = pointerShielded();
              const dialogBackgroundInert = dialogTrigger instanceof HTMLElement && hasInertAncestor(dialogTrigger);
              document.body.click();
              const dialogBackdropClose = dialogRoot instanceof HTMLElement && dialogRoot.hidden;
              const dialogRestoresBackground = dialogTrigger instanceof HTMLElement && !hasInertAncestor(dialogTrigger);

              const drawerTrigger = document.querySelector('[data-action="show"][data-target="componentDrawer"]');
              const drawerRoot = document.querySelector('#componentDrawer');
              drawerTrigger?.click();
              await nextFrames();
              const drawerPortaled = drawerRoot instanceof HTMLElement && drawerRoot.parentElement === document.body;
              const drawerPanelTopmost = overlayTopmost(drawerRoot);
              const drawerPointerShield = pointerShielded();
              const drawerBackgroundInert = drawerTrigger instanceof HTMLElement && hasInertAncestor(drawerTrigger);
              document.body.click();
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
    if (verifyMotion && themeName === "default") {
      const motionEvaluated = await client.send<{ result: { value: MotionEnhancementMetrics } }>(
        "Runtime.evaluate",
        {
          expression: `(async () => {
            const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
            const hero = document.querySelector('.hero[data-attr-motion]');
            const reveal = document.querySelector('.reveal');
            const scene = document.querySelector('.scene');
            const group = document.querySelector('.motion');
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

            document.documentElement.style.scrollBehavior = 'auto';
            window.scrollTo(0, 0);
            await wait(220);
            const replays = group instanceof HTMLElement && !group.classList.contains('is-visible');
            return { normalBlockAttrs, revealPreset, scenePreset, staggerConfigured, entersViewport, staggerCompletes, replays };
          })()`,
          awaitPromise: true,
          returnByValue: true
        },
        sessionId
      );
      const motion = motionEvaluated.result.value;
      if (Object.values(motion).some((value) => !value)) {
        throw new Error(`Default motion enhancement failed for ${screenshotPath}: ${JSON.stringify(motion)}.`);
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
    const screenshot = await client.send<{ data: string }>(
      "Page.captureScreenshot",
      { format: "png", fromSurface: true, captureBeyondViewport: false },
      sessionId
    );
    await writeFile(screenshotPath, screenshot.data, "base64");
    return layout;
  } finally {
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

  close(): void {
    this.socket.close();
  }

  private handleMessage(raw: string): void {
    const message = JSON.parse(raw) as {
      id?: number;
      method?: string;
      sessionId?: string;
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
