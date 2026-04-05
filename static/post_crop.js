/**
 * post_crop.js
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

document.addEventListener("DOMContentLoaded", () => {
    const dateInput = document.getElementById("availabilityDate");
    if (dateInput) dateInput.min = new Date().toISOString().split("T")[0];

    const form = document.getElementById("postCropForm");
    const btn = form?.querySelector(".submit-btn");

    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            if (btn && btn.disabled) return;

            const payload = {
                cropName:         form.querySelector('input[name="crop"]').value.trim(),
                quantity:         form.querySelector('input[name="quantity"]').value.trim(),
                price:            form.querySelector('input[name="price"]').value.trim(),
                location:         form.querySelector('input[name="location"]').value.trim(),
                availabilityDate: form.querySelector('input[name="availability"]').value
            };

            if (btn) { btn.disabled = true; btn.textContent = "Posting..."; }

            try {
                await apiCall("/api/crops", { method: "POST", body: JSON.stringify(payload) });
                Toast.success("Crop posted successfully!");
                setTimeout(() => { window.location.href = "/farmer/dashboard"; }, 1500);
            } catch (err) {
                Toast.error(err.message);
                if (btn) { btn.disabled = false; btn.textContent = "Post Crop"; }
            }
        };
    }
});