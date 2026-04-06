/**
 * gov.js — Government Schemes Page
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

document.addEventListener("DOMContentLoaded", async () => {
    if (!localStorage.getItem("access_token")) { window.location.href = "/login"; return; }

    // Initialize Header
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
    } catch (err) { console.error("Header load failed", err); }

    // Logout
    document.getElementById("logoutBtn")?.addEventListener("click", () => {
        localStorage.removeItem("access_token");
        window.location.href = "/login";
    });

    // Language Selector (Basic toggle for this page)
    const langBtn = document.getElementById("langBtn");
    const langDropdown = document.getElementById("langDropdown");
    if (langBtn && langDropdown) {
        langBtn.onclick = (e) => {
            e.stopPropagation();
            langDropdown.classList.toggle("hidden");
        };
        document.addEventListener("click", () => langDropdown.classList.add("hidden"));
    }
});
