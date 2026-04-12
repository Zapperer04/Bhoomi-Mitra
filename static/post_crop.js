/**
 * post_crop.js
 * Handles crop posting with exact duplicate detection.
 * Rule: same crop_name + qty + price + location + availability_date → block with inline dialog.
 * Different availability_date = different harvest batch → always allowed.
 */

async function apiCall(url, options = {}) {
  const token = localStorage.getItem("access_token");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(url, { ...options, headers });
  const json = await res.json();

  if (res.status === 401) {
    localStorage.removeItem("access_token");
    window.location.href = "/login";
    return;
  }

  if (!json.success) {
    const err = new Error(json.error || "Request failed");
    err.code   = json.data?.code;        // e.g. "duplicate_listing"
    err.status = res.status;
    throw err;
  }
  return json.data;
}

// ── DUPLICATE WARNING DIALOG ────────────────────────────────────────────────
function showDuplicateDialog(btn, payload) {
  // Remove previous dialog if any
  document.getElementById("dupDialog")?.remove();

  const dialog = document.createElement("div");
  dialog.id = "dupDialog";
  dialog.innerHTML = `
    <div class="dup-overlay">
      <div class="dup-card">
        <div class="dup-icon">⚠️</div>
        <h3>Duplicate Listing Detected</h3>
        <p>
          You already have an <strong>active listing</strong> for this crop
          with the <strong>exact same details</strong> (name, quantity, price,
          location &amp; availability date).
        </p>
        <p class="dup-hint">
          💡 To post a different harvest batch, change the
          <strong>Availability Date</strong> to a different date. If you still want to post this as an identical twin listing, choose Post Anyway.
        </p>
        <div class="dup-actions" style="margin-top:20px; display:flex; gap:12px; justify-content:flex-end;">
          <button id="dupCancel" class="dup-btn-secondary" style="padding:10px 16px; background:transparent; border:1px solid #d1d5db; border-radius:6px; cursor:pointer;">Update Existing / Change Date</button>
          <button id="dupForce" class="dup-btn-primary" style="padding:10px 16px; background:#ef4444; color:white; border:none; border-radius:6px; cursor:pointer;">Post Anyway</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(dialog);

  document.getElementById("dupCancel").onclick = () => {
    dialog.remove();
    // Re-enable submit button and focus the date field
    if (btn) { btn.disabled = false; btn.textContent = "Post Crop"; }
    document.getElementById("availabilityDate")?.focus();
  };

  document.getElementById("dupForce").onclick = async () => {
    dialog.remove();
    payload.force = true;
    if (btn) { btn.disabled = true; btn.textContent = "Posting..."; }
    try {
      await apiCall("/api/crops", { method: "POST", body: JSON.stringify(payload) });
      Toast.success("Crop posted successfully!");
      setTimeout(() => { window.location.href = "/farmer/dashboard"; }, 1500);
    } catch (err) {
      Toast.error(err.message);
      if (btn) { btn.disabled = false; btn.textContent = "Post Crop"; }
    }
  };

  // Close on overlay click
  dialog.querySelector(".dup-overlay").onclick = (e) => {
    if (e.target === e.currentTarget) {
      dialog.remove();
      if (btn) { btn.disabled = false; btn.textContent = "Post Crop"; }
    }
  };
}

// ── BOOT ────────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  // Header Initialization
  try {
    const me = await apiCall("/api/me");
    if (me) {
      const initial = (me.name || "?").charAt(0).toUpperCase();
      document.getElementById("navAvatar").textContent = initial;
      document.getElementById("navName").textContent   = me.name || "Profile";
    }

    const data = await apiCall("/api/messages/unread-count");
    const badge = document.getElementById("unreadBadge");
    if (badge && data.unread_count > 0) {
      badge.textContent = data.unread_count;
      badge.classList.remove("hidden");
    }
  } catch (err) { console.error("Header init failed", err); }

  // Logout
  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    localStorage.removeItem("access_token");
    window.location.href = "/login";
  });

  // Set date min to today
  const dateInput = document.getElementById("availabilityDate");
  if (dateInput) dateInput.min = new Date().toISOString().split("T")[0];

  // Form submit
  const form = document.getElementById("postCropForm");
  const btn  = form?.querySelector(".submit-btn");

  if (form) {
    form.onsubmit = async (e) => {
      e.preventDefault();
      if (btn && btn.disabled) return;

      const payload = {
        cropName:         form.querySelector('input[name="crop"]').value.trim(),
        quantity:         parseInt(form.querySelector('input[name="quantity"]').value) || 0,
        price:            parseFloat(form.querySelector('input[name="price"]').value) || 0,
        location:         form.querySelector('input[name="location"]').value.trim(),
        availabilityDate: form.querySelector('input[name="availability"]').value,
      };

      // TC-03: Frontend Validation before API call
      if (payload.quantity <= 0) {
        Toast.error("Quantity must be greater than zero");
        return;
      }
      if (payload.price < 0) {
        Toast.error("Price cannot be negative");
        return;
      }

      if (btn) { btn.disabled = true; btn.textContent = "Posting..."; }

      try {
        await apiCall("/api/crops", { method: "POST", body: JSON.stringify(payload) });
        Toast.success("Crop posted successfully!");
        setTimeout(() => { window.location.href = "/farmer/dashboard"; }, 1500);
      } catch (err) {
        if (err.code === "duplicate_listing") {
          // Show inline warning dialog with "Post Anyway" option
          showDuplicateDialog(btn, payload);
        } else {
          Toast.error(err.message);
          if (btn) { btn.disabled = false; btn.textContent = "Post Crop"; }
        }
      }
    };
  }
});