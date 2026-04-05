// Standardized API wrapper
async function apiCall(url, options = {}) {
  const res = await fetch(url, options);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || "Request failed");
  return json.data;
}

// ================= LOGIN =================
async function loginUser(phone, password) {
  const btn = document.querySelector("#loginForm button");
  if (btn) btn.disabled = true;

  try {
    const data = await apiCall("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, password }),
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
      const payload = {
        name: document.getElementById("name").value.trim(),
        phone: document.getElementById("phone").value.trim(),
        password: document.getElementById("password").value.trim(),
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
