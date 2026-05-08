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

// --- Universal Hamburger Menu Injection ---
document.addEventListener('DOMContentLoaded', () => {
    const nav = document.querySelector('.dash-nav');
    if (nav) {
        // Create hamburger button
        const hamburger = document.createElement('button');
        hamburger.className = 'hamburger-btn';
        hamburger.innerHTML = '<i class="fas fa-bars"></i>';
        hamburger.setAttribute('aria-label', 'Toggle Navigation');
        nav.appendChild(hamburger);

        // Toggle logic
        hamburger.addEventListener('click', () => {
            document.body.classList.toggle('nav-active');
            const icon = hamburger.querySelector('i');
            if (document.body.classList.contains('nav-active')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
    }
});
