import type { ThemeBlockPackSource } from "@mds-crate/theme-loader";
import { calendarEnhancementsScript, formEnhancementsScript } from "../runtime.js";
import { calendarBlockStyles } from "../styles.js";

export const formsBlocks: ThemeBlockPackSource = {
  name: "@mds-crate/blocks/forms",
  profiles: ["forms"],
  supportedBlocks: [
    "form",
    "fieldset",
    "button-group",
    "field",
    "label",
    "help",
    "error",
    "input",
    "input-group",
    "input-otp",
    "combobox",
    "calendar",
    "select",
    "option",
    "textarea",
    "checkbox",
    "radio",
    "radio-group",
    "slider",
    "switch"
  ],
  blocks: "blocks",
  css: "runtime.css",
  js: "runtime.js",
  files: {
    "runtime.css": calendarBlockStyles,
    "runtime.js": [calendarEnhancementsScript, formEnhancementsScript].join("\n"),
    "blocks/form.html": `<form{{ attrs }} class="form" data-mds-role="form" method="{{ attr:method:post }}"{{ optional:action:action }}{{ bool:novalidate }}>
  {{ children }}
  {{ slots }}
</form>`,
    "blocks/fieldset.html": `<fieldset{{ attrs }} class="fieldset"{{ bool:disabled }}>
  <legend>{{ attr:legend }}</legend>
  {{ children }}
  {{ slots }}
</fieldset>`,
    "blocks/button-group.html": `<div{{ attrs }} class="button-group">
  {{ children }}
  {{ slots }}
</div>`,
    "blocks/field.html": `<div{{ attrs }} class="form-field field" data-mds-role="field"{{ optional:invalid:data-invalid }}>
  {{ children }}
  {{ slots }}
</div>`,
    "blocks/label.html": `<label{{ attrs }} class="field-label"{{ optional:for:for }}>{{ attr:text }}</label>`,
    "blocks/help.html": `<div{{ attrs }} class="field-help">
  {{ children }}
</div>`,
    "blocks/error.html": `<div{{ attrs }} class="field-error" role="alert">
  {{ children }}
</div>`,
    "blocks/input.html": `<label{{ attrs }} class="form-field input-field">
  <span class="field-label">{{ attr:label }}</span>
  <input type="{{ attr:type:text }}"{{ optional:name:name }}{{ optional:value:value }}{{ optional:placeholder:placeholder }}{{ optional:autocomplete:autocomplete }}{{ optional:min:min }}{{ optional:max:max }}{{ optional:step:step }}{{ bool:required }}{{ bool:disabled }}{{ bool:readonly }}>
</label>`,
    "blocks/input-group.html": `<div{{ attrs }} class="form-field input-group">
  <label class="input-group-label">
    <span class="field-label">{{ attr:label }}</span>
    <span class="input-group-frame">
      <input class="input-group-control" type="{{ attr:type:text }}"{{ optional:name:name }}{{ optional:value:value }}{{ optional:placeholder:placeholder }}{{ optional:autocomplete:autocomplete }}{{ optional:inputmode:inputmode }}{{ optional:min:min }}{{ optional:max:max }}{{ optional:step:step }}{{ optional:invalid:aria-invalid }}{{ bool:required }}{{ bool:disabled }}{{ bool:readonly }}>
      <span class="input-group-addon input-group-prefix">{{ slot:prefix }}</span>
      <span class="input-group-addon input-group-suffix">{{ slot:suffix }}</span>
    </span>
  </label>
  <div class="input-group-actions">{{ slot:actions }}</div>
  <div class="field-help">{{ slot:help }}</div>
  <div class="field-error" role="alert">{{ slot:error }}</div>
</div>`,
    "blocks/input-otp.html": `<div{{ attrs }} class="form-field input-otp">
  <label class="input-otp-label">
    <span class="field-label">{{ attr:label }}</span>
    <input class="input-otp-control" type="text"{{ optional:name:name }}{{ optional:value:value }}{{ optional:pattern:pattern }}{{ optional:placeholder:placeholder }} inputmode="{{ attr:inputmode:numeric }}" autocomplete="one-time-code" autocapitalize="none" spellcheck="false" maxlength="{{ attr:length:6 }}" size="{{ attr:length:6 }}"{{ optional:invalid:aria-invalid }}{{ bool:required }}{{ bool:disabled }}{{ bool:readonly }}>
  </label>
  <div class="field-help">{{ slot:help }}</div>
  <div class="field-error" role="alert">{{ slot:error }}</div>
</div>`,
    "blocks/combobox.html": `<label{{ attrs }} class="form-field combobox-field">
  <span class="field-label">{{ attr:label }}</span>
  <input class="combobox-control" type="text" list="{{ attr:list:combobox-options }}"{{ optional:name:name }}{{ optional:value:value }}{{ optional:placeholder:placeholder }}{{ optional:autocomplete:autocomplete }}{{ optional:invalid:aria-invalid }}{{ bool:required }}{{ bool:disabled }}{{ bool:readonly }}>
  <datalist id="{{ attr:list:combobox-options }}">
    {{ children }}
  </datalist>
</label>`,
    "blocks/calendar.html": `<div{{ attrs }} class="calendar" data-mds-role="calendar">
  <label class="calendar-native">
    <span class="field-label">{{ attr:label }}</span>
    <input class="calendar-native-input" type="date"{{ optional:name:name }}{{ optional:value:value }}{{ optional:min:min }}{{ optional:max:max }}{{ bool:required }}{{ bool:disabled }}{{ bool:readonly }}>
  </label>
  <div class="calendar-enhanced" role="group" aria-label="{{ attr:label:Choose a date }}" hidden>
    <header class="calendar-header">
      <button class="calendar-previous" type="button" aria-label="Previous month">←</button>
      <strong class="calendar-caption" aria-live="polite"></strong>
      <button class="calendar-next" type="button" aria-label="Next month">→</button>
    </header>
    <div class="calendar-weekdays" aria-hidden="true"></div>
    <div class="calendar-days" role="grid"></div>
    <output class="calendar-output" aria-live="polite"></output>
  </div>
</div>`,
    "blocks/select.html": `<label{{ attrs }} class="form-field select-field">
  <span class="field-label">{{ attr:label }}</span>
  <select{{ optional:name:name }}{{ bool:required }}{{ bool:disabled }}{{ bool:multiple }}>
    {{ children }}
  </select>
</label>`,
    "blocks/option.html": `<option{{ attrs }}{{ optional:value:value }}{{ bool:selected }}{{ bool:disabled }}>{{ attr:label }}</option>`,
    "blocks/textarea.html": `<label{{ attrs }} class="form-field textarea-field">
  <span class="field-label">{{ attr:label }}</span>
  <textarea{{ optional:name:name }}{{ optional:placeholder:placeholder }}{{ optional:rows:rows }}{{ bool:required }}{{ bool:disabled }}{{ bool:readonly }}></textarea>
</label>`,
    "blocks/checkbox.html": `<label{{ attrs }} class="form-field choice-field checkbox">
  <input type="checkbox"{{ optional:name:name }}{{ optional:value:value }}{{ bool:checked }}{{ bool:required }}{{ bool:disabled }}>
  <span>{{ attr:label }}</span>
</label>`,
    "blocks/radio.html": `<label{{ attrs }} class="form-field choice-field radio">
  <input type="radio"{{ optional:name:name }}{{ optional:value:value }}{{ bool:checked }}{{ bool:required }}{{ bool:disabled }}>
  <span>{{ attr:label }}</span>
</label>`,
    "blocks/radio-group.html": `<fieldset{{ attrs }} class="radio-group"{{ bool:disabled }}>
  <legend>{{ attr:legend }}</legend>
  {{ children }}
  {{ slots }}
</fieldset>`,
    "blocks/slider.html": `<label{{ attrs }} class="form-field slider-field">
  <span class="field-label">{{ attr:label }}</span>
  <input type="range"{{ optional:name:name }}{{ optional:min:min }}{{ optional:max:max }}{{ optional:step:step }}{{ optional:value:value }}{{ bool:disabled }}>
</label>`,
    "blocks/switch.html": `<label{{ attrs }} class="form-field choice-field switch">
  <input type="checkbox" role="switch"{{ optional:name:name }}{{ optional:value:value }}{{ bool:checked }}{{ bool:required }}{{ bool:disabled }}>
  <span>{{ attr:label }}</span>
</label>`
  }
};
