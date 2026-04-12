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
    const [crops, interests] = await Promise.all([
      apiCall("/api/crops"),
      apiCall("/api/interests/farmer"),
    ]);

    renderCrops(crops, interests, activeContainer, historyContainer);
    renderInterests(interests, interestContainer);
    loadUnreadCount();

  } catch (err) {
    console.error("Dashboard data load failed:", err);
    if (activeContainer) activeContainer.innerHTML = `<div class="loading-state">Error: ${err.message}</div>`;
  }
}

function renderCrops(crops, interests, activeContainer, historyContainer) {
  const active = crops.filter(c => ["active", "partially_sold", "negotiating"].includes(c.status));
  const history = crops.filter(c => !["active", "partially_sold", "negotiating"].includes(c.status));

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
    let actions = `<a class="btn-message" href="/messages?deal=${i.id}">${DT.t("open_chat")}</a>`;

    if (i.status === "pending" || i.status === "negotiating") {
      if (i.accepted_by === "contractor") {
        actions = `<button class="btn-accept" data-id="${i.id}">${DT.t("final_accept_btn")}</button>` + actions;
      } else if (!i.accepted_by) {
        actions = `<button class="btn-accept" data-id="${i.id}">${DT.t("accept_btn")}</button>` + actions;
      }
      actions += `<button class="btn-reject" data-id="${i.id}">${DT.t("reject_btn")}</button>`;
    }

    card.innerHTML = `
      <h4>${i.crop_name}</h4>
      <p>${DT.t("label.contractor")}: <b>${i.contractor_name}</b></p>
      <p>${DT.t("label.offered")}: ₹<b>${i.price_offered}</b></p>
      <div class="actions">${actions}</div>
    `;

    card.querySelector(".btn-accept")?.addEventListener("click", (e) => {
      runAction(e.target, () => apiCall(`/api/interests/${i.id}/accept`, { method: "POST" }));
    });

    card.querySelector(".btn-reject")?.addEventListener("click", (e) => {
      runAction(e.target, () => apiCall(`/api/interests/${i.id}/reject`, { method: "POST" }));
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