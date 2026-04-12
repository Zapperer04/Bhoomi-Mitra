/**
 * messages.js
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

/** Helper to disable button during API call */
async function runAction(btn, task, refresh) {
  if (!btn || btn.disabled) return;
  btn.disabled = true;
  const oldText = btn.textContent;
  if (btn.tagName === "BUTTON") btn.textContent = "...";
  try {
    await task();
    if (refresh) await refresh();
  } catch (err) {
    Toast.error(err.message);
  } finally {
    btn.disabled = false;
    if (btn.tagName === "BUTTON") btn.textContent = oldText;
  }
}

let currentInterestId = null;
let currentUserId = null;
let conversations = [];
let pollInterval = null;
let lastMessageId = 0; // Track last fetched message ID for optimized polling

document.addEventListener("DOMContentLoaded", async () => {
  if (!localStorage.getItem("access_token")) { window.location.href = "/login"; return; }

  await initUser();
  await loadConversations();
  setupEventListeners();
  startPolling();

  const urlParams = new URLSearchParams(window.location.search);
  const dealId = urlParams.get("deal");
  if (dealId) {
    const conv = conversations.find(c => c.interest_id == dealId);
    if (conv) openConversation(conv);
    window.history.replaceState({}, "", "/messages");
  }

  document.getElementById("logoutBtn").onclick = () => {
    stopPolling();
    localStorage.removeItem("access_token");
    window.location.href = "/login";
  };
});

async function initUser() {
  try {
    const data = await apiCall("/debug/whoami");
    // Ensure ID is an integer for correct comparison with message.sender_id
    currentUserId = parseInt(data.identity_received);
  } catch (err) { console.error("User init failed", err); }
}

async function loadConversations() {
  try {
    conversations = await apiCall("/api/messages/conversations");
    const list = document.getElementById("conversationsList");
    list.innerHTML = conversations.length ? "" : '<div class="loading-state">No conversations yet.</div>';

    conversations.forEach(conv => {
      const item = document.createElement("div");
      item.className = `conversation-item ${conv.interest_id === currentInterestId ? 'active' : ''}`;
      
      const timeStr = formatTimeAgo(conv.last_message_time);
      const previewText = conv.last_message || 'No messages';
      const unreadHtml = conv.unread_count > 0 ? `<span class="sidebar-unread">${conv.unread_count}</span>` : '';

      item.innerHTML = `
        <div class="conv-row">
          <span class="conversation-name">${conv.other_user_name}</span>
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
  } catch (err) { console.error("Load conversations failed", err); }
}

function openConversation(conv, element = null) {
  currentInterestId = conv.interest_id;
  document.getElementById("emptyState").style.display = "none";
  document.getElementById("chatContainer").classList.remove("hidden");
  document.getElementById("chatPersonName").textContent = conv.other_user_name;
  document.getElementById("chatCropName").textContent = `Deal: ${conv.crop_name}`;
  document.getElementById("callButton").href = `tel:${conv.other_user_phone}`;

  document.querySelectorAll(".conversation-item").forEach(el => el.classList.remove("active"));
  if (element) element.classList.add("active");
  
  // Reset lastMessageId when switching conversations to force full load
  lastMessageId = 0;
  document.getElementById("messagesArea").innerHTML = '<div class="loading-state">Loading chat...</div>';
  
  loadMessages(conv.interest_id);
}

async function loadMessages(id) {
  if (!id) return;
  try {
    const messages = await apiCall(`/api/messages/interest/${id}?since_id=${lastMessageId}`);
    const area = document.getElementById("messagesArea");
    
    if (lastMessageId === 0) area.innerHTML = ""; // First load
    
    if (messages.length > 0) {
      // Remove loading state if present
      const loading = area.querySelector(".loading-state");
      if (loading) loading.remove();

      messages.forEach(msg => {
        const div = document.createElement("div");
        const contentStr = msg.content || "";
        const isSystem = contentStr.startsWith("__SYSTEM__:");
        
        // Direct comparison after fixing currentUserId to be a Number
        const isSent = msg.sender_id === currentUserId;
        div.className = `message ${isSystem ? 'system-msg' : (isSent ? 'sent' : 'received')}`;
        div.innerHTML = formatMessageHelper(contentStr); 
        
        area.appendChild(div);
        lastMessageId = Math.max(lastMessageId, msg.id);
      });
      area.scrollTop = area.scrollHeight;
    }
  } catch (err) { 
    console.error("Load messages failed", err);
    if (lastMessageId === 0) {
       document.getElementById("messagesArea").innerHTML = `<div class="loading-state">Error: ${err.message}</div>`;
    }
  }
}

function setupEventListeners() {
  const input = document.getElementById("messageInput");
  const btn = document.getElementById("sendButton");

  const send = async (e) => {
    const val = input.value.trim();
    if (!val || !currentInterestId) return;
    
    // Generate a unique nonce for idempotency
    // Safe check: some browsers/contexts lack the crypto object
    const nonce = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
      ? crypto.randomUUID() 
      : Date.now() + '-' + Math.random().toString(36).substr(2, 9);

    const target = e?.target || btn;
    runAction(target, async () => {
      await apiCall("/api/messages/send", {
        method: "POST",
        body: JSON.stringify({ interest_id: currentInterestId, content: val, nonce: nonce })
      });
      input.value = "";
    }, () => loadMessages(currentInterestId));
  };

  btn.onclick = send;
  input.onkeydown = (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } };
}

function startPolling() {
  stopPolling(); // Ensure no duplicate intervals are running
  pollInterval = setInterval(() => {
    loadConversations();
    if (currentInterestId) loadMessages(currentInterestId);
  }, 5000);
}

function stopPolling() { clearInterval(pollInterval); }

function formatTimeAgo(ts) {
  if (!ts) return "";
  const sec = Math.floor((new Date() - new Date(ts)) / 1000);
  if (sec < 60) return "Just now";
  if (sec < 3600) return `${Math.floor(sec/60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec/3600)}h ago`;
  return new Date(ts).toLocaleDateString();
}

function formatMessageHelper(content) {
  if (!content) return "";
  
  if (content.startsWith("__SYSTEM__:")) {
    const tag = content.replace("__SYSTEM__:", "");
    const labels = {
      "farmer_accepted":              "✅ Farmer accepted the deal",
      "contractor_accepted":          "✅ Contractor accepted the deal",
      "deal_fully_accepted":          "🎉 Deal confirmed by both parties",
      "rejected":                     "❌ Deal rejected",
      "rejected_crop_sold_out":       "❌ Rejected — crop sold out",
      "negotiating":                  "💬 Negotiation started",
      "withdrew_acceptance:farmer":   "↩️ Farmer withdrew acceptance",
      "withdrew_acceptance:contractor": "↩️ Contractor withdrew acceptance"
    };
    return `<div class="system-info">${labels[tag] || "📋 Status update"}</div>`;
  }

  if (content.startsWith("__COUNTER__:")) {
    const parts = content.replace("__COUNTER__:", "").split("|");
    let html = `<div class="counter-offer-box"><strong>💬 Counter Offer</strong><br>`;
    parts.forEach(p => {
      const [k, v] = p.split(":");
      html += `<span><b>${k}:</b> ${v}</span><br>`;
    });
    html += `</div>`;
    return html;
  }

  // Regular message: escape HTML for safety
  const div = document.createElement("div");
  div.textContent = content;
  return div.innerHTML;
}