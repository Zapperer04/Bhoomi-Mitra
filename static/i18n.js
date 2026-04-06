/**
 * i18n.js
 *
 * FIX: Previously this file made a separate fetch to /api/ui-strings
 * (backend translator.py), which is a completely different translation
 * dictionary from dashboard_i18n.js.  Keys added to dashboard_i18n.js
 * (e.g. "farmer.contractors_sub", "farmer.chatbot_sub") were never in
 * translator.py so those data-i18n attributes always rendered raw.
 *
 * The dashboard_i18n.js file (which loads first) already:
 *   1. Builds the full STRINGS table with all 10 languages
 *   2. Calls _scanDOM() to translate every [data-i18n] element
 *   3. Resolves DT.ready only AFTER the DOM scan completes
 *
 * So this file now just re-applies translations after DT.ready in case
 * any elements were added late, and exposes a langchange listener.
 * No separate API call needed.
 */

(async function () {
  "use strict";

  if (typeof window.DT === "undefined") {
    console.error("[i18n] DT not found — dashboard_i18n.js must load before i18n.js");
    return;
  }

  // DT.ready resolves after _scanDOM() already ran inside dashboard_i18n.js,
  // so by the time we get here the page is already translated.
  // We await it anyway so a second pass catches any elements rendered
  // between script-load and DOMContentLoaded.
  await window.DT.ready;

  function applyAll() {
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key  = el.getAttribute("data-i18n");
      const attr = el.getAttribute("data-i18n-attr");
      const text = window.DT.t(key);

      if (attr) {
        el.setAttribute(attr, text);
        return;
      }

      // Preserve child elements (e.g. unread badge <span> inside a nav link).
      const hasChildEls = [...el.childNodes].some(n => n.nodeType === Node.ELEMENT_NODE);
      if (!hasChildEls) {
        el.textContent = text;
      } else {
        const textNode = [...el.childNodes].find(n => n.nodeType === Node.TEXT_NODE);
        if (textNode) {
          textNode.textContent = text + " ";
        } else {
          el.insertBefore(document.createTextNode(text + " "), el.firstChild);
        }
      }
    });
  }

  /**
   * AUTOMATED UI INITIALIZER
   * Finds #langSelector and populates its dropdown with buttons for all
   * languages defined in dashboard_i18n.js.
   */
  function initLangSelector() {
    const selector = document.getElementById("langSelector");
    if (!selector) return;

    const btn      = selector.querySelector("#langBtn");
    const dropdown = selector.querySelector("#langDropdown");
    const label    = selector.querySelector("#langLabel");

    if (!btn || !dropdown) return;

    const languages = window.DT.getLanguages();
    const current   = window.DT.getLang();

    // 1. Update current label
    if (label) label.textContent = languages[current].label;

    // 2. Populate dropdown
    dropdown.innerHTML = "";
    Object.entries(languages).forEach(([code, cfg]) => {
      const button = document.createElement("button");
      button.setAttribute("data-lang", code);
      button.textContent = cfg.name;
      if (code === current) button.classList.add("active");

      button.onclick = (e) => {
        e.stopPropagation();
        if (code === current) {
          dropdown.classList.add("hidden");
          return;
        }

        window.DT.setLang(code);
        if (label) label.textContent = cfg.label;
        dropdown.classList.add("hidden");

        // Notify all listeners to translate the DOM
        window.dispatchEvent(new CustomEvent("bhoomi:langchange"));
      };

      dropdown.appendChild(button);
    });

    // 3. Toggle Logic
    btn.onclick = (e) => {
      e.stopPropagation();
      dropdown.classList.toggle("hidden");
    };

    // 4. Click-outside to close
    document.addEventListener("click", () => dropdown.classList.add("hidden"));
  }

  applyAll();
  initLangSelector();

  // Re-run whenever a language-switching event occurs.
  window.addEventListener("bhoomi:langchange", applyAll);

})();