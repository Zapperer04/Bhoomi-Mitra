 * profile.js
 */

function normalizePhone(phone) {
  phone = phone.replace(/\s+/g, '');
  if (/^\d{10}$/.test(phone)) return '+91' + phone;
  if (/^91\d{10}$/.test(phone)) return '+' + phone;
  return phone;
}

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

  await loadData();
  setupNameSave();
  setupPhoneSave();
  setupPasswordSave();
  setupDeleteAccount();
  setupStrengthMeter();

  document.getElementById("logoutBtn").onclick = () => {
    localStorage.removeItem("access_token");
    window.location.href = "/login";
  };
});

async function loadData() {
  try {
    const user = await apiCall("/auth/profile");
    const initial = (user.name || "?").charAt(0).toUpperCase();
    
    const avatarEl = document.getElementById("avatarInitial");
    if (avatarEl) avatarEl.textContent = initial;

    const displayTitle = document.getElementById("displayName");
    if (displayTitle) displayTitle.textContent = user.name;

    const displayPhone = document.getElementById("displayPhone");
    if (displayPhone) displayPhone.textContent = user.phone;

    const displayRole = document.getElementById("displayRole");
    if (displayRole) {
        displayRole.textContent = user.role === "farmer" ? "🌾 Farmer" : "🏗️ Contractor";
    }

    const inputName = document.getElementById("inputName");
    if (inputName) inputName.value = user.name;

    const inputPhone = document.getElementById("inputPhone");
    if (inputPhone) inputPhone.value = user.phone;

  } catch (err) { 
    console.error("Profile load error:", err);
    showFeedback("fbName", "error", "Failed to load profile. Please refresh."); 
  }
}

function setupNameSave() {
  document.getElementById("btnSaveName").onclick = async () => {
    const name = document.getElementById("inputName").value.trim();
    setLoading("btnSaveName", true);
    try {
      const data = await apiCall("/auth/profile/name", { method: "PATCH", body: JSON.stringify({ name }) });
      document.getElementById("displayName").textContent = data.name;
      loadProfile(); // Refresh avatars
      showFeedback("fbName", "success", "✓ Name updated");
    } catch (err) { showFeedback("fbName", "error", err.message); }
    finally { setLoading("btnSaveName", false); }
  };
}

function setupPhoneSave() {
  document.getElementById("btnSavePhone").onclick = async () => {
    const rawPhone = document.getElementById("inputPhone").value.trim();
    const phone = normalizePhone(rawPhone);
    
    if (!/^\+91\d{10}$/.test(phone)) {
      showFeedback("fbPhone", "error", "Invalid Indian phone format. Use 10 digits or +91XXXXXXXXXX");
      return;
    }

    setLoading("btnSavePhone", true);
    try {
      const data = await apiCall("/auth/profile/phone", { method: "PATCH", body: JSON.stringify({ phone }) });
      document.getElementById("displayPhone").textContent = data.phone;
      showFeedback("fbPhone", "success", "✓ Phone updated");
    } catch (err) { showFeedback("fbPhone", "error", err.message); }
    finally { setLoading("btnSavePhone", false); }
  };
}

function setupPasswordSave() {
  document.getElementById("btnSavePw").onclick = async () => {
    const cur = document.getElementById("inputCurrentPw").value;
    const n1 = document.getElementById("inputNewPw").value;
    const n2 = document.getElementById("inputConfirmPw").value;

    if (n1 !== n2) { showFeedback("fbPw", "error", "Passwords do not match"); return; }
    setLoading("btnSavePw", true);
    try {
      await apiCall("/auth/profile/password", {
        method: "PATCH",
        body: JSON.stringify({ current_password: cur, new_password: n1, confirm_password: n2 })
      });
      showFeedback("fbPw", "success", "✓ Password changed");
      ["inputCurrentPw", "inputNewPw", "inputConfirmPw"].forEach(id => document.getElementById(id).value = "");
    } catch (err) { showFeedback("fbPw", "error", err.message); }
    finally { setLoading("btnSavePw", false); }
  };
}

function setupDeleteAccount() {
  const modal = document.getElementById("deleteModal");
  document.getElementById("btnDeleteAccount").onclick = () => modal.classList.add("open");
  document.getElementById("cancelDelete").onclick = document.getElementById("cancelDelete2").onclick = () => modal.classList.remove("open");

  document.getElementById("confirmDelete").onclick = async () => {
    const pw = document.getElementById("deleteConfirmPw").value;
    setLoading("confirmDelete", true);
    try {
      await apiCall("/auth/profile/delete", { method: "DELETE", body: JSON.stringify({ password: pw }) });
      localStorage.removeItem("access_token");
      window.location.href = "/?deleted=1";
    } catch (err) { showFeedback("fbDelete", "error", err.message); }
    finally { setLoading("confirmDelete", false); }
  };
}

function setupStrengthMeter() {
  document.getElementById("inputNewPw").oninput = function() {
    const pw = this.value;
    const wrap = document.getElementById("strengthWrap");
    const fill = document.getElementById("strengthFill");
    if (!pw) { wrap.classList.remove("visible"); return; }
    wrap.classList.add("visible");
    const s = calcStrength(pw);
    const colors = ["#c0392b", "#e67e22", "#f1c40f", "#27ae60", "#1a7a2e"];
    fill.style.width = ((s+1)*20) + "%";
    fill.style.background = colors[s];
    document.getElementById("strengthLabel").textContent = ["Very weak", "Weak", "Fair", "Strong", "Very strong"][s];
    document.getElementById("strengthLabel").style.color = colors[s];
  };
}

function calcStrength(pw) {
  let s = 0;
  if (pw.length < 6) return 0;
  s++; // Goal 1: Length >= 6
  if (pw.length >= 10) s++; // Goal 2: Length >= 10 (Bonus)
  if (/[A-Za-z]/.test(pw) && /\d/.test(pw)) s++; // Goal 3: Mixed Letter+Number (Required)
  if (/[^A-Za-z0-9]/.test(pw)) s++; // Goal 4: Symbol (Bonus)
  return Math.min(s, 4);
}

function showFeedback(id, type, msg) {
  const el = document.getElementById(id);
  el.className = `feedback ${type}`;
  el.textContent = msg;
  if (type === "success") setTimeout(() => { el.className = "feedback"; el.textContent = ""; }, 4000);
}

function setLoading(id, loading) {
  const b = document.getElementById(id); 
  b.disabled = loading;
  if (loading) { b.dataset.txt = b.textContent; b.textContent = "Saving..."; }
  else { b.textContent = b.dataset.txt || "Save"; }
}