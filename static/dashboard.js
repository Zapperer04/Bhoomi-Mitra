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
  pending: "status.pending"
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

  initHeader();
  loadDashboardData();

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
        card.innerHTML = `
          <h4>${crop.crop_name}</h4>
          <p><b>${DT.t("label.qty")}:</b> ${crop.quantity_remaining} / ${crop.quantity} ${DT.t("farmer.quantity_quintals")}</p>
          <p><b>${DT.t("label.status")}:</b> ${tStatus(crop.status)}</p>
          <button class="delete-btn" data-id="${crop.id}">${DT.t("remove_listing")}</button>
        `;
        card.querySelector(".delete-btn").onclick = async (e) => {
          if (await Toast.confirm(DT.t("confirm_remove_listing"), { danger: true })) {
            runAction(e.target, () => apiCall(`/api/crops/${crop.id}`, { method: "DELETE" }));
          }
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
  if (!container) return;
  container.innerHTML = "";
  if (interests.length === 0) {
    container.innerHTML = `<div class="loading-state">${DT.t("no_interests")}</div>`;
    return;
  }

  interests.forEach(i => {
    const card = document.createElement("div");
    card.className = `interest-card status-${i.status}`;

    // ── Chat link always present ──────────────────────────────────────────
    const chatLink = `<a class="btn-message" href="/messages?deal=${i.id}">${DT.t("open_chat")}</a>`;
    let actions = chatLink;
    let badge   = "";

    // ── State machine per spec Part 5 (Farmer view) ───────────────────────
    const ab = i.accepted_by;  // null | "farmer" | "contractor" | "both"
    const st = i.status;       // pending | negotiating | accepted | rejected

    if (st === "accepted" && ab === "both") {
      // Deal fully closed
      badge = `<span class="status-badge badge-accepted">${DT.t("deal_closed") || "Deal closed ✓"}</span>`;
      if (i.contractor_phone) {
        badge += ` <a class="btn-call" href="tel:${i.contractor_phone}">📞 ${i.contractor_phone}</a>`;
      }
      actions = chatLink;
    } else if (st === "rejected") {
      badge   = `<span class="status-badge badge-rejected">${DT.t("status.rejected") || "Rejected"}</span>`;
      actions = chatLink;
    } else if (ab === "farmer") {
      // Farmer already accepted, waiting for contractor
      badge   = `<span class="status-badge badge-pending">${DT.t("waiting_contractor") || "You accepted — awaiting contractor"}</span>`;
      actions = `<button class="btn-withdraw" data-id="${i.id}">${DT.t("withdraw_btn") || "Withdraw"}</button>`
              + `<button class="btn-reject" data-id="${i.id}">${DT.t("reject_btn")}</button>`
              + chatLink;
    } else if (ab === "contractor") {
      // Contractor already accepted — farmer should finalize
      actions = `<button class="btn-accept btn-final" data-id="${i.id}">${DT.t("final_accept_btn")}</button>`
              + `<button class="btn-reject" data-id="${i.id}">${DT.t("reject_btn")}</button>`
              + chatLink;
    } else {
      // No acceptance yet (pending or negotiating)
      actions = `<button class="btn-accept" data-id="${i.id}">${DT.t("accept_btn")}</button>`;
      if (st === "pending") {
        actions += `<button class="btn-negotiate" data-id="${i.id}">${DT.t("negotiate_btn") || "Negotiate"}</button>`;
      }
      actions += `<button class="btn-reject" data-id="${i.id}">${DT.t("reject_btn")}</button>`
               + chatLink;
    }

    card.innerHTML = `
      <h4>${i.crop_name}</h4>
      <p>${DT.t("label.contractor")}: <b>${i.contractor_name}</b></p>
      <p>${DT.t("label.offered")}: ₹<b>${i.price_offered}</b></p>
      ${badge}
      <div class="actions">${actions}</div>
    `;

    card.querySelector(".btn-accept")?.addEventListener("click", (e) => {
      runAction(e.target, () => apiCall(`/api/interests/${i.id}/accept`, { method: "POST" }));
    });
    card.querySelector(".btn-negotiate")?.addEventListener("click", (e) => {
      runAction(e.target, () => apiCall(`/api/interests/${i.id}/negotiate`, { method: "POST" }));
    });
    card.querySelector(".btn-reject")?.addEventListener("click", (e) => {
      runAction(e.target, () => apiCall(`/api/interests/${i.id}/reject`, { method: "POST" }));
    });
    card.querySelector(".btn-withdraw")?.addEventListener("click", (e) => {
      runAction(e.target, () => apiCall(`/api/interests/${i.id}/withdraw_accept`, { method: "POST" }));
    });

    container.appendChild(card);
  });
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