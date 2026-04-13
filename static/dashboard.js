/**
 * dashboard.js — Farmer Dashboard
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

  if (!json.success) throw new Error(json.error || "Request failed");
  return json.data;
}

const STATUS_MAP = {
  active: "status.active",
  partially_sold: "status.partially_sold",
  negotiating: "status.negotiating",
  sold: "status.sold",
  pending: "status.pending",
  expired: "status.expired",
  removed: "status.removed",
  completed: "status.completed",
  disputed: "status.disputed"
};

function tStatus(status) {
  return DT.t(STATUS_MAP[status] || "status.active");
}

/** Helper to disable button during API call and refresh dashboard */
async function runAction(btn, task) {
  if (!btn || btn.disabled) return;
  btn.disabled = true;
  const oldText = btn.textContent;
  btn.textContent = "...";
  try {
    await task();
    await loadDashboardData(); // Always re-fetch from backend as per hardening rule 5
  } catch (err) {
    Toast.error(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = oldText;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!localStorage.getItem("access_token")) { location.href = "/login"; return; }
  await DT.ready;

  await initHeader();
  await loadDashboardData();

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem("access_token");
      location.href = "/login";
    });
  }
});

async function initHeader() {
  try {
    const me = await apiCall("/api/me");
    const initial = (me.name || "?").charAt(0).toUpperCase();
    document.getElementById("navAvatar").textContent = initial;
    document.getElementById("navName").textContent   = me.name || "Profile";
  } catch (err) { console.error("Profile load failed", err); }
}

async function loadDashboardData() {
  const activeContainer   = document.getElementById("activeCropContainer");
  const historyContainer  = document.getElementById("historyCropContainer");
  const interestContainer = document.getElementById("interestContainer");

  try {
    const cropsPromise = apiCall("/api/crops").catch(err => {
      console.error("Crops load failed:", err);
      return []; // Fallback 
    });
    const interestsPromise = apiCall("/api/interests/farmer").catch(err => {
      console.error("Interests load failed:", err);
      return []; // Fallback
    });

    const [crops, interests] = await Promise.all([cropsPromise, interestsPromise]);

    renderCrops(crops, interests, activeContainer, historyContainer);
    renderInterests(interests, interestContainer);
    loadUnreadCount();

  } catch (err) {
    console.error("Dashboard data load failed:", err);
    if (activeContainer) activeContainer.innerHTML = `<div class="loading-state">Error: ${err.message}</div>`;
  }
}

function renderCrops(crops, interests, activeContainer, historyContainer) {
  // Crop status is: active | partially_sold | sold | removed
  // "negotiating" never appears on Crop — only on Interest
  const active = crops.filter(c => ["active", "partially_sold"].includes(c.status));
  const history = crops.filter(c => !["active", "partially_sold"].includes(c.status));

  if (activeContainer) {
    activeContainer.innerHTML = "";
    if (active.length === 0) {
      activeContainer.innerHTML = `<div class="loading-state">${DT.t("no_active_crops")}</div>`;
    } else {
      active.forEach(crop => {
        const card = document.createElement("div");
        card.className = "crop-card";
        const availDate = crop.availability_date ? new Date(crop.availability_date).toLocaleDateString() : 'N/A';
        
        // TC-25: Check if this crop has any FULLY ACCEPTED interests
        const finalizedInterest = (interests || []).find(i => i.crop_id === crop.id && i.status === "accepted" && i.accepted_by === "both");
        const activeInterestCount = (interests || []).filter(i => i.crop_id === crop.id && ["pending", "negotiating"].includes(i.status)).length;
        
        const deleteBtnAttr = finalizedInterest ? 'disabled title="Cannot remove a crop with a finalized deal." style="opacity:0.5; cursor:not-allowed;"' : '';

        const waitlistCount = crop.waitlist_count || 0;
        const waitlistBadge = waitlistCount > 0 ? `<span class="waitlist-badge">👥 Waitlist: ${waitlistCount}</span>` : '';

        // TC-33: Show available vs active deals qty
        const activeDealQty = crop.active_deal_qty || 0;
        const stockInfo = `<b>${DT.t("label.qty")}:</b> ${crop.quantity_remaining} / ${crop.quantity} ${DT.t("farmer.quantity_quintals")}`;
        const activeInfo = activeDealQty > 0 ? `<div class="active-deals-hint" style="font-size:0.75em; color:var(--amber-dark); font-weight:700;">• ${activeDealQty} ${DT.t("quintals")} in active deals</div>` : '';

        card.innerHTML = `
          <div class="crop-header">
            <h4>${crop.crop_name}</h4>
            ${waitlistBadge}
          </div>
          <div class="stock-container">
            <p>${stockInfo}</p>
            ${activeInfo}
          </div>
          <p><b>Available From:</b> ${availDate}</p>
          <p><b>${DT.t("label.status")}:</b> ${tStatus(crop.status)}</p>
          
          <!-- Nested Interests Container (TC-26) -->
          <div class="nested-interests" id="interests-for-crop-${crop.id}">
            <div class="loading-state" style="font-size:0.8em; opacity:0.6;">Searching for interests...</div>
          </div>

          <div class="crop-actions" style="margin-top:1rem; border-top:1px solid #eee; padding-top:0.75rem; display:flex; gap:0.5rem;">
            <button class="edit-btn secondary-btn" data-id="${crop.id}">Edit</button>
            <button class="delete-btn danger-btn" data-id="${crop.id}" ${deleteBtnAttr}>${DT.t("remove_listing")}</button>
          </div>
        `;
          card.querySelector(".edit-btn").onclick = () => openEditModal(crop);
          card.querySelector(".delete-btn").onclick = (e) => {
            const btn = e.target;
            const msg = activeInterestCount > 0 
                ? `⚠️ ${activeInterestCount} contractor(s) have active interest in this listing. \n\n` + DT.t("confirm_remove_listing")
                : DT.t("confirm_remove_listing");
            
            Toast.confirm(msg, { danger: true }).then(ok => {
                if (ok) runAction(btn, () => apiCall(`/api/crops/${crop.id}`, { method: "DELETE" }));
            });
          };

          activeContainer.appendChild(card);
      });
    }
  }

  if (historyContainer) {
    historyContainer.innerHTML = "";
    if (history.length === 0) {
      historyContainer.innerHTML = `<div class="loading-state">${DT.t("no_history")}</div>`;
    } else {
      history.forEach(crop => {
        const card = document.createElement("div");
        card.className = "crop-card history";
        card.innerHTML = `
          <h4>${crop.crop_name}</h4>
          <p><b>${DT.t("label.status")}:</b> ${tStatus(crop.status)}</p>
          <button class="hard-delete-btn" data-id="${crop.id}">${DT.t("btn.clear")}</button>
        `;
        card.querySelector(".hard-delete-btn").onclick = (e) => {
          runAction(e.target, () => apiCall(`/api/crops/${crop.id}/hard`, { method: "DELETE" }));
        };
        historyContainer.appendChild(card);
      });
    }
  }
}

function renderInterests(interests, container) {
  // TC-26: Group interests by crop_id
  const groups = {};
  interests.forEach(i => {
    if (!groups[i.crop_id]) groups[i.crop_id] = [];
    groups[i.crop_id].push(i);
  });

  // Find all nested containers in the crop cards
  document.querySelectorAll(".nested-interests").forEach(div => {
    const cropId = parseInt(div.id.replace("interests-for-crop-", ""));
    const cropInterests = groups[cropId] || [];
    
    div.innerHTML = "";
    if (cropInterests.length === 0) {
      div.innerHTML = `<div class="no-interests-hint" style="font-size:0.85em; color:#9ba3af; padding:4px 0;">No active interests yet.</div>`;
      return;
    }

    cropInterests.forEach(i => {
      const item = document.createElement("div");
      item.className = `interest-item status-${i.status}`;
      
      const chatLink = `<a class="btn-message-sm" href="/messages?deal=${i.id}" title="Open Chat">💬</a>`;
      let badge = "";
      let actions = "";

      const ab = i.accepted_by;
      const st = i.status;

      if (st === "accepted" && ab === "both") {
        badge = `<span class="badge-mini accepted">✓ Closed</span>`;
      } else if (st === "rejected") {
        badge = `<span class="badge-mini rejected">Rejected</span>`;
      } else if (ab === "farmer") {
        badge = `<span class="badge-mini pending">Waiting...</span>`;
        actions = `<button class="btn-action-sm withdraw" data-id="${i.id}" title="Withdraw">↩</button>`;
      } else if (ab === "contractor") {
        badge = `<span class="badge-mini action">Confirm!</span>`;
        actions = `<button class="btn-action-sm accept" data-id="${i.id}">Accept</button>`;
      } else {
        actions = `<button class="btn-action-sm accept" data-id="${i.id}">Accept</button>`
                + `<button class="btn-action-sm reject" data-id="${i.id}">×</button>`;
      }

      item.innerHTML = `
        <div class="interest-row">
          <div class="interest-info">
            <span class="con-name">${i.contractor_name}</span>
            <span class="price-pill">₹${i.price_offered}</span>
            ${badge}
          </div>
          <div class="interest-actions">
            ${actions}
            ${chatLink}
          </div>
        </div>
      `;

      item.querySelector(".btn-action-sm.accept")?.addEventListener("click", (e) => {
        runAction(e.target, () => apiCall(`/api/interests/${i.id}/accept`, { method: "POST" }));
      });
      item.querySelector(".btn-action-sm.reject")?.addEventListener("click", (e) => {
        runAction(e.target, () => apiCall(`/api/interests/${i.id}/reject`, { method: "POST" }));
      });
      item.querySelector(".btn-action-sm.withdraw")?.addEventListener("click", (e) => {
        runAction(e.target, () => apiCall(`/api/interests/${i.id}/withdraw_accept`, { method: "POST" }));
      });

      div.appendChild(item);
    });
  });

  // TC-26: Interests are exclusively nested now. Handled above.
}

async function loadUnreadCount() {
  try {
    const data = await apiCall("/api/messages/unread-count");
    const badge = document.getElementById("unreadBadge");
    if (badge) {
      if (data.unread_count > 0) {
        badge.textContent = data.unread_count;
        badge.classList.remove("hidden");
      } else {
        badge.classList.add("hidden");
      }
    }
  } catch (err) { console.error("Unread count load failed", err); }
}

/** TC-35, TC-36, TC-37: Edit Listing Flow */
function openEditModal(crop) {
    const modal = document.createElement("div");
    modal.className = "custom-modal-overlay";
    modal.innerHTML = `
      <div class="custom-modal animate-in">
        <div class="modal-header">
            <h3 style="margin:0;">Edit Listing: ${crop.crop_name}</h3>
            <button class="modal-close" style="background:none; border:none; font-size:1.5rem; cursor:pointer;" onclick="this.closest('.custom-modal-overlay').remove()">×</button>
        </div>
        <div class="modal-body" style="padding:1rem 0;">
            <div class="form-group" style="margin-bottom:1rem;">
                <label style="display:block; margin-bottom:0.4rem; font-weight:600;">Price (₹/q)</label>
                <input type="number" id="editPrice" value="${crop.price}" min="0" step="0.5" style="width:100%; padding:0.6rem; border:1px solid #ddd; border-radius:4px;">
            </div>
            <div id="priceWarn" class="edit-warning-box danger" style="display:none; padding:0.8rem; background:#fef2f2; border:1px solid #fecaca; color:#991b1b; border-radius:4px; font-size:0.85rem; margin-bottom:1rem;">
                <p style="margin:0;">⚠️ <b>Price Change Detection</b></p>
                <p style="margin:0.4rem 0 0 0;">Changing the price will automatically void all <b>${crop.active_deal_qty || 0}</b> active interests. Contractors will be notified.</p>
            </div>

            <div class="form-group" style="margin-bottom:1rem;">
                <label style="display:block; margin-bottom:0.4rem; font-weight:600;">Total Quantity (q)</label>
                <input type="number" id="editQty" value="${crop.quantity}" min="1" style="width:100%; padding:0.6rem; border:1px solid #ddd; border-radius:4px;">
            </div>
            <div id="qtyWarn" class="edit-warning-box warning" style="display:none; padding:0.8rem; background:#fffbeb; border:1px solid #fde68a; color:#92400e; border-radius:4px; font-size:0.85rem; margin-bottom:1rem;">
                <p style="margin:0;">⚠️ <b>Quantity Reduction Alert</b></p>
                <p style="margin:0.4rem 0 0 0;">Reducing quantity below active proposals will flag them for correction. Contractors will need to revise their bids.</p>
            </div>
        </div>
        <div class="modal-footer" style="display:flex; justify-content:flex-end; gap:0.5rem; padding-top:1rem; border-top:1px solid #eee;">
            <button id="cancelEdit" class="secondary-btn" style="padding:0.6rem 1.2rem; border-radius:4px; cursor:pointer;">Cancel</button>
            <button id="saveEdit" class="btn-primary" style="padding:0.6rem 1.2rem; background:#059669; color:white; border:none; border-radius:4px; cursor:pointer;">Confirm & Save</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const priceInput = modal.querySelector("#editPrice");
    const qtyInput   = modal.querySelector("#editQty");
    const priceWarn  = modal.querySelector("#priceWarn");
    const qtyWarn    = modal.querySelector("#qtyWarn");

    const checkWarnings = () => {
        if (crop.active_deal_qty > 0) {
            priceWarn.style.display = (Math.abs(parseFloat(priceInput.value) - crop.price) > 0.01) ? "block" : "none";
            qtyWarn.style.display   = (parseInt(qtyInput.value) < crop.quantity) ? "block" : "none";
        }
    };

    priceInput.oninput = checkWarnings;
    qtyInput.oninput   = checkWarnings;

    modal.querySelector("#cancelEdit").onclick = () => modal.remove();
    modal.querySelector("#saveEdit").onclick = async (e) => {
        const payload = {
            price: parseFloat(priceInput.value),
            quantity: parseInt(qtyInput.value),
            force: true
        };
        
        try {
            await runAction(e.target, () => apiCall(`/api/crops/${crop.id}`, {
                method: "PUT",
                body: JSON.stringify(payload)
            }));
            modal.remove();
        } catch (err) {
            Toast.error(err.message);
        }
    };
}