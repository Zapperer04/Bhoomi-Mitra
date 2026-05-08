// Central configuration for the split hosting (Frontend: Vercel, Backend: Render)
const API_BASE_URL = "https://bhoomi-mitra-5udh.onrender.com";

// Patch the fetch function to use the absolute URL if a relative path is provided.
const originalFetch = window.fetch;
window.fetch = function (url, options) {
  if (typeof url === 'string' && url.startsWith('/') && !url.startsWith('//')) {
    // Ensure no double slashes
    url = API_BASE_URL + url;
  }
  return originalFetch(url, options);
};

console.log("🚀 Bhoomi Mitra Split-Hosting Bridge Active. Backend:", API_BASE_URL);

// --- UNIVERSAL MENU TOGGLE ---
document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.getElementById('menuToggle');
    const navRight = document.querySelector('.bm-right');
    
    if (menuToggle && navRight) {
        menuToggle.addEventListener('click', () => {
            navRight.classList.toggle('nav-open');
            // Toggle icon if needed
            const icon = menuToggle.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-bars');
                icon.classList.toggle('fa-times');
            }
        });
    }
});

