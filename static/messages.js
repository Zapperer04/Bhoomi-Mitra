/**
 * messages.js — Bhoomi Mitra Messaging
 * Implements spec Parts 3, 6 fully.
 */

// ── API HELPER ────────────────────────────────────────────────────────────────

async function apiCall(url, options = {}) {
  const token = localStorage.getItem("access_token");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(url, { ...options, headers });

    if (res.status === 401) {
      localStorage.removeItem("access_token");
      window.location.href = "/login";
      return;
    }

    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await res.text();
      console.error("Non-JSON response from server:", text.substring(0, 300));
      throw new Error(`Server returned non-JSON (${res.status}). Check connection.`);
    }

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || `Request failed: ${res.status}`);
    }
    return json.data;
  } catch (err) {
    console.error(`API Call failed [${url}]:`, err);
    throw err;
  }
}

/** Disable button during API call, restore after. */
async function runAction(btn, task, onDone) {
  if (!btn || btn.disabled) return;
  btn.disabled = true;
  const oldText = btn.textContent;
  if (btn.tagName === "BUTTON") btn.textContent = "...";
  try {
    await task();
    if (onDone) await onDone();
  } catch (err) {
    Toast.error(err.message);
  } finally {
    btn.disabled = false;
    if (btn.tagName === "BUTTON") btn.textContent = oldText;
  }
}

// ── STATE ─────────────────────────────────────────────────────────────────────

let currentInterestId = null;
let currentUserId     = null;
let currentConv       = null;   // full conv object for the open chat
let conversations     = [];
let msgPollInterval   = null;
let dealPollInterval  = null;
let lastMessageId     = 0;

// ── BOOT ──────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {
  if (!localStorage.getItem("access_token")) { window.location.href = "/login"; return; }

  await initUser();
  await loadConversations();
  setupEventListeners();
  startPolling();

  // Auto-open deal from URL ?deal=<id>
  const urlParams = new URLSearchParams(window.location.search);
  const dealId    = urlParams.get("deal");
  if (dealId) {
    // Rely on list load to populate currentInterestId later or just set it
    currentInterestId = parseInt(dealId);
    openConversationById(currentInterestId);
    window.history.replaceState({}, "", "/messages");
  }

  document.getElementById("logoutBtn").onclick = () => {
    stopPolling();
    localStorage.removeItem("access_token");
    window.location.href = "/login";
  };
});

// ── USER INIT ─────────────────────────────────────────────────────────────────

async function initUser() {
  try {
    const data = await apiCall("/debug/whoami");
    currentUserId = parseInt(data.identity_received);
  } catch (err) { console.error("User init failed", err); }
}

// ── CONVERSATIONS SIDEBAR ─────────────────────────────────────────────────────

async function loadConversations() {
  try {
    conversations = await apiCall("/api/messages/conversations");
    const list = document.getElementById("conversationsList");
    list.innerHTML = conversations.length
      ? ""
      : '<div class="loading-state">No conversations yet.</div>';

    conversations.forEach(conv => {
      const item = document.createElement("div");
      item.className = `conversation-item ${conv.interest_id === currentInterestId ? "active" : ""}`;

      const timeStr    = formatTimeAgo(conv.last_message_time);
      const previewText = conv.last_message || "No messages yet";
      const unreadHtml  = conv.unread_count > 0
        ? `<span class="sidebar-unread">${conv.unread_count}</span>` : "";

      // Status dot color
      const statusDot = `<span class="status-dot status-dot-${conv.status}"></span>`;

      item.innerHTML = `
        <div class="conv-row">
          <span class="conversation-name">${statusDot}${conv.other_user_name}</span>
          <span class="conversation-time">${timeStr}</span>
        </div>
        <div class="conversation-crop">${conv.crop_name}</div>
        <div class="conv-row">
          <span class="conversation-preview">${previewText}</span>
          ${unreadHtml}
        </div>
      `;
      item.onclick = () => openConversation(conv, item);
      list.appendChild(item);
    });

    // If a chat is open, let polling handle its refresh
  } catch (err) { console.error("Load conversations failed", err); }
}

async function openConversationById(id) {
    currentInterestId = id;
    document.getElementById("emptyState").style.display = "none";
    document.getElementById("chatContainer").classList.remove("hidden");
    lastMessageId = 0;
    document.getElementById("messagesArea").innerHTML = '<div class="loading-state">Loading chat...</div>';
    // Polling will pick it up and render everything
}

// ── OPEN CONVERSATION ─────────────────────────────────────────────────────────

function openConversation(conv, element = null) {
  currentInterestId = conv.interest_id;
  currentConv       = conv;

  document.getElementById("emptyState").style.display = "none";
  document.getElementById("chatContainer").classList.remove("hidden");

  document.querySelectorAll(".conversation-item").forEach(el => el.classList.remove("active"));
  if (element) element.classList.add("active");

  lastMessageId = 0;
  document.getElementById("messagesArea").innerHTML = '<div class="loading-state">Loading chat...</div>';

  // We don't call loadMessages manually anymore; polling does it.
  // But we can render the summary immediately from the sidebar data.
  renderDealUI(conv);
}

// ── DEAL SUMMARY CARD ─────────────────────────────────────────────────────────
// Spec Part 6: pinned above messages, re-fetched every 10s.

function renderDealUI(conv) {
  const panel = document.getElementById("negotiationPanel");

  // ── Status bar values ────────────────────────────────────────────────────
  const displayPrice = conv.price_offered     != null ? `₹${conv.price_offered}/q` : "—";
  const displayQty   = conv.quantity_requested != null ? `${conv.quantity_requested}q` : "—";
  const currentStatus = conv.status || "pending";

  document.getElementById("statPrice").textContent  = displayPrice;
  document.getElementById("statQty").textContent    = displayQty;

  const statusEl = document.getElementById("statStatus");
  statusEl.textContent = currentStatus.toUpperCase();
  statusEl.className = `value badge status-${currentStatus}`;

  // ── Chat person header ───────────────────────────────────────────────────
  document.getElementById("chatPersonName").textContent = conv.other_user_name;
  document.getElementById("chatCropName").textContent   = `Deal: ${conv.crop_name}`;

  // ── Call button: only show phone if deal is fully accepted ───────────────
  const callBtn = document.getElementById("callButton");
  if (conv.accepted_by === "both" && conv.other_user_phone) {
    callBtn.href  = `tel:${conv.other_user_phone}`;
    callBtn.style.display = "";
  } else {
    callBtn.href  = "#";
    callBtn.style.display = "none";
  }

  // ── Waiting banner ───────────────────────────────────────────────────────
  const waitBanner = document.getElementById("waitingBanner");
  if (waitBanner) {
    const isFarmer  = (currentUserId === conv.farmer_id);
    const myRole    = isFarmer ? "farmer" : "contractor";
    const otherRole = isFarmer ? "contractor" : "farmer";

    if (conv.accepted_by === myRole) {
      waitBanner.textContent = `⏳ Waiting for ${otherRole} to confirm`;
      waitBanner.classList.remove("hidden");
    } else {
      waitBanner.classList.add("hidden");
    }
  }

  // ── Negotiation action panel ─────────────────────────────────────────────
  // Hide entirely for accepted or rejected deals
  if (conv.status === "accepted" || conv.status === "rejected") {
    panel.classList.add("hidden");
    // Disable message input for rejected deals
    const inputArea = document.querySelector(".message-input-area");
    if (inputArea && conv.status === "rejected") {
      inputArea.style.opacity = "0.4";
      inputArea.style.pointerEvents = "none";
      document.getElementById("messageInput").placeholder = "Chat closed — deal was rejected";
    }
    return;
  }

  // Restore input area if previously disabled
  const inputArea = document.querySelector(".message-input-area");
  if (inputArea) { inputArea.style.opacity = ""; inputArea.style.pointerEvents = ""; }

  panel.classList.remove("hidden");

  const isFarmer  = (currentUserId === conv.farmer_id);
  const myRole    = isFarmer ? "farmer" : "contractor";
  const acceptBtn = document.getElementById("acceptBtn");
  const rejectBtn = document.getElementById("rejectBtn");
  const counterBtn = document.getElementById("counterBtn");
  const negText   = document.getElementById("negText");

  acceptBtn.disabled  = false;
  acceptBtn.textContent = "Accept Deal";

  if (conv.accepted_by === myRole) {
    acceptBtn.textContent = "✓ You Accepted";
    acceptBtn.disabled    = true;
    negText.textContent   = `Waiting for ${myRole === "farmer" ? "contractor" : "farmer"} to confirm...`;
  } else if (conv.accepted_by && conv.accepted_by !== myRole) {
    // Other party already accepted — prompt to finalize
    negText.textContent = "The other party accepted! Confirm to close the deal.";
  } else {
    negText.textContent = "Take action on this deal:";
  }

  // ✅ DISABLE CLOSED DEAL
  if (conv.status === "accepted" || conv.status === "rejected") {
    disableAllActions();
  } else {
    enableAllActions();
  }
}

function disableAllActions() {
    const panel = document.getElementById("negotiationPanel");
    if (panel) panel.classList.add("locked");
    const btns = ["acceptBtn", "rejectBtn", "counterBtn"];
    btns.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = true;
    });
}

function enableAllActions() {
    const panel = document.getElementById("negotiationPanel");
    if (panel) panel.classList.remove("locked");
    const btns = ["acceptBtn", "rejectBtn", "counterBtn"];
    btns.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = false;
    });
}

// ── MESSAGES ──

function renderMessages(messages) {
    if (!messages || messages.length === 0) return;
    const area = document.getElementById("messagesArea");

    // Only scroll if we added something
    let added = false;

    messages.forEach(msg => {
        // Idempotency: don't render same message twice
        if (msg.id <= lastMessageId) return;

        const contentStr = msg.content || "";
        const isSystem   = contentStr.startsWith("__SYSTEM__:") || contentStr.startsWith("__COUNTER__:");
        const isSent     = msg.sender_id === currentUserId;

        const wrapper = document.createElement("div");
        wrapper.className = isSystem ? "message system-msg" : `message ${isSent ? "sent" : "received"}`;

        if (!isSystem) {
          const timeStr = msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
          wrapper.innerHTML = `
            ${!isSent ? `<span class="msg-sender">${msg.sender_name || ""}</span>` : ""}
            <div class="msg-bubble">${escapeHtml(contentStr)}</div>
            <span class="message-time">${timeStr}</span>
          `;
        } else {
          wrapper.innerHTML = formatMessageHelper(contentStr);
        }

        area.appendChild(wrapper);
        lastMessageId = Math.max(lastMessageId, msg.id);
        added = true;
    });

    if (added) {
        const loadingEl = area.querySelector(".loading-state");
        if (loadingEl) loadingEl.remove();
        area.scrollTop = area.scrollHeight;
    }
}

// ── EVENT LISTENERS ───────────────────────────────────────────────────────────

// ✅ SINGLE ACTION HANDLER
async function performAction(action, payload = {}) {
  try {
    await apiCall("/api/interests/action", {
      method: "POST",
      body: JSON.stringify({
        interest_id: currentInterestId,
        action,
        ...payload
      })
    });

    // 🔥 INSTANT REFRESH (NO WAIT)
    await loadMessages(currentInterestId);

  } catch (err) {
    Toast.error(err.message);
  }
}

async function loadMessages(interestId) {
    if (!interestId) return;
    try {
        const data = await apiCall(`/api/messages/conversation/${interestId}`);
        renderMessages(data.messages);
        renderDealUI(data.interest);
    } catch (err) {
        console.error("Manual refresh failed", err);
    }
}

function setupEventListeners() {
  const input = document.getElementById("messageInput");
  const btn   = document.getElementById("sendButton");

  const send = async () => {
    const val = input.value.trim();
    if (!val || !currentInterestId) return;

    // Idempotency nonce
    const nonce = (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    runAction(btn, async () => {
      await apiCall("/api/messages/send", {
        method: "POST",
        body: JSON.stringify({ interest_id: currentInterestId, content: val, nonce }),
      });
      input.value = "";
    });
  };

  btn.onclick    = send;
  input.onkeydown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };

  // Auto-grow textarea
  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 120) + "px";
  });

  // ✅ BUTTON HOOKS
  // Accept
  document.getElementById("acceptBtn").onclick = (e) => performAction("accept");

  // Reject
  document.getElementById("rejectBtn").onclick = (e) => {
    if (confirm("Are you sure you want to REJECT this deal?")) {
        performAction("reject");
    }
  };

  // ── Counter-offer modal ──────────────────────────────────────────────────
  const modal = document.getElementById("counterModal");
  document.getElementById("counterBtn").onclick    = () => modal.classList.remove("hidden");
  document.getElementById("closeCounterModal").onclick = () => modal.classList.add("hidden");
  document.getElementById("cancelCounter").onclick = () => modal.classList.add("hidden");

  // Close modal when clicking on the overlay
  modal.onclick = (e) => {
    if (e.target === modal) modal.classList.add("hidden");
  };

  document.getElementById("submitCounter").onclick = (e) => {
    const price = parseFloat(document.getElementById("counterPrice").value);
    const quantity = parseInt(document.getElementById("counterQty").value);

    // ✅ VALIDATION (MANDATORY)
    if (price <= 0 || quantity <= 0) {
      Toast.error("Invalid values");
      return;
    }

    // Counter
    performAction("counter", {
      price: price,
      quantity: quantity
    });

    modal.classList.add("hidden");
    // Clear fields
    document.getElementById("counterPrice").value = "";
    document.getElementById("counterQty").value   = "";
    document.getElementById("counterNote").value  = "";
  };
}

// ── POLLING ───────────────────────────────────────────────────────────────────
// 5s message poll + 10s deal summary poll (separate as per spec Part 6)

// ✅ FIX POLLING (FINAL CLEAN)
function startPolling() {
  stopPolling();

  msgPollInterval = setInterval(async () => {
    if (!currentInterestId) return;

    try {
      const data = await apiCall(`/api/messages/conversation/${currentInterestId}`);

      renderMessages(data.messages);
      renderDealUI(data.interest);

    } catch (err) {
      console.error(err);
    }
  }, 3000);
}

function stopPolling() {
  clearInterval(msgPollInterval);
  clearInterval(dealPollInterval);
}

// ── FORMATTERS ────────────────────────────────────────────────────────────────

function formatTimeAgo(ts) {
  if (!ts) return "";
  const sec = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (sec < 60)    return "Just now";
  if (sec < 3600)  return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return new Date(ts).toLocaleDateString();
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

/**
 * Render system and counter-offer messages into HTML for the chat area.
 * Normal messages are rendered differently (with bubble wrapper) so this
 * function is only called for __SYSTEM__: and __COUNTER__: prefixed content.
 */
function formatMessageHelper(content) {
  if (!content) return "";

  // ── SYSTEM PILLS ─────────────────────────────────────────────────────────
  if (content.startsWith("__SYSTEM__:")) {
    const tag = content.slice("__SYSTEM__:".length);
    const labels = {
      "interest_submitted":             "📋 Interest submitted",
      "negotiating":                    "💬 Farmer opened negotiation",
      "farmer_accepted":                "✅ Farmer accepted · waiting for contractor",
      "contractor_accepted":            "✅ Contractor accepted · waiting for farmer",
      "deal_fully_accepted":            "🎉 Deal closed ✓",
      "rejected":                       "❌ Deal rejected",
      "rejected_crop_sold_out":         "❌ Rejected — crop sold out",
      "auto_rejected_sold_out":         "❌ Crop sold out — interest closed",
      "withdrew_acceptance:farmer":     "↩️ Farmer withdrew their acceptance",
      "withdrew_acceptance:contractor": "↩️ Contractor withdrew their acceptance",
    };
    const text  = labels[tag] || "📋 Status update";
    const isDeal = tag === "deal_fully_accepted";
    return isDeal
      ? `<div class="system-banner">${text}</div>`
      : `<div class="system-info">${text}</div>`;
  }

  // ── COUNTER-OFFER CARD ────────────────────────────────────────────────────
  if (content.startsWith("__COUNTER__:")) {
    const raw   = content.slice("__COUNTER__:".length);
    const parts = raw.split("|");
    let rows = "";
    parts.forEach(p => {
      const colonIdx = p.indexOf(":");
      if (colonIdx === -1) return;
      const k = p.slice(0, colonIdx).trim();
      const v = p.slice(colonIdx + 1).trim();
      rows += `<div class="counter-row"><span class="counter-key">${escapeHtml(k)}</span><span class="counter-val">${escapeHtml(v)}</span></div>`;
    });
    return `
      <div class="counter-offer-box">
        <strong>💬 Counter Offer</strong>
        ${rows}
      </div>`;
  }

  return escapeHtml(content);
}