document.addEventListener("DOMContentLoaded", () => {
  const signupForm = document.getElementById("signupForm");
  const loginForm = document.getElementById("loginForm");

  // ===== REGISTER =====
  if (signupForm) {
    signupForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const name = document.getElementById("name").value.trim();
      const phone = document.getElementById("phone").value.trim();
      const password = document.getElementById("password").value.trim();

      if (!name || !phone || !password) {
        alert("All fields are required for registration.");
        return;
      }

      try {
        const res = await fetch("/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, phone, password }),
        });

        const data = await res.json();

        if (res.ok) {
          alert("Registration successful! Please log in now.");
          document.getElementById("login-tab").click();
        } else {
          alert(data.message || "Registration failed.");
        }
      } catch (err) {
        console.error("Signup error:", err);
        alert("Error connecting to server.");
      }
    });
  }

  // ===== LOGIN =====
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const phone = document.getElementById("login-phone").value.trim();
      const password = document.getElementById("login-password").value.trim();

      if (!phone || !password) {
        alert("Both phone and password are required.");
        return;
      }

      try {
        const res = await fetch("/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, password }),
        });

        const data = await res.json();

        if (res.ok && data.access_token) {
          localStorage.setItem("access_token", data.access_token);
          localStorage.setItem("user_phone", phone);

          alert("Login successful!");
          window.location.href = "/chatbot";
        } else {
          alert(data.message || "Login failed.");
        }
      } catch (err) {
        console.error("Login error:", err);
        alert("Error connecting to server.");
      }
    });
  }
});
