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
  setupCounterModal();

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      localStorage.removeItem("access_token");
      location.href = "/login";
    };
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

async function loadData() {
  const p1 = loadMyInterests().catch(e => console.error("Interests failed", e));
  const p2 = loadAvailableCrops().catch(e => console.error("Crops failed", e));
  const p3 = loadUnreadCount().catch(e => console.error("Unread failed", e));
  await Promise.all([p1, p2, p3]);
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
    const waitlistBadge = crop.waitlisted ? `<span class="badge badge-waitlist" style="background:#e0f2fe; color:#0369a1; padding:4px 10px; border-radius:12px; font-size:0.8em; font-weight:700;">🕒 On Waitlist</span>` : "";

    if (hasActive) {
      btnHTML = `<button class="btn btn-disabled" disabled>\u2713 ${DT.t("interest_shown")}</button>`;
    } else {
      const label = isRejected ? DT.t("resubmit_btn") : DT.t("show_interest_btn");
      const cls = isRejected ? "btn-warning" : "btn-primary";
      btnHTML = `<button class="btn ${cls} js-open-interest" data-id="${crop.id}">${label}</button>`;
    }

    const card = document.createElement("div");
    card.className = "crop-card";
    
    // Format availability date for display (or show N/A if missing)
    const availDate = crop.availability_date ? new Date(crop.availability_date).toLocaleDateString() : 'N/A';

    card.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.5rem;">
        <h4 style="margin:0;">${crop.crop_name}</h4>
        ${waitlistBadge}
      </div>
      <p><b>${DT.t("quantity_lbl")}:</b> ${qty} ${DT.t("quintals")}</p>
      <p><b>${DT.t("price_lbl")}:</b> &#8377;${crop.price}/${DT.t("quintal_short")}</p>
      <p><b>Available From:</b> ${availDate}</p>
      <p><b>${DT.t("location_lbl")}:</b> ${crop.location}</p>
      ${crop.farmer_name ? `<p><b>Farmer:</b> ${crop.farmer_name}</p>` : ""}
      <div class="actions" style="margin-top:0.75rem;">${btnHTML}</div>
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

      const chatLink = `<a class="btn btn-chat" href="/messages?deal=${i.id}">${DT.t("open_chat")}</a>`;
      let actions = chatLink;
      let badge   = "";

      // ── State machine per spec Part 5 (Contractor view) ───────────────────
      const ab = i.accepted_by;
      const st = i.status;

      if (st === "accepted" && ab === "both") {
        badge = `<span class="status-badge badge-accepted">${DT.t("deal_closed") || "Deal closed ✓"}</span>`;
        if (i.farmer_phone) {
          badge += ` <a class="btn-call" href="tel:${i.farmer_phone}">📞 ${i.farmer_phone}</a>`;
        }
        actions = chatLink;

      } else if (st === "rejected") {
        badge = `<span class="status-badge badge-rejected">${DT.t("status.rejected") || "Rejected"}</span>`;
        actions = `<button class="btn btn-warning js-open-interest" data-id="${i.crop_id}"
                    data-qty="${i.quantity_requested}" data-price="${i.price_offered}">
                    ${DT.t("resubmit_btn") || "Resubmit"}</button>` + chatLink;

      } else if (ab === "contractor") {
        // Contractor already accepted — waiting for farmer
        badge = `<span class="status-badge badge-pending">${DT.t("waiting_farmer") || "You accepted — awaiting farmer"}</span>`;
        actions = `<button class="btn btn-secondary btn-withdraw" data-id="${i.id}">${DT.t("withdraw_btn") || "Withdraw"}</button>`
                + chatLink;

      } else if (ab === "farmer") {
        // Farmer accepted — contractor should finalize
        actions = `<button class="btn btn-primary btn-accept" data-id="${i.id}">${DT.t("final_accept_btn")}</button>`
                + chatLink;

      } else if (st === "negotiating") {
        // Active negotiation, no partial accept yet
        badge = `<span class="status-badge badge-negotiating">${DT.t("status.negotiating") || "Negotiating"}</span>`;
        actions = `<button class="btn btn-primary btn-accept" data-id="${i.id}">${DT.t("accept_btn") || "Accept"}</button>`
                + `<button class="btn btn-secondary btn-counter" data-id="${i.id}" data-price="${i.price_offered}" data-qty="${i.quantity_requested}">${DT.t("counter_btn") || "Counter Offer"}</button>`
                + chatLink;

      } else {
        // pending, no action yet
        badge = `<span class="status-badge badge-pending">${DT.t("status.pending") || "Pending review"}</span>`;
        actions = chatLink;
      }

      div.innerHTML = `
        <h4>${i.crop_name}</h4>
        <p>${DT.t("label.status")}: <b>${tStatus(i.status)}</b></p>
        <p>${DT.t("label.offered") || "Offered"}: ₹<b>${i.price_offered}</b> &bull; ${i.quantity_requested}q</p>
        ${badge}
        <div class="actions">${actions}</div>
      `;

      div.querySelector(".btn-accept")?.addEventListener("click", (e) => {
        runAction(e.target, () => apiCall(`/api/interests/${i.id}/accept`, { method: "POST" }));
      });
      div.querySelector(".btn-withdraw")?.addEventListener("click", async (e) => {
        if (await Toast.confirm("Are you sure you want to withdraw your interest? This cannot be undone.", { danger: true })) {
          runAction(e.target, () => apiCall(`/api/interests/${i.id}/withdraw_accept`, { method: "POST" }));
        }
      });
      div.querySelector(".btn-counter")?.addEventListener("click", (e) => {
        openCounterModal(i.id, i.price_offered, i.quantity_requested);
      });
      div.querySelector(".js-open-interest")?.addEventListener("click", (ev) => {
        const btn = ev.currentTarget;
        openInterestModal(btn.dataset.id, i.crop_name,
          parseInt(btn.dataset.qty), parseFloat(btn.dataset.price));
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
  const modal = document.getElementById("interestModal");
  if (!modal) return;

  const closeBtn = document.getElementById("cancelModal");
  const crossBtn = document.getElementById("cancelModalCross");

  const hide = () => modal.classList.add("hidden");

  if (closeBtn) closeBtn.onclick = hide;
  if (crossBtn) crossBtn.onclick = hide;

  window.onclick = (e) => { 
    if (e.target === modal) hide(); 
  };
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

// ── UTILS ───────────────────────────────────────────────────────────────────────────────

function escapeAttr(str) {
  return String(str)
    .replace(/&/g,  "&amp;")
    .replace(/'/g,  "&#39;")
    .replace(/"/g,  "&quot;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;");
}

// ── COUNTER OFFER MODAL (Contractor) ────────────────────────────────────────────

let _counterInterestId = null;

function openCounterModal(interestId, currentPrice, currentQty) {
  _counterInterestId = interestId;
  document.getElementById("counterModalPrice").value = currentPrice || "";
  document.getElementById("counterModalQty").value   = currentQty   || "";
  document.getElementById("counterModalNote").value  = "";
  const modal = document.getElementById("counterOfferModal");
  if (modal) modal.classList.remove("hidden");
}

function setupCounterModal() {
  const modal     = document.getElementById("counterOfferModal");
  if (!modal) return;

  const hideModal = () => modal.classList.add("hidden");
  document.getElementById("cancelCounterModal")?.addEventListener("click", hideModal);
  document.getElementById("closeCounterOfferModal")?.addEventListener("click", hideModal);
  window.addEventListener("click", (e) => { if (e.target === modal) hideModal(); });

  document.getElementById("submitCounterOffer")?.addEventListener("click", async (e) => {
    const price = document.getElementById("counterModalPrice").value;
    const qty   = document.getElementById("counterModalQty").value;
    const note  = document.getElementById("counterModalNote").value;
    if (!price && !qty) { Toast.error("Enter a new price or quantity"); return; }
    runAction(e.target, async () => {
      await apiCall(`/api/interests/${_counterInterestId}/counter_offer`, {
        method: "POST",
        body: JSON.stringify({ price: price || undefined, quantity: qty || undefined, note })
      });
      Toast.success("Counter offer sent!");
      hideModal();
    });
  });
}