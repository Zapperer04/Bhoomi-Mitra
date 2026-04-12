/**
 * Signup.js - Premium Authentication Logic
 * Handles both Signup and Login flows with unified formatting.
 */

document.addEventListener("DOMContentLoaded", () => {
    const signupForm = document.getElementById("signupForm");
    const loginForm  = document.getElementById("loginForm");

    // Helper to get phone value with prefix validation
    const getCleanPhone = (inputId) => {
        const val = document.getElementById(inputId).value.trim();
        // Ensure 10 digits
        if (!/^\d{10}$/.test(val)) {
            Toast.error("Please enter a valid 10-digit phone number");
            return null;
        }
        return "+91" + val;
    };

    // ===== REGISTER FLOW =====
    if (signupForm) {
        signupForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const btn = signupForm.querySelector('button[type="submit"]');
            
            const name     = document.getElementById("name").value.trim();
            const phone    = getCleanPhone("phone");
            const password = document.getElementById("password").value.trim();
            const role     = window.getSelectedSignupRole ? window.getSelectedSignupRole() : "farmer";

            if (!phone) return;
            if (!name || name.length < 2) { Toast.error("Please enter your full name"); return; }
            if (password.length < 6) { Toast.error("Password must be at least 6 characters"); return; }

            btn.disabled = true;
            const oldText = btn.textContent;
            btn.textContent = "...";

            try {
                const res = await fetch("/auth/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, phone, password, role }),
                });

                const data = await res.json();
                if (data.success) {
                    Toast.success("Registration successful! Redirecting to login...");
                    setTimeout(() => window.location.href = "/login", 1500);
                } else {
                    Toast.error(data.error || "Registration failed");
                }
            } catch (err) {
                console.error("Signup error:", err);
                Toast.error("Connection error. Please try again.");
            } finally {
                btn.disabled = false;
                btn.textContent = oldText;
            }
        });
    }

    // ===== LOGIN FLOW =====
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const btn = loginForm.querySelector('button[type="submit"]');
            
            const phone    = getCleanPhone("phone");
            const password = document.getElementById("password").value.trim();

            if (!phone) return;

            btn.disabled = true;
            const oldText = btn.textContent;
            btn.textContent = "...";

            try {
                const res = await fetch("/auth/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ phone, password }),
                });

                const data = await res.json();
                if (data.success && data.data.access_token) {
                    localStorage.setItem("access_token", data.data.access_token);
                    localStorage.setItem("user_role", data.data.role);
                    
                    Toast.success("Login successful! Welcome back.");
                    
                    // Redirect based on role
                    setTimeout(() => {
                        if (data.data.role === "farmer") window.location.href = "/farmer/dashboard";
                        else if (data.data.role === "contractor") window.location.href = "/contractor/dashboard";
                        else window.location.href = "/chatbot";
                    }, 1000);
                } else {
                    Toast.error(data.error || "Invalid phone or password");
                }
            } catch (err) {
                console.error("Login error:", err);
                Toast.error("Connection error. Please try again.");
            } finally {
                btn.disabled = false;
                btn.textContent = oldText;
            }
        });
    }
});
