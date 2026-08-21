/* Rich-only data-table enhancement. Portable primitive behavior comes from @mds-crate/blocks. */
(() => {
  const truthy = (value) =>
    value !== null && value.trim() !== "" && !["false", "0", "off", "no"].includes(value.trim().toLowerCase());

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

  const setup = () => {
    setupDataTables();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setup, { once: true });
  } else {
    setup();
  }
})();

/* Rich-only message-scroller enhancement. */
(() => {
  const truthy = (value) =>
    value !== null && value.trim() !== "" && !["false", "0", "off", "no"].includes(value.trim().toLowerCase());

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

  const setup = () => {
    setupMessageScrollers();
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", setup, { once: true });
  } else {
    setup();
  }
})();
