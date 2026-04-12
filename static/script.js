// Standardized API wrapper
async function apiCall(url, options = {}) {
  const res = await fetch(url, options);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Request failed");
  return json.data;
}

function normalizePhone(phone) {
  // Now simpler: input is exactly 10 digits due to maxlength. UI prefix is static +91.
  phone = phone.replace(/\s+/g, '');
  if (/^\d{10}$/.test(phone)) return '+91' + phone;
  return phone;
}

function validatePassword(pw) {
  if (pw.length < 6) return "Password must be at least 6 characters.";
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return "Password must contain a letter and a number.";
  return null;
}

// ================= LOGIN =================
async function loginUser(phone, password) {
  const btn = document.querySelector("#loginForm button");
  if (btn) btn.disabled = true;

  try {
    const normalizedPhone = normalizePhone(phone);
    const data = await apiCall("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: normalizedPhone, password }),
    });

    if (data.access_token) {
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user_role", data.role);
      localStorage.setItem("user_phone", phone);

      if (data.role === "farmer") {
        window.location.href = "/farmer/dashboard";
      } else if (data.role === "contractor") {
        window.location.href = "/contractor/dashboard";
      } else {
        window.location.href = "/";
      }
    }
  } catch (err) {
    console.error("Login error:", err);
    if (typeof Toast !== 'undefined') Toast.error(err.message);
    else alert(err.message);
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ================= SIGNUP =================
document.addEventListener("DOMContentLoaded", () => {
  const signupForm = document.getElementById("signupForm");
  const loginForm = document.getElementById("loginForm");

  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const btn = signupForm.querySelector("button");
      btn.disabled = true;

      const role = window.getSelectedSignupRole?.() || "farmer";
      const phone = document.getElementById("phone").value.trim();
      const password = document.getElementById("password").value.trim();
      
      const normalizedPhone = normalizePhone(phone);
      const pwError = validatePassword(password);
      
      if (!/^\+91\d{10}$/.test(normalizedPhone)) {
        alert("Please enter a valid 10-digit phone number.");
        btn.disabled = false;
        return;
      }
      
      if (pwError) {
        alert(pwError);
        btn.disabled = false;
        return;
      }

      const payload = {
        name: document.getElementById("name").value.trim(),
        phone: normalizedPhone,
        password: password,
        role: role,
      };

      try {
        await apiCall("/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        alert("Account created! Please login.");
        window.location.href = "/login";
      } catch (err) {
        console.error("Signup error:", err);
        alert(err.message);
      } finally {
        btn.disabled = false;
      }
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const phone = document.getElementById("phone").value.trim();
      const password = document.getElementById("password").value.trim();
      loginUser(phone, password);
    });
  }
});
