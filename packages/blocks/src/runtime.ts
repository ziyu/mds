export const blockEnhancementsScript = String.raw`/* MDS shared block progressive enhancement. */
(() => {
  const truthy = (value) =>
    value !== null && value.trim() !== "" && !["false", "0", "off", "no"].includes(value.trim().toLowerCase());

  const setup = () => {
    setupCommands();
    setupCalendars();
    setupDataTables();
    setupContextMenus();
    setupMenubars();
    setupMessageScrollers();
  };

  function setupCommands() {
    for (const command of document.querySelectorAll(".command")) {
      if (!(command instanceof HTMLElement) || command.dataset.mdsCommand === "true") {
        continue;
      }
      const search = command.querySelector(".command-search");
      const input = command.querySelector(".command-input");
      const empty = command.querySelector(".command-empty");
      const items = Array.from(command.querySelectorAll(".menu-item"));
      if (!(search instanceof HTMLElement) || !(input instanceof HTMLInputElement) || !(empty instanceof HTMLElement) || items.length === 0) {
        continue;
      }

      command.dataset.mdsCommand = "true";
      command.classList.add("is-enhanced");
      search.hidden = false;

      const filter = () => {
        const query = input.value.trim().toLocaleLowerCase();
        let visible = 0;
        for (const item of items) {
          const label = item.getAttribute("data-attr-label") || "";
          const keywords = item.getAttribute("data-attr-keywords") || "";
          const haystack = (label + " " + keywords + " " + (item.textContent || "")).toLocaleLowerCase();
          const matches = query === "" || haystack.includes(query);
          item.hidden = !matches;
          visible += matches ? 1 : 0;
        }
        for (const group of command.querySelectorAll(".menu-group")) {
          if (group instanceof HTMLElement) {
            group.hidden = group.querySelector(".menu-item:not([hidden])") === null;
          }
        }
        empty.hidden = visible !== 0;
      };

      input.addEventListener("input", filter);
      filter();
    }
  }

  function setupCalendars() {
    for (const calendar of document.querySelectorAll(".calendar")) {
      if (!(calendar instanceof HTMLElement) || calendar.dataset.mdsCalendar === "true") {
        continue;
      }
      const nativeLabel = calendar.querySelector(".calendar-native");
      const nativeInput = calendar.querySelector(".calendar-native-input");
      const enhanced = calendar.querySelector(".calendar-enhanced");
      const caption = calendar.querySelector(".calendar-caption");
      const weekdays = calendar.querySelector(".calendar-weekdays");
      const days = calendar.querySelector(".calendar-days");
      const output = calendar.querySelector(".calendar-output");
      const previous = calendar.querySelector(".calendar-previous");
      const next = calendar.querySelector(".calendar-next");
      if (
        !(nativeLabel instanceof HTMLElement) ||
        !(nativeInput instanceof HTMLInputElement) ||
        !(enhanced instanceof HTMLElement) ||
        !(caption instanceof HTMLElement) ||
        !(weekdays instanceof HTMLElement) ||
        !(days instanceof HTMLElement) ||
        !(output instanceof HTMLOutputElement) ||
        !(previous instanceof HTMLButtonElement) ||
        !(next instanceof HTMLButtonElement)
      ) {
        continue;
      }

      const requestedMode = calendar.getAttribute("data-attr-mode") || "single";
      const mode = ["single", "range", "multiple"].includes(requestedMode) ? requestedMode : "single";
      const locale = calendar.getAttribute("data-attr-locale") || document.documentElement.lang || navigator.language || "en";
      const requestedWeekStart = Number(calendar.getAttribute("data-attr-weekstart") || "0");
      const weekStart = Number.isInteger(requestedWeekStart) && requestedWeekStart >= 0 && requestedWeekStart <= 6 ? requestedWeekStart : 0;
      const min = validIsoDate(calendar.getAttribute("data-attr-min")) || "";
      const max = validIsoDate(calendar.getAttribute("data-attr-max")) || "";
      const disabled = truthy(calendar.getAttribute("data-attr-disabled"));
      const readonly = truthy(calendar.getAttribute("data-attr-readonly"));
      const rawValue = calendar.getAttribute("data-attr-value") || nativeInput.getAttribute("value") || "";
      let selected = parseCalendarValues(rawValue, mode);
      let rangeAnchor = mode === "range" && selected.length === 1 ? selected[0] : null;
      let cursor = initialCalendarMonth(calendar.getAttribute("data-attr-month"), selected[0]);
      let submission = nativeInput;

      if (mode !== "single" && nativeInput.name !== "") {
        const hidden = document.createElement("input");
        hidden.type = "hidden";
        hidden.name = nativeInput.name;
        nativeInput.removeAttribute("name");
        calendar.append(hidden);
        submission = hidden;
      }

      calendar.dataset.mdsCalendar = "true";
      calendar.classList.add("is-enhanced");
      nativeLabel.hidden = true;
      enhanced.hidden = false;
      previous.disabled = disabled;
      next.disabled = disabled;

      previous.addEventListener("click", () => {
        cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1, 12);
        render();
      });
      next.addEventListener("click", () => {
        cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1, 12);
        render();
      });

      const selectDate = (iso) => {
        if (disabled || readonly || (min !== "" && iso < min) || (max !== "" && iso > max)) {
          return;
        }
        if (mode === "multiple") {
          selected = selected.includes(iso) ? selected.filter((value) => value !== iso) : [...selected, iso].sort();
        } else if (mode === "range") {
          if (rangeAnchor === null || selected.length === 2) {
            rangeAnchor = iso;
            selected = [iso];
          } else {
            selected = [rangeAnchor, iso].sort();
            rangeAnchor = null;
          }
        } else {
          selected = [iso];
        }
        const date = parseIsoDate(iso);
        if (date !== null && (date.getMonth() !== cursor.getMonth() || date.getFullYear() !== cursor.getFullYear())) {
          cursor = new Date(date.getFullYear(), date.getMonth(), 1, 12);
        }
        syncValue(true);
        render();
      };

      const render = () => {
        caption.textContent = formatCalendarDate(cursor, locale, { month: "long", year: "numeric" });
        weekdays.replaceChildren();
        const sunday = new Date(2026, 7, 2, 12);
        for (let index = 0; index < 7; index += 1) {
          const day = new Date(sunday);
          day.setDate(sunday.getDate() + ((weekStart + index) % 7));
          const label = document.createElement("span");
          label.textContent = formatCalendarDate(day, locale, { weekday: "short" });
          weekdays.append(label);
        }

        days.replaceChildren();
        const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1, 12);
        const offset = (first.getDay() - weekStart + 7) % 7;
        const gridStart = new Date(first);
        gridStart.setDate(first.getDate() - offset);
        const today = toIsoDate(new Date());
        const buttons = [];
        let tabbable = null;

        for (let index = 0; index < 42; index += 1) {
          const date = new Date(gridStart);
          date.setDate(gridStart.getDate() + index);
          const iso = toIsoDate(date);
          const button = document.createElement("button");
          button.type = "button";
          button.className = "calendar-day";
          button.textContent = String(date.getDate());
          button.dataset.date = iso;
          button.dataset.outside = date.getMonth() === cursor.getMonth() ? "false" : "true";
          button.dataset.today = iso === today ? "true" : "false";
          button.setAttribute("role", "gridcell");
          button.setAttribute("aria-label", formatCalendarDate(date, locale, { dateStyle: "full" }));
          const inRange = mode === "range" && selected.length === 2 && iso >= selected[0] && iso <= selected[1];
          const isSelected = selected.includes(iso) || inRange;
          button.setAttribute("aria-selected", isSelected ? "true" : "false");
          button.dataset.rangeStart = mode === "range" && selected[0] === iso ? "true" : "false";
          button.dataset.rangeEnd = mode === "range" && selected.length === 2 && selected[1] === iso ? "true" : "false";
          button.dataset.rangeMiddle = inRange && !selected.includes(iso) ? "true" : "false";
          button.disabled = disabled || readonly || (min !== "" && iso < min) || (max !== "" && iso > max);
          button.tabIndex = -1;
          if (tabbable === null && (selected.includes(iso) || iso === today)) {
            tabbable = button;
          }
          button.addEventListener("click", () => selectDate(iso));
          button.addEventListener("keydown", (event) => {
            const offsets = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
            const change = offsets[event.key];
            if (change === undefined) {
              return;
            }
            event.preventDefault();
            const target = new Date(date);
            target.setDate(date.getDate() + change);
            const targetIso = toIsoDate(target);
            const currentTarget = days.querySelector('[data-date="' + targetIso + '"]');
            if (currentTarget instanceof HTMLButtonElement) {
              currentTarget.focus();
              return;
            }
            cursor = new Date(target.getFullYear(), target.getMonth(), 1, 12);
            render();
            requestAnimationFrame(() => {
              const nextTarget = days.querySelector('[data-date="' + targetIso + '"]');
              if (nextTarget instanceof HTMLButtonElement) {
                nextTarget.focus();
              }
            });
          });
          buttons.push(button);
          days.append(button);
        }
        const firstCurrent = buttons.find((button) => button.dataset.outside === "false" && !button.disabled);
        (tabbable || firstCurrent || buttons[0]).tabIndex = 0;
        syncValue(false);
      };

      const syncValue = (emit) => {
        const serialized = mode === "range" ? selected.join("..") : mode === "multiple" ? selected.join(",") : selected[0] || "";
        submission.value = serialized;
        if (submission !== nativeInput) {
          nativeInput.value = selected[0] || "";
        }
        calendar.setAttribute("data-value", serialized);
        output.value = formatCalendarSelection(selected, mode, locale);
        output.textContent = output.value;
        if (emit) {
          submission.dispatchEvent(new Event("input", { bubbles: true }));
          submission.dispatchEvent(new Event("change", { bubbles: true }));
        }
      };

      render();
    }
  }

  function validIsoDate(value) {
    return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && parseIsoDate(value) !== null ? value : null;
  }

  function parseIsoDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return null;
    }
    const parts = value.split("-").map(Number);
    const date = new Date(parts[0], parts[1] - 1, parts[2], 12);
    return toIsoDate(date) === value ? date : null;
  }

  function toIsoDate(date) {
    const year = String(date.getFullYear()).padStart(4, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
  }

  function parseCalendarValues(value, mode) {
    const separator = mode === "range" ? ".." : mode === "multiple" ? "," : null;
    const values = separator === null ? [value] : value.split(separator);
    return [...new Set(values.map((entry) => entry.trim()).filter((entry) => validIsoDate(entry) !== null))].sort();
  }

  function initialCalendarMonth(month, selected) {
    if (typeof month === "string" && /^\d{4}-\d{2}$/.test(month)) {
      const parsed = parseIsoDate(month + "-01");
      if (parsed !== null) {
        return parsed;
      }
    }
    const selectedDate = parseIsoDate(selected || "");
    const source = selectedDate || new Date();
    return new Date(source.getFullYear(), source.getMonth(), 1, 12);
  }

  function formatCalendarDate(date, locale, options) {
    try {
      return new Intl.DateTimeFormat(locale, options).format(date);
    } catch {
      return new Intl.DateTimeFormat("en", options).format(date);
    }
  }

  function formatCalendarSelection(selected, mode, locale) {
    const values = selected.map((value) => parseIsoDate(value)).filter((value) => value !== null);
    if (values.length === 0) {
      return "No date selected";
    }
    const formatted = values.map((value) => formatCalendarDate(value, locale, { dateStyle: "medium" }));
    return mode === "range" ? formatted.join(" – ") : formatted.join(", ");
  }

  function setupDataTables() {
    for (const shell of document.querySelectorAll(".data-table-shell")) {
      if (!(shell instanceof HTMLElement) || shell.dataset.mdsDataTable === "true") {
        continue;
      }
      const table = shell.querySelector(".data-table");
      const body = table?.tBodies[0];
      const toolbar = shell.querySelector(".data-table-toolbar");
      const filterInput = shell.querySelector(".data-table-filter-input");
      const summary = shell.querySelector(".data-table-summary");
      const empty = shell.querySelector(".data-table-empty");
      const pagination = shell.querySelector(".data-table-pagination");
      const previous = shell.querySelector(".data-table-previous");
      const next = shell.querySelector(".data-table-next");
      const pageLabel = shell.querySelector(".data-table-page");
      if (
        !(table instanceof HTMLTableElement) ||
        !(body instanceof HTMLTableSectionElement) ||
        !(toolbar instanceof HTMLElement) ||
        !(filterInput instanceof HTMLInputElement) ||
        !(summary instanceof HTMLElement) ||
        !(empty instanceof HTMLElement) ||
        !(pagination instanceof HTMLElement) ||
        !(previous instanceof HTMLButtonElement) ||
        !(next instanceof HTMLButtonElement) ||
        !(pageLabel instanceof HTMLElement)
      ) {
        continue;
      }
      const rows = Array.from(body.children).filter((row) => row instanceof HTMLTableRowElement);
      if (rows.length === 0) {
        continue;
      }

      const requestedPageSize = Number(shell.getAttribute("data-attr-page-size") || rows.length);
      const pageSize = Number.isInteger(requestedPageSize) && requestedPageSize > 0 ? requestedPageSize : rows.length;
      const selectable = truthy(shell.getAttribute("data-attr-selectable"));
      let page = 0;
      let sortKey = "";
      let sortDirection = 1;
      let filteredRows = [...rows];
      let selectAll = null;

      shell.dataset.mdsDataTable = "true";
      shell.classList.add("is-enhanced");
      toolbar.hidden = false;
      if (empty.textContent.trim() === "") {
        empty.textContent = "No rows found.";
      }

      if (selectable) {
        const headerRow = table.tHead?.rows[0];
        if (headerRow !== undefined) {
          const header = document.createElement("th");
          header.className = "data-table-selection";
          header.scope = "col";
          selectAll = document.createElement("input");
          selectAll.type = "checkbox";
          selectAll.setAttribute("aria-label", "Select all visible rows");
          header.append(selectAll);
          headerRow.prepend(header);
          selectAll.addEventListener("change", () => {
            for (const row of filteredRows) {
              const checkbox = row.querySelector(".data-table-row-select");
              if (checkbox instanceof HTMLInputElement && !checkbox.disabled) {
                checkbox.checked = selectAll.checked;
                row.setAttribute("aria-selected", checkbox.checked ? "true" : "false");
              }
            }
            render();
          });
        }
        for (const row of rows) {
          const cell = document.createElement("td");
          cell.className = "data-table-selection";
          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.className = "data-table-row-select";
          checkbox.checked = truthy(row.getAttribute("data-attr-selected"));
          checkbox.disabled = truthy(row.getAttribute("data-attr-disabled"));
          checkbox.setAttribute("aria-label", "Select row");
          row.setAttribute("aria-selected", checkbox.checked ? "true" : "false");
          checkbox.addEventListener("change", () => {
            row.setAttribute("aria-selected", checkbox.checked ? "true" : "false");
            render();
          });
          cell.append(checkbox);
          row.prepend(cell);
        }
      }

      for (const header of table.querySelectorAll("thead th[data-column-key]")) {
        if (!(header instanceof HTMLTableCellElement) || !truthy(header.getAttribute("data-attr-sortable"))) {
          continue;
        }
        const key = header.getAttribute("data-column-key") || "";
        const label = header.textContent?.trim() || key;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "data-table-sort";
        button.textContent = label;
        const indicator = document.createElement("span");
        indicator.className = "data-table-sort-indicator";
        indicator.setAttribute("aria-hidden", "true");
        indicator.textContent = "↕";
        button.append(indicator);
        header.replaceChildren(button);
        button.addEventListener("click", () => {
          sortDirection = sortKey === key ? sortDirection * -1 : 1;
          sortKey = key;
          for (const item of table.querySelectorAll("thead th")) {
            item.removeAttribute("aria-sort");
          }
          header.setAttribute("aria-sort", sortDirection === 1 ? "ascending" : "descending");
          indicator.textContent = sortDirection === 1 ? "↑" : "↓";
          page = 0;
          render();
        });
      }

      filterInput.addEventListener("input", () => {
        page = 0;
        render();
      });
      previous.addEventListener("click", () => {
        page = Math.max(0, page - 1);
        render();
      });
      next.addEventListener("click", () => {
        page += 1;
        render();
      });

      const render = () => {
        const query = filterInput.value.trim().toLocaleLowerCase();
        filteredRows = rows.filter((row) => query === "" || (row.textContent || "").toLocaleLowerCase().includes(query));
        if (sortKey !== "") {
          filteredRows.sort((left, right) => compareTableValues(tableCellValue(left, sortKey), tableCellValue(right, sortKey)) * sortDirection);
        }
        const pages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
        page = Math.min(page, pages - 1);
        const start = page * pageSize;
        const visibleRows = new Set(filteredRows.slice(start, start + pageSize));
        for (const row of filteredRows) {
          body.append(row);
        }
        for (const row of rows) {
          row.hidden = !visibleRows.has(row);
        }

        const selectedCount = rows.filter((row) => {
          const checkbox = row.querySelector(".data-table-row-select");
          return checkbox instanceof HTMLInputElement && checkbox.checked;
        }).length;
        const rangeStart = filteredRows.length === 0 ? 0 : start + 1;
        const rangeEnd = Math.min(start + pageSize, filteredRows.length);
        summary.textContent = (selectable ? selectedCount + " of " + rows.length + " selected · " : "") + rangeStart + "–" + rangeEnd + " of " + filteredRows.length + " rows";
        pageLabel.textContent = "Page " + (page + 1) + " of " + pages;
        previous.disabled = page === 0;
        next.disabled = page >= pages - 1;
        pagination.hidden = filteredRows.length <= pageSize;
        empty.hidden = filteredRows.length !== 0;
        table.hidden = filteredRows.length === 0;
        if (selectAll instanceof HTMLInputElement) {
          const visibleCheckboxes = filteredRows
            .map((row) => row.querySelector(".data-table-row-select"))
            .filter((checkbox) => checkbox instanceof HTMLInputElement && !checkbox.disabled);
          const checked = visibleCheckboxes.filter((checkbox) => checkbox.checked).length;
          selectAll.checked = visibleCheckboxes.length > 0 && checked === visibleCheckboxes.length;
          selectAll.indeterminate = checked > 0 && checked < visibleCheckboxes.length;
        }
      };

      render();
    }
  }

  function tableCellValue(row, key) {
    const cell = Array.from(row.cells).find((candidate) => candidate.getAttribute("data-column-key") === key);
    return cell?.textContent?.trim() || "";
  }

  function compareTableValues(left, right) {
    const leftNumber = Number(left.replace(/[^0-9.+-]/g, ""));
    const rightNumber = Number(right.replace(/[^0-9.+-]/g, ""));
    if (left !== "" && right !== "" && Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
      return leftNumber - rightNumber;
    }
    return left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" });
  }

  function setupContextMenus() {
    for (const contextMenu of document.querySelectorAll(".context-menu")) {
      if (!(contextMenu instanceof HTMLDetailsElement) || contextMenu.dataset.mdsContextMenu === "true") {
        continue;
      }
      const trigger = contextMenu.querySelector(".context-menu-trigger");
      const content = contextMenu.querySelector(".context-menu-content");
      if (!(trigger instanceof HTMLElement) || !(content instanceof HTMLElement)) {
        continue;
      }
      contextMenu.dataset.mdsContextMenu = "true";
      contextMenu.classList.add("is-enhanced");

      trigger.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        contextMenu.open = true;
        contextMenu.classList.add("is-context-open");
        content.style.left = "0px";
        content.style.top = "0px";
        requestAnimationFrame(() => {
          const rect = content.getBoundingClientRect();
          const left = Math.max(8, Math.min(event.clientX, window.innerWidth - rect.width - 8));
          const top = Math.max(8, Math.min(event.clientY, window.innerHeight - rect.height - 8));
          content.style.left = left + "px";
          content.style.top = top + "px";
          const first = content.querySelector(".menu-item-control:not(:disabled)");
          if (first instanceof HTMLButtonElement) {
            first.focus();
          }
        });
      });
      contextMenu.addEventListener("toggle", () => {
        if (!contextMenu.open) {
          contextMenu.classList.remove("is-context-open");
          content.removeAttribute("style");
        }
      });
      content.addEventListener("click", (event) => {
        if (event.target instanceof Element && event.target.closest(".menu-item-control") !== null) {
          contextMenu.open = false;
        }
      });
      document.addEventListener("pointerdown", (event) => {
        if (contextMenu.open && event.target instanceof Node && !contextMenu.contains(event.target)) {
          contextMenu.open = false;
        }
      });
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && contextMenu.open) {
          contextMenu.open = false;
          trigger.focus();
        }
      });
    }
  }

  function setupMenubars() {
    for (const menubar of document.querySelectorAll(".menubar")) {
      if (!(menubar instanceof HTMLElement) || menubar.dataset.mdsMenubar === "true") {
        continue;
      }
      const menus = Array.from(menubar.querySelectorAll(".dropdown-menu"));
      const triggers = menus.map((menu) => menu.querySelector("summary")).filter((trigger) => trigger instanceof HTMLElement);
      if (triggers.length === 0) {
        continue;
      }
      menubar.dataset.mdsMenubar = "true";
      menubar.classList.add("is-enhanced");
      triggers.forEach((trigger, index) => {
        trigger.setAttribute("role", "menuitem");
        trigger.tabIndex = index === 0 ? 0 : -1;
        trigger.addEventListener("click", () => closeSiblingMenus(menus, trigger.closest("details")));
        trigger.addEventListener("keydown", (event) => {
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            const change = event.key === "ArrowRight" ? 1 : -1;
            const target = triggers[(index + change + triggers.length) % triggers.length];
            triggers.forEach((item) => { item.tabIndex = item === target ? 0 : -1; });
            target.focus();
          } else if (event.key === "ArrowDown") {
            event.preventDefault();
            const details = trigger.closest("details");
            if (details instanceof HTMLDetailsElement) {
              closeSiblingMenus(menus, details);
              details.open = true;
              requestAnimationFrame(() => {
                const first = details.querySelector(".menu-item-control:not(:disabled)");
                if (first instanceof HTMLButtonElement) {
                  first.focus();
                }
              });
            }
          } else if (event.key === "Escape") {
            closeSiblingMenus(menus, null);
            trigger.focus();
          }
        });
      });
      menubar.addEventListener("click", (event) => {
        if (event.target instanceof Element && event.target.closest(".menu-item-control") !== null) {
          closeSiblingMenus(menus, null);
        }
      });
      document.addEventListener("pointerdown", (event) => {
        if (event.target instanceof Node && !menubar.contains(event.target)) {
          closeSiblingMenus(menus, null);
        }
      });
    }
  }

  function closeSiblingMenus(menus, keep) {
    for (const menu of menus) {
      if (menu instanceof HTMLDetailsElement && menu !== keep) {
        menu.open = false;
      }
    }
  }

  function setupMessageScrollers() {
    for (const scroller of document.querySelectorAll(".message-scroller")) {
      if (!(scroller instanceof HTMLElement) || scroller.dataset.mdsMessageScroller === "true") {
        continue;
      }
      const viewport = scroller.querySelector(".message-scroller-viewport");
      const content = scroller.querySelector(".message-scroller-content");
      const button = scroller.querySelector(".message-scroller-button");
      if (!(viewport instanceof HTMLElement) || !(content instanceof HTMLElement) || !(button instanceof HTMLButtonElement)) {
        continue;
      }
      const followValue = scroller.getAttribute("data-attr-follow");
      const follow = followValue === null ? true : truthy(followValue);
      const height = scroller.getAttribute("data-attr-height");
      if (height !== null && /^\d+(?:\.\d+)?(?:px|rem|vh|dvh|%)$/.test(height)) {
        viewport.style.maxHeight = height;
      }
      scroller.dataset.mdsMessageScroller = "true";
      scroller.classList.add("is-enhanced");
      let atEnd = true;
      const update = () => {
        atEnd = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <= 32;
        button.hidden = atEnd;
        button.tabIndex = atEnd ? -1 : 0;
      };
      viewport.addEventListener("scroll", update, { passive: true });
      button.addEventListener("click", () => {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: "smooth" });
      });
      const observer = new MutationObserver(() => {
        if (follow && atEnd) {
          viewport.scrollTop = viewport.scrollHeight;
        }
        update();
      });
      observer.observe(content, { childList: true, subtree: true, characterData: true });
      requestAnimationFrame(() => {
        if (follow) {
          viewport.scrollTop = viewport.scrollHeight;
        }
        update();
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setup, { once: true });
  } else {
    setup();
  }
})();`;
