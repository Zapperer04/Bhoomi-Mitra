/**
 * toast.js — Shared notification & confirm dialog utility
 * Replaces ALL browser-native alert() and confirm() calls.
 *
 * Usage:
 *   Toast.success("Crop posted!") / Toast.error("Failed") / Toast.warn / Toast.info
 *   const ok = await Toast.confirm("Delete this crop?", { danger: true })
 */

(function () {
  "use strict";

  // ── Create container once ──────────────────────────────────────────────────
  let _container = null;

  function _getContainer() {
    if (!_container) {
      _container = document.createElement("div");
      _container.id = "toast-container";
      document.body.appendChild(_container);
    }
    return _container;
  }

  // ── Toast ──────────────────────────────────────────────────────────────────

  const TYPES = {
    success: { icon: "✅", label: "Success"  },
    error:   { icon: "❌", label: "Error"    },
    warning: { icon: "⚠️", label: "Warning"  },
    info:    { icon: "ℹ️", label: "Info"     },
  };

  /**
   * Show a toast notification.
   * @param {string} message  - Main message text.
   * @param {"success"|"error"|"warning"|"info"} type
   * @param {number} duration - Auto-dismiss delay in ms (default 4000; 0 = no auto)
   */
  function show(message, type = "info", duration = 4200) {
    const meta = TYPES[type] || TYPES.info;
    const el   = document.createElement("div");
    el.className = `toast toast-${type}`;

    el.innerHTML = `
      <span class="toast-icon">${meta.icon}</span>
      <div class="toast-body">
        <div class="toast-title">${meta.label}</div>
        <div class="toast-msg">${message}</div>
      </div>
      <button class="toast-close" aria-label="Close">✕</button>
      ${duration > 0 ? `<div class="toast-progress" style="animation-duration:${duration}ms"></div>` : ""}
    `;

    const container = _getContainer();
    container.appendChild(el);

    // Close on X click
    el.querySelector(".toast-close").addEventListener("click", () => _dismiss(el));

    // Auto-dismiss
    if (duration > 0) {
      setTimeout(() => _dismiss(el), duration);
    }

    return el;
  }

  function _dismiss(el) {
    if (el.classList.contains("leaving")) return;
    el.classList.add("leaving");
    el.addEventListener("animationend", () => el.remove(), { once: true });
  }

  // ── Confirm Dialog ─────────────────────────────────────────────────────────

  let _overlay = null;
  let _resolveConfirm = null;

  function _getOverlay() {
    if (!_overlay) {
      _overlay = document.createElement("div");
      _overlay.id = "confirm-overlay";
      _overlay.className = "hidden";
      _overlay.innerHTML = `
        <div class="confirm-box">
          <span class="confirm-icon" id="_confirm-icon"></span>
          <div class="confirm-title" id="_confirm-title"></div>
          <div class="confirm-msg"  id="_confirm-msg"></div>
          <div class="confirm-actions">
            <button class="confirm-btn confirm-btn-cancel" id="_confirm-cancel">Cancel</button>
            <button class="confirm-btn confirm-btn-ok"     id="_confirm-ok">Confirm</button>
          </div>
        </div>
      `;
      document.body.appendChild(_overlay);

      _overlay.querySelector("#_confirm-cancel").addEventListener("click", () => _resolveConfirm?.(false));
      _overlay.querySelector("#_confirm-ok").addEventListener("click",     () => _resolveConfirm?.(true));

      // Click outside to cancel
      _overlay.addEventListener("click", (e) => {
        if (e.target === _overlay) _resolveConfirm?.(false);
      });
    }
    return _overlay;
  }

  /**
   * Show a styled confirm dialog (awaitable, replaces window.confirm).
   * @param {string} message - Question to ask.
   * @param {object} opts
   *   opts.title    - Optional title (default "Are you sure?")
   *   opts.icon     - Emoji icon (default ⚠️)
   *   opts.danger   - If true, OK button is red (default false)
   *   opts.okText   - OK button label (default "Confirm")
   *   opts.cancelText - Cancel label (default "Cancel")
   * @returns {Promise<boolean>}
   */
  function confirm(message, opts = {}) {
    const overlay = _getOverlay();

    overlay.querySelector("#_confirm-icon").textContent  = opts.icon     || "⚠️";
    overlay.querySelector("#_confirm-title").textContent = opts.title    || "Are you sure?";
    overlay.querySelector("#_confirm-msg").textContent   = message;

    const okBtn     = overlay.querySelector("#_confirm-ok");
    const cancelBtn = overlay.querySelector("#_confirm-cancel");
    okBtn.textContent     = opts.okText     || "Confirm";
    cancelBtn.textContent = opts.cancelText || "Cancel";

    if (opts.danger) { okBtn.classList.add("danger"); }
    else             { okBtn.classList.remove("danger"); }

    overlay.classList.remove("hidden");

    return new Promise((resolve) => {
      _resolveConfirm = (val) => {
        overlay.classList.add("hidden");
        _resolveConfirm = null;
        resolve(val);
      };
    });
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  window.Toast = {
    success: (msg, dur)  => show(msg, "success", dur),
    error:   (msg, dur)  => show(msg, "error",   dur),
    warn:    (msg, dur)  => show(msg, "warning",  dur),
    info:    (msg, dur)  => show(msg, "info",     dur),
    confirm,
  };

})();
