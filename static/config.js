// Central configuration for the split hosting (Frontend: Vercel, Backend: Render)
// Update the API_BASE_URL to your actual Render service URL.
const API_BASE_URL = "https://bhoomi-mitra-5udh.onrender.com/";

// Patch the fetch function to use the absolute URL if a relative path is provided.
const originalFetch = window.fetch;
window.fetch = function (url, options) {
  if (typeof url === 'string' && url.startsWith('/') && !url.startsWith('//')) {
    url = API_BASE_URL + url;
  }
  return originalFetch(url, options);
};

console.log("🚀 Bhoomi Mitra Split-Hosting Bridge Active. Backend:", API_BASE_URL);
