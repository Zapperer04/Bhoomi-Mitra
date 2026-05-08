/**
 * i18n.js — Dynamic Translation System for Bhoomi Mitra
 * Fetches translations from the Render backend.
 */

window.DT = {
    lang: localStorage.getItem("bm_lang") || "en",
    dict: {},
    ready: null,

    async init() {
        this.ready = this.fetchTranslations();
        await this.ready;
        this.applyTranslations();
    },

    async fetchTranslations() {
        try {
            // Using absolute URL if defined in config.js (API_BASE_URL)
            const url = `/api/translations?lang=${this.lang}`;
            const res = await fetch(url);
            const json = await res.json();
            if (json.success) {
                this.dict = json.data;
            }
        } catch (err) {
            console.error("Failed to load translations:", err);
        }
    },

    t(key) {
        // Fallback: return prettified key if missing
        return this.dict[key] || key.split('.').pop().replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    },

    applyTranslations() {
        document.querySelectorAll("[data-i18n]").forEach(el => {
            const key = el.getAttribute("data-i18n");
            const translation = this.t(key);
            if (translation) {
                el.textContent = translation;
            }
        });
    },

    setLang(lang) {
        this.lang = lang;
        localStorage.setItem("bm_lang", lang);
        // Refresh or just re-fetch and apply? Refresh is safer for all components.
        window.location.reload();
    }
};

// Auto-init
window.DT.init();