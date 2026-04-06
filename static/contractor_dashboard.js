/**
 * contractor_dashboard.js
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
  accepted: "status.sold",
  rejected: "status.rejected"
};

function tStatus(status) {
  return DT.t(STATUS_MAP[status] || "status.pending");
}

/** Helper to disable button during API call and refresh dashboard */
async function runAction(btn, task) {
  if (!btn || btn.disabled) return;
  btn.disabled = true;
  const oldText = btn.textContent;
  btn.textContent = "...";
  try {
    await task();
    await loadData(); // Always re-fetch from backend as per hardening rule 5
  } catch (err) {
    Toast.error(err.message);
  } finally {
    btn.disabled = false;
    btn.textContent = oldText;
  }
}

let allCrops    = [];
let myInterests = [];
let currentCropId = null;

document.addEventListener("DOMContentLoaded", async () => {
  if (!localStorage.getItem("access_token")) { location.href = "/login"; return; }
  await DT.ready;

  initHeader();
  loadData();
  setupFilters();
  setupModal();

  document.getElementById("logoutBtn").onclick = () => {
    localStorage.removeItem("access_token");
    location.href = "/login";
  };
});

async function initHeader() {
  try {
    const me = await apiCall("/api/me");
    const initial = (me.name || "?").charAt(0).toUpperCase();
    document.getElementById("navAvatar").textContent = initial;
    document.getElementById("navName").textContent   = me.name || "Profile";
  } catch (err) { console.error("Profile load failed", err); }
}

async function loadData() {
  await Promise.all([loadMyInterests(), loadAvailableCrops(), loadUnreadCount()]);
}

async function loadAvailableCrops() {
  try {
    allCrops = await apiCall("/api/marketplace/crops");
    renderCrops(allCrops);
    populateLocationFilter();
  } catch (err) {
    document.getElementById("availableCropsContainer").innerHTML =
      `<div class="loading-state">${DT.t("failed_crops")}</div>`;
  }
}

function renderCrops(crops) {
  const container = document.getElementById("availableCropsContainer");
  container.innerHTML = "";

  if (crops.length === 0) {
    container.innerHTML = `<div class="loading-state">${DT.t("no_crops")}</div>`;
    return;
  }

  crops.forEach(crop => {
    const interest = myInterests.find(i => i.crop_id === crop.id);
    const isRejected = interest?.status === "rejected";
    const hasActive = interest && !isRejected;
    const qty = crop.quantity_remaining ?? crop.quantity;

    let btnHTML = "";
    if (hasActive) {
      btnHTML = `<button class="btn btn-disabled" disabled>\u2713 ${DT.t("interest_shown")}</button>`;
    } else {
      const label = isRejected ? DT.t("resubmit_btn") : DT.t("show_interest_btn");
      const cls = isRejected ? "btn-warning" : "btn-primary";
      btnHTML = `<button class="btn ${cls} js-open-interest" data-id="${crop.id}">${label}</button>`;
    }

    const card = document.createElement("div");
    card.className = "crop-card";
    card.innerHTML = `
      <h4>${crop.crop_name}</h4>
      <p><b>${DT.t("quantity_lbl")}:</b> ${qty} ${DT.t("quintals")}</p>
      <p><b>${DT.t("price_lbl")}:</b> &#8377;${crop.price}/${DT.t("quintal_short")}</p>
      <p><b>${DT.t("location_lbl")}:</b> ${crop.location}</p>
      ${btnHTML}
    `;

    card.querySelector(".js-open-interest")?.addEventListener("click", () => {
      openInterestModal(crop.id, crop.crop_name, qty, crop.price);
    });

    container.appendChild(card);
  });
}

async function loadMyInterests() {
  try {
    myInterests = await apiCall("/api/interests/contractor");
    const container = document.getElementById("myInterestsContainer");
    container.innerHTML = "";

    if (myInterests.length === 0) {
      container.innerHTML = `<div class="loading-state">${DT.t("no_interests")}</div>`;
      return;
    }

    myInterests.forEach(i => {
      const div = document.createElement("div");
      div.className = `interest-card status-${i.status}`;
      
      let actions = `<a class="btn btn-chat" href="/messages?deal=${i.id}">${DT.t("open_chat")}</a>`;
      if (i.accepted_by === "farmer" && i.status !== "accepted") {
        actions = `<button class="btn btn-primary btn-accept" data-id="${i.id}">${DT.t("final_accept_btn")}</button>` + actions;
      }

      div.innerHTML = `
        <h4>${i.crop_name}</h4>
        <p>${DT.t("label.status")}: <b>${tStatus(i.status)}</b></p>
        <div class="actions">${actions}</div>
      `;

      div.querySelector(".btn-accept")?.addEventListener("click", (e) => {
        runAction(e.target, () => apiCall(`/api/interests/${i.id}/accept`, { method: "POST" }));
      });

      container.appendChild(div);
    });
  } catch (err) {
    document.getElementById("myInterestsContainer").innerHTML = `<div class="loading-state">Error loading interests</div>`;
  }
}

function openInterestModal(id, name, qty, price) {
  currentCropId = id;
  document.getElementById("modalCropInfo").textContent = name;
  document.getElementById("interestQuantity").value = qty;
  document.getElementById("interestPrice").value = price;
  document.getElementById("interestModal").classList.remove("hidden");
}

function setupModal() {
  document.getElementById("cancelModal").onclick = () => document.getElementById("interestModal").classList.add("hidden");
  document.getElementById("submitInterest").onclick = async (e) => {
    const qty = parseInt(document.getElementById("interestQuantity").value);
    const prc = parseFloat(document.getElementById("interestPrice").value);
    const msg = document.getElementById("interestMessage").value;

    runAction(e.target, async () => {
      await apiCall("/api/interests", {
        method: "POST",
        body: JSON.stringify({ crop_id: currentCropId, quantity: qty, price: prc, message: msg })
      });
      Toast.success(DT.t("toast.interest_sent"));
      document.getElementById("interestModal").classList.add("hidden");
    });
  };
}

function setupFilters() {
  const apply = () => {
    const search = document.getElementById("searchInput").value.toLowerCase();
    const filtered = allCrops.filter(c => c.crop_name.toLowerCase().includes(search) || c.location.toLowerCase().includes(search));
    renderCrops(filtered);
  };
  document.getElementById("searchInput").addEventListener("input", apply);
}

function populateLocationFilter() {
  const locs = [...new Set(allCrops.map(c => c.location))];
  const sel = document.getElementById("locationFilter");
  sel.innerHTML = `<option value="">All Locations</option>` + locs.map(l => `<option value="${l}">${l}</option>`).join("");
}

async function loadUnreadCount() {
  try {
    const data = await apiCall("/api/messages/unread-count");
    const badge = document.getElementById("unreadBadge");
    if (data.unread_count > 0) {
      badge.textContent = data.unread_count;
      badge.classList.remove("hidden");
    } else {
      badge.classList.add("hidden");
    }
  } catch {}
}

// ── UTILS ─────────────────────────────────────────────────────────────────────

function escapeAttr(str) {
  return String(str)
    .replace(/&/g,  "&amp;")
    .replace(/'/g,  "&#39;")
    .replace(/"/g,  "&quot;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;");
}