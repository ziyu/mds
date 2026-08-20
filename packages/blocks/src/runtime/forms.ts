import { createEnhancementScript } from "./create-script.js";

const implementation = String.raw`  function setupFormValidation() {
    for (const form of document.querySelectorAll("form[data-attr-validate], form[data-mds-validate]")) {
      if (!(form instanceof HTMLFormElement) || form.dataset.mdsValidation === "true") {
        continue;
      }
      const validationValue = form.getAttribute("data-attr-validate") ?? form.getAttribute("data-mds-validate");
      if (validationValue !== "" && !truthy(validationValue)) {
        continue;
      }
      form.dataset.mdsValidation = "true";
      form.addEventListener("invalid", (event) => {
        if (isFormControl(event.target)) {
          updateFieldValidity(event.target);
        }
      }, true);
      for (const field of getFormControls(form)) {
        field.addEventListener("input", () => updateFieldValidity(field));
        field.addEventListener("change", () => updateFieldValidity(field));
        field.addEventListener("blur", () => updateFieldValidity(field));
      }
    }
  }

  function getFormControls(form) {
    return Array.from(form.querySelectorAll("input, select, textarea")).filter((field) =>
      isFormControl(field) && field.type !== "hidden" && field.type !== "submit" && field.type !== "reset" && !field.disabled
    );
  }

  function isFormControl(value) {
    return value instanceof HTMLInputElement || value instanceof HTMLSelectElement || value instanceof HTMLTextAreaElement;
  }

  function updateFieldValidity(field) {
    const valid = field.validity.valid;
    field.setAttribute("aria-invalid", valid ? "false" : "true");
    const wrapper = field.closest("[data-mds-role='field'], .form-field");
    if (wrapper instanceof HTMLElement) {
      wrapper.dataset.invalid = valid ? "false" : "true";
      wrapper.dataset.mdsState = valid ? "valid" : "invalid";
    }
    return valid;
  }`;

export const formEnhancementsScript = createEnhancementScript(["setupFormValidation"], implementation);
