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

  applyAll();

  // Re-run whenever a language-switcher component fires this event.
  window.addEventListener("bhoomi:langchange", applyAll);

})();