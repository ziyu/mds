import { createEnhancementScript } from "./create-script.js";

const implementation = String.raw`  function setupCalendars() {
    for (const calendar of document.querySelectorAll("[data-mds-role='calendar'], .calendar")) {
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
  }`;

export const calendarEnhancementsScript = createEnhancementScript(["setupCalendars"], implementation);
