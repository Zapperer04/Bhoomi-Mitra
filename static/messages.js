/**
 * messages.js — Bhoomi Mitra Messaging
 * Implements spec Parts 3, 6 fully.
 */

// ── TIMEOUT CONFIG (TC-30, TC-31) ───────────────────────────────────────────
const OFFER_TIMEOUT_MINS = 2; // Matches app.py
let timerInterval = null;

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
    const me = await apiCall("/api/me");
    currentUserId = me.id;
    
    // Update Header UI
    const navName   = document.getElementById("navName");
    const navAvatar = document.getElementById("navAvatar");
    const roleBadge = document.getElementById("roleBadge");

    if (navName)   navName.textContent   = me.name;
    if (navAvatar) navAvatar.textContent = (me.name || "?").charAt(0).toUpperCase();
    if (roleBadge) roleBadge.textContent = (me.role || "User").toUpperCase();

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
  if (!conv) return;
  currentConv = conv;
  const panel = document.getElementById("negotiationPanel");
  const compPanel = document.getElementById("completionPanel");
  const inputArea = document.querySelector(".message-input-area");

  // ── Status bar values ────────────────────────────────────────────────────
  const displayPrice = conv.price_offered     != null ? `₹${conv.price_offered}/q` : "—";
  const displayQty   = conv.quantity_requested != null ? `${conv.quantity_requested}q` : "—";
  const currentStatus = conv.status || "pending";
  const displayStatus = (currentStatus === "completed") ? "SUCCESS" : currentStatus.toUpperCase();

  document.getElementById("statPrice").textContent  = displayPrice;
  document.getElementById("statQty").textContent    = displayQty;

  const statusEl = document.getElementById("statStatus");
  statusEl.textContent = displayStatus;
  statusEl.className = `value badge status-${currentStatus}`;

  // Start / Reset Timer (TC-31)
  startDealTimer(conv);

  // ── Chat person header ───────────────────────────────────────────────────
  const otherName = conv.viewer_role === "farmer" ? conv.contractor_name : conv.farmer_name;
  document.getElementById("chatPersonName").textContent = otherName || conv.other_user_name || "";
  document.getElementById("chatCropName").textContent   = conv.crop_name ? `${conv.crop_name} · ${conv.location || ""}` : "";

  // ── Price bar: show negotiated vs original (TC-17) ────────────────────────
  const priceEl = document.getElementById("statPrice");
  const origPrice = conv.original_price;
  const currPrice = conv.price_offered;

  if (origPrice && currPrice && parseFloat(origPrice) !== parseFloat(currPrice)) {
    priceEl.innerHTML = `<s style="opacity:.6; font-size:0.9em;">₹${origPrice}</s> <span style="color:#10b981">₹${currPrice}/q</span>`;
  } else {
    priceEl.textContent = currPrice != null ? `₹${currPrice}/q` : "—";
  }

  // ── Call button: only show phone if deal is fully accepted ───────────────
  const callBtn = document.getElementById("callButton");
  const phone = conv.viewer_role === "farmer" ? conv.contractor_phone : conv.farmer_phone;
  if (conv.accepted_by === "both" && phone) {
    callBtn.href  = `tel:${phone}`;
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

    if (conv.accepted_by === myRole && conv.status !== "accepted") {
      waitBanner.textContent = `⏳ Waiting for ${otherRole} to confirm`;
      waitBanner.classList.remove("hidden");
    } else {
      waitBanner.classList.add("hidden");
    }
  }

  // Reset input area for the new selection (prevents state leakage from rejected chats)
  if (inputArea) {
    inputArea.style.opacity = "";
    inputArea.style.pointerEvents = "";
    document.getElementById("messageInput").placeholder = "Type your message...";
  }

  // ── Logic Group 1: Terminal states (rejected, completed, disputed) ──────────
  if (["rejected", "completed", "disputed"].includes(conv.status)) {
    panel.classList.add("hidden");
    compPanel?.classList.add("hidden");
    
    // Help Desk prompt for disputes
    const existingPrompt = document.getElementById("disputeSupportPrompt");
    if (conv.status === "disputed") {
        if (!existingPrompt) {
            const prompt = document.createElement("div");
            prompt.id = "disputeSupportPrompt";
            prompt.style = "background:#fef2f2; border:1.5px dashed #ef4444; color:#b91c1c; padding:1.2rem; margin:1rem 3rem; border-radius:12px; font-weight:700; text-align:center;";
            prompt.innerHTML = `⚠️ This deal is currently DISPUTED.<br><span style="font-size:0.9em; font-weight:500;">Please contact the Bhoomi Mitra Help Desk at <a href="mailto:support@bhoomimitra.org" style="color:#ef4444; text-decoration:underline;">support@bhoomimitra.org</a> to resolve this.</span>`;
            document.getElementById("chatContainer").insertBefore(prompt, document.getElementById("messagesArea"));
        }
    } else if (existingPrompt) {
        existingPrompt.remove();
    }

    if (inputArea) {
      inputArea.style.opacity = "0.4";
      inputArea.style.pointerEvents = "none";
      let reason = "deal was closed";
      if (conv.status === "rejected") reason = "deal was rejected";
      if (conv.status === "disputed") reason = "deal is in dispute";
      document.getElementById("messageInput").placeholder = `Chat closed — ${reason}`;
    }
    return;
  } else {
    // Clear prompt if moving out of disputed (e.g. self-resolution)
    document.getElementById("disputeSupportPrompt")?.remove();
  }

  // ── Logic Group 2: Accepted (Finalizing transactions) ────────────────────
  if (conv.status === "accepted") {
    panel.classList.add("hidden");
    if (compPanel) {
      compPanel.classList.remove("hidden");
      const isFarmer = (currentUserId === conv.farmer_id);
      const payBtn = document.getElementById("confirmPaymentBtn");
      const goodsBtn = document.getElementById("confirmGoodsBtn");

      if (isFarmer) {
        if (payBtn) {
          payBtn.style.display = "inline-block";
          payBtn.disabled = !!conv.payment_confirmed_at;
          payBtn.textContent = conv.payment_confirmed_at ? "✓ Payment Confirmed" : "Mark Payment Received";
        }
        if (goodsBtn) goodsBtn.style.display = "none";
      } else {
        if (payBtn) payBtn.style.display = "none";
        if (goodsBtn) {
          goodsBtn.style.display = "inline-block";
          goodsBtn.disabled = !!conv.goods_confirmed_at;
          goodsBtn.textContent = conv.goods_confirmed_at ? "✓ Goods Confirmed" : "Mark Goods Received";
        }
      }
    }
    return;
  }

  // ── Logic Group 3: Active negotiation (pending, negotiating) ────────────
  panel.classList.remove("hidden");
  compPanel?.classList.add("hidden");
  if (inputArea) { inputArea.style.opacity = ""; inputArea.style.pointerEvents = ""; }
  enableAllActions();

  const isFarmer  = (currentUserId === conv.farmer_id);
  const myRole    = isFarmer ? "farmer" : "contractor";
  const otherRole = isFarmer ? "contractor" : "farmer";

  const acceptBtn   = document.getElementById("acceptBtn");
  const rejectBtn   = document.getElementById("rejectBtn");
  const counterBtn  = document.getElementById("counterBtn");
  const withdrawBtn = document.getElementById("withdrawBtn");
  const negText     = document.getElementById("negText");

  // Reset all
  acceptBtn.disabled  = false;
  acceptBtn.textContent = "Accept Deal";
  acceptBtn.classList.remove("btn-pulse");
  counterBtn.classList.remove("hidden");
  if (withdrawBtn) withdrawBtn.classList.add("hidden");

  if (conv.accepted_by === myRole) {
    // Current user already accepted/countered — show withdraw option
    acceptBtn.textContent = "✓ Sent — Awaiting Response"; 
    acceptBtn.disabled    = true;
    negText.innerHTML     = `<span style="color:#6b7280">⏳ Waiting for ${otherRole} to respond...</span>`;
    counterBtn.classList.add("hidden");
    if (withdrawBtn) {
      withdrawBtn.textContent = (myRole === "farmer") ? "↩ Withdraw Acceptance" : "↩ Withdraw Interest";
      withdrawBtn.classList.remove("hidden");
    }
  } else if (conv.accepted_by === otherRole) {
    // Other party accepted/countered — prompt current user to confirm
    acceptBtn.textContent = "✅ Action Required: Accept Deal";
    acceptBtn.classList.add("btn-pulse");
    negText.innerHTML     = `<strong style="color:#10b981">⭐ ${otherRole === "farmer" ? "Farmer" : "Contractor"} accepted!</strong> Confirm or Negotiate.`;
  } else {
    // No acceptance yet
    negText.textContent = "Action Required: Take a turn in this deal";
    if (withdrawBtn && !isFarmer && (conv.status === "pending" || conv.status === "negotiating")) {
      withdrawBtn.textContent = "↩ Withdraw Interest";
      withdrawBtn.classList.remove("hidden");
    }
  }
}

function disableAllActions() {
    const panel = document.getElementById("negotiationPanel");
    if (panel) panel.classList.add("locked");
    ["acceptBtn", "rejectBtn", "counterBtn", "withdrawBtn"].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.disabled = true; el.classList.add("hidden"); }
    });
}

function enableAllActions() {
    const panel = document.getElementById("negotiationPanel");
    if (panel) panel.classList.remove("locked");
    ["acceptBtn", "rejectBtn", "counterBtn"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = false;
    });
    // withdrawBtn visibility is managed exclusively by renderDealUI state logic
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
        currentConv = data.interest;
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

  // ── Accept Modal (TC-07, TC-08) ───────────────────────────────────────────
  const acceptModal = document.getElementById("acceptModal");
  if (acceptModal) {
    document.getElementById("acceptBtn").onclick = () => {
      document.getElementById("acceptSummaryCrop").textContent = currentConv?.crop_name || "--";
      document.getElementById("acceptSummaryQty").textContent  = (currentConv?.quantity_requested || 0) + " q";
      document.getElementById("acceptSummaryPrice").textContent = "₹" + (currentConv?.price_offered || 0) + "/q";
      document.getElementById("acceptSummaryTotal").textContent = "₹" + ((currentConv?.quantity_requested || 0) * (currentConv?.price_offered || 0));
      acceptModal.classList.remove("hidden");
    };
    document.getElementById("closeAcceptModal").onclick = () => acceptModal.classList.add("hidden");
    document.getElementById("cancelAccept").onclick = () => acceptModal.classList.add("hidden");
    acceptModal.onclick = (e) => { if (e.target === acceptModal) acceptModal.classList.add("hidden"); };
    document.getElementById("submitAccept").onclick = () => {
      performAction("accept");
      acceptModal.classList.add("hidden");
    };
  } else {
    document.getElementById("acceptBtn").onclick = () => performAction("accept");
  }

  // ── Reject Modal (TC-09) ──────────────────────────────────────────────────
  const rejectModal = document.getElementById("rejectModal");
  if (rejectModal) {
    document.getElementById("rejectBtn").onclick = () => rejectModal.classList.remove("hidden");
    document.getElementById("closeRejectModal").onclick = () => rejectModal.classList.add("hidden");
    document.getElementById("cancelReject").onclick = () => rejectModal.classList.add("hidden");
    rejectModal.onclick = (e) => { if (e.target === rejectModal) rejectModal.classList.add("hidden"); };
    document.getElementById("submitReject").onclick = () => {
      performAction("reject");
      rejectModal.classList.add("hidden");
    };
  } else {
    document.getElementById("rejectBtn").onclick = () => {
      if (confirm("Are you sure you want to REJECT this deal? This cannot be undone.")) {
        performAction("reject");
      }
    };
  }

  // Withdraw (Contractor withdrawing interest OR farmer withdrawing partial acceptance)
  const withdrawBtn = document.getElementById("withdrawBtn");
  if (withdrawBtn) {
    withdrawBtn.onclick = async () => {
      const ok = await Toast.confirm("Withdraw? This will cancel your involvement in this deal.", { danger: true });
      if (ok) performAction("withdraw");
    };
  }

  // ── Counter-offer modal ──────────────────────────────────────────────────
  const modal = document.getElementById("counterModal");
  document.getElementById("counterBtn").onclick    = () => modal.classList.remove("hidden");
  document.getElementById("closeCounterModal").onclick = () => modal.classList.add("hidden");
  document.getElementById("cancelCounter").onclick = () => modal.classList.add("hidden");

  // Close modal when clicking on the overlay
  modal.onclick = (e) => {
    if (e.target === modal) modal.classList.add("hidden");
  };

  document.getElementById("submitCounter").onclick = () => {
    const price    = parseFloat(document.getElementById("counterPrice").value);
    const quantity = parseInt(document.getElementById("counterQty").value);
    const delivery = document.getElementById("counterDelivery").value.trim();
    const payment  = document.getElementById("counterPayment").value.trim();
    const note     = document.getElementById("counterNote").value.trim();

    if (price <= 0 || quantity <= 0) {
      Toast.error("Invalid values");
      return;
    }

    // Populate confirmation modal
    document.getElementById("confPrice").textContent    = `₹${price}/q`;
    document.getElementById("confQty").textContent      = `${quantity} quintals`;
    document.getElementById("confDelivery").textContent = delivery || "Not specified";
    document.getElementById("confPayment").textContent  = payment  || "Not specified";
    document.getElementById("confNote").textContent     = note     || "—";

    document.getElementById("counterModal").classList.add("hidden");
    document.getElementById("counterConfirmModal").classList.remove("hidden");

    // Store pending values for finalSubmitCounter
    document.getElementById("finalSubmitCounter")._pending = { price, quantity, delivery, payment, note };
  };

  document.getElementById("finalSubmitCounter").onclick = () => {
    const p = document.getElementById("finalSubmitCounter")._pending;
    if (!p) return;

    performAction("counter", p);
    document.getElementById("counterConfirmModal").classList.add("hidden");

    // Clear fields
    ["counterPrice","counterQty","counterDelivery","counterPayment","counterNote"]
        .forEach(id => {
          const el = document.getElementById(id);
          if (el) el.value = "";
        });
  };

  document.getElementById("backToCounter").onclick = () => {
    document.getElementById("counterConfirmModal").classList.add("hidden");
    document.getElementById("counterModal").classList.remove("hidden");
  };

  document.getElementById("closeCounterConfirmModal").onclick = () => {
    document.getElementById("counterConfirmModal").classList.add("hidden");
  };

  // Close confirm modal on overlay click
  const confirmModal = document.getElementById("counterConfirmModal");
  confirmModal.onclick = (e) => {
    if (e.target === confirmModal) confirmModal.classList.add("hidden");
  };

  // ── TC-38 / TC-40: Completion Confirmations ───────────────────────────────
  const confirmPaymentBtn = document.getElementById("confirmPaymentBtn");
  if (confirmPaymentBtn) {
      confirmPaymentBtn.onclick = () => {
          Toast.confirm("Are you sure you have received full payment?", { danger: false }).then(async ok => {
              if (ok) {
                  try {
                      await apiCall(`/api/interests/${currentInterestId}/confirm`, {
                          method: "POST",
                          body: JSON.stringify({ type: "payment" })
                      });
                      await loadMessages(currentInterestId);
                      Toast.success("Payment confirmed!");
                  } catch (e) { Toast.error(e.message); }
              }
          });
      };
  }

  const confirmGoodsBtn = document.getElementById("confirmGoodsBtn");
  if (confirmGoodsBtn) {
      confirmGoodsBtn.onclick = () => {
          Toast.confirm("Are you sure you have received the goods in full?", { danger: false }).then(async ok => {
              if (ok) {
                  try {
                      await apiCall(`/api/interests/${currentInterestId}/confirm`, {
                          method: "POST",
                          body: JSON.stringify({ type: "goods" })
                      });
                      await loadMessages(currentInterestId);
                      Toast.success("Goods confirmed!");
                  } catch (e) { Toast.error(e.message); }
              }
          });
      };
  }
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
      await loadConversations(); // keep sidebar in sync

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
      "negotiating":                    "💬 Negotiation opened",
      "farmer_accepted":                "✅ Farmer accepted · waiting for contractor",
      "contractor_accepted":            "✅ Contractor accepted · waiting for farmer",
      "deal_fully_accepted":            "🎉 Deal closed — both parties confirmed ✓",
      "deal_disputed":                  "⚠️ DISPUTED — Contact Help Desk",
      "deal_completed":                 "🎉 Deal Completed Successfully ✓",
      "rejected":                       "❌ Deal rejected",
      "rejected_crop_sold_out":         "❌ Rejected — crop sold out",
      "auto_rejected_sold_out":         "❌ Crop sold out — this interest was closed",
      "crop_listing_removed":           "❌ Farmer removed this crop listing",
      "contractor_withdrew":            "↩️ Contractor withdrew their interest",
      "withdrew_acceptance:farmer":     "↩️ Farmer withdrew their acceptance",
      "withdrew_acceptance:contractor": "↩️ Contractor withdrew their acceptance",
    };
    const text   = labels[tag] || "📋 Status update";
    const isDeal = tag === "deal_fully_accepted";
    return isDeal
      ? `<div class="system-banner">${text}</div>`
      : `<div class="system-info">${text}</div>`;
  }

  // ── COUNTER-OFFER CARD ────────────────────────────────────────────────────
  // ── COUNTER-OFFER CARD (TC-13, TC-16, TC-17) ─────────────────────────────
  // Format: __COUNTER__:price:qty:delivery:payment:note
  if (content.startsWith("__COUNTER__:")) {
    const raw = content.slice("__COUNTER__:".length);
    const parts = raw.split(":");

    if (parts.length >= 2) {
      const price = parts[0];
      const qty   = parts[1];
      const del   = parts[2] || "Not specified";
      const pay   = parts[3] || "Not specified";
      const note  = parts[4] || "";

      return `
        <div class="counter-offer-box">
          <div class="counter-header">💬 Counter Offer Received</div>
          <div class="counter-grid">
            <div class="counter-item"><span class="label">Price</span><span class="val">₹${price}/q</span></div>
            <div class="counter-item"><span class="label">Qty</span><span class="val">${qty} quintals</span></div>
            <div class="counter-item"><span class="label">Delivery</span><span class="val">${escapeHtml(del)}</span></div>
            <div class="counter-item"><span class="label">Payment</span><span class="val">${escapeHtml(pay)}</span></div>
          </div>
          ${note ? `<div class="counter-note"><strong>Note:</strong> ${escapeHtml(note)}</div>` : ""}
        </div>`;
    }

    return `<div class="system-info">💬 Counter offer: ${escapeHtml(raw)}</div>`;
  }

  // ── WAITLIST & AUTO-REJECTION (TC-27, TC-28, TC-29) ───────────────────────
  if (content === "__SYSTEM__:other_contractor_accepted") {
    return `
      <div class="system-info warning">
        <p>⚠️ Another contractor's offer was accepted for this listing.</p>
        <button class="btn-waitlist-join" onclick="joinWaitlist(${currentConv?.crop_id})">Join Waitlist</button>
      </div>`;
  }

  if (content === "__SYSTEM__:offer_timed_out") {
    return `
      <div class="system-info warning">
        <p>⏰ This offer has expired due to inactivity.</p>
        <a href="/" class="btn-waitlist-join" style="text-decoration:none; text-align:center;">Back to Marketplace</a>
      </div>`;
  }

  if (content === "__SYSTEM__:listing_expired") {
    return `<div class="system-info">🚫 The listing has expired and is no longer available.</div>`;
  }

  if (content === "__SYSTEM__:contractor_withdrew_finalized") {
    const isFarmer = currentConv && currentUserId === currentConv.farmer_id;
    if (isFarmer) {
      return `
        <div class="system-info warning">
          <p>⚠️ The contractor has withdrawn from the finalized deal. Your listing stock has been restored and it is now <b>ACTIVE</b> again.</p>
          <button class="btn-waitlist-join" style="background:#059669; color:white; border:none;" onclick="location.reload()">Refresh My Dashboard</button>
        </div>`;
    }
    return `<div class="system-info">🔄 The finalized deal was withdrawn. The listing is now <b>ACTIVE</b> again.</div>`;
  }

  if (content === "__SYSTEM__:listing_reactivated") {
    return `<div class="system-info success">⚡ Good news! This listing is back on the market.</div>`;
  }

  // ── COMPLETION & DISPUTES (TC-40, TC-41) ──────────────────────────────────
  if (content === "__SYSTEM__:payment_confirmed") {
    return `<div class="system-info success">💰 Payment receipt has been confirmed by the farmer.</div>`;
  }
  if (content === "__SYSTEM__:goods_confirmed") {
    return `<div class="system-info success">📦 Goods receipt has been confirmed by the contractor.</div>`;
  }
  if (content === "__SYSTEM__:deal_completed") {
    return `<div class="system-info success" style="font-weight:700;">🎉 Transaction fully completed! Both parties have confirmed.</div>`;
  }
  if (content === "__SYSTEM__:deal_disputed") {
    return `<div class="system-info warning" style="color:var(--red); border-color:var(--red);">⚠️ <b>Transaction Disputed</b>. The confirmation window expired before both sides confirmed receipt. Support will review.</div>`;
  }

  // ── EDIT ALERTS (TC-36, TC-37) ─────────────────────────────────────────────
  if (content === "__SYSTEM__:listing_price_changed_voided") {
    return `
      <div class="system-info warning">
        <p>⚠️ The farmer changed the price of this listing. Your previous offer has been voided. Please submit a new proposal if you are still interested.</p>
      </div>`;
  }

  if (content === "__SYSTEM__:qty_correction_required") {
    return `
      <div class="system-info warning">
        <p>⚠️ The farmer reduced the total available quantity of this listing below your requested amount. Please revise your quantity and submit a new offer.</p>
      </div>`;
  }

  return escapeHtml(content);
}

// Global helper for the button injected in HTML
window.joinWaitlist = async (cropId) => {
  if (!cropId) return;
  try {
    await apiCall("/api/waitlist/join", {
      method: "POST",
      body: JSON.stringify({ crop_id: cropId })
    });
    Toast.success("You've joined the waitlist! We'll notify you if it re-opens.");
    // Force refresh the UI to show waitlist status if needed
  } catch (err) {
    Toast.error(err.message);
  }
};

function startDealTimer(interest) {
  if (timerInterval) clearInterval(timerInterval);
  
  const timerItem    = document.getElementById("timerItem");
  const timerDivider = document.querySelector(".timer-divider");
  const timerVal     = document.getElementById("statTimer");

  if (!timerItem || !timerVal) return;

  const st = interest.status;
  // Finalized or rejected deals don't time out
  if (st !== "pending" && st !== "negotiating") {
    timerItem.style.display = "none";
    if (timerDivider) timerDivider.style.display = "none";
    return;
  }

  const lastActiveStr = interest.last_activity_at;
  const finalizedStr  = interest.finalized_at;
  
  if (st === "accepted") {
      // 3-Day confirmation timer
      if (!finalizedStr) { timerItem.style.display = "none"; return; }
      const start = new Date(finalizedStr);
      expiryDate = new Date(start.getTime() + (4320 * 60000)); // 3 days
  } else {
      // Negotiation timer
      if (!lastActiveStr) { timerItem.style.display = "none"; return; }
      const start = new Date(lastActiveStr);
      expiryDate = new Date(start.getTime() + (OFFER_TIMEOUT_MINS * 60000));
  }

  const update = () => {
    const now  = new Date();
    if (isNaN(expiryDate.getTime())) {
        timerItem.style.display = "none";
        clearInterval(timerInterval);
        return;
    }
    const diff = expiryDate - now;

    if (diff <= 0) {
      if (timerVal) {
        timerVal.textContent = "EXPIRED";
        timerVal.style.color = "#9ca3af";
      }
      clearInterval(timerInterval);
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (60000));
    const secs = Math.floor((diff % 60000) / 1000);

    if (days > 0) {
        timerVal.textContent = `${days}d ${hours}h`;
    } else {
        timerVal.textContent = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    // Proactive Warning (TC-31)
    // Warning at 30s for the 2m test case, or at 6h for longer durations
    const warnThreshold = Math.min(30, OFFER_TIMEOUT_MINS * 60 * 0.1); // 10% or 30s
    if (diff > 0 && diff <= warnThreshold * 1000 && !window._expiryWarned) {
        Toast.warning(`Warning: This deal will expire in less than ${Math.ceil(diff/1000)} seconds!`);
        window._expiryWarned = true;
    }
  };

  timerItem.style.display    = "flex";
  if (timerDivider) timerDivider.style.display = "block";
  window._expiryWarned = false;
  update();
  timerInterval = setInterval(update, 1000);
}