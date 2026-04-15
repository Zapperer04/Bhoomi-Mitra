// =============================================================================
// SELF-INITIALIZING GOOGLE TRANSLATE WIDGET
// =============================================================================
// This script handles both the background Google Translate logic and the 
// custom premium UI, making it a "drop-in" solution for any page.

// 1. Define the global initialization callback that Google's script expects
window.googleTranslateElementInit = function() {
    if (typeof google !== 'undefined' && google.translate) {
        new google.translate.TranslateElement({
            pageLanguage: 'en',
            includedLanguages: 'hi,bn,te,mr,ta,gu,ur,kn,or,pa,ml,en', 
            layout: google.translate.TranslateElement.InlineLayout.SIMPLE,
            autoDisplay: false
        }, 'google_translate_element');
    }
};

// 2. Dynamically load the Google Translate external script if not already present
(function loadGoogleScript() {
    if (!document.querySelector('script[src*="translate.google.com"]')) {
        const script = document.createElement('script');
        script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
    }
})();

// 3. Inject CSS to hide Google's default UI elements and clean up headers
(function injectHidingCSS() {
    const css = `
        /* Hide Google top banner and all its variants */
        .goog-te-banner-frame.skiptranslate,
        .goog-te-banner-frame,
        .goog-te-banner,
        .skiptranslate iframe,
        iframe.skiptranslate,
        .goog-te-gadget-icon,
        .goog-te-gadget-simple img,
        .goog-te-gadget,
        .goog-logo-link,
        .goog-te-gadget span,
        .goog-te-gadget-simple { 
            display: none !important; 
            visibility: hidden !important;
            height: 0 !important;
            width: 0 !important;
            opacity: 0 !important;
        }
        
        /* Stop Google from pushing the body down */
        body { 
            top: 0px !important; 
            position: static !important;
        }
        
        /* Hide tooltips and highlights completely */
        #goog-gt-tt, 
        .goog-te-balloon-frame, 
        #goog-gt-tt *, 
        .goog-te-tooltip, 
        .goog-te-tooltip *,
        .VIpgJd-Zvi9ab-aZ2w3d-vS79t-ad21 { 
            display: none !important; 
            visibility: hidden !important;
            pointer-events: none !important;
            opacity: 0 !important;
        }
        
        .goog-text-highlight { 
            background: none !important; 
            box-shadow: none !important; 
        }

        /* Hide the actual widget element entirely */
        #google_translate_element {
            display: none !important;
            height: 0 !important;
            width: 0 !important;
            overflow: hidden !important;
        }
    `;
    const style = document.createElement('style');
    style.innerHTML = css;
    document.head.appendChild(style);
})();

// 4. Fast UI initialization for the custom dropdown
(function initFast() {
    if (document.getElementById('google_translate_element')) {
        buildCustomUI();
    } else if (document.readyState !== 'complete') {
        setTimeout(initFast, 100); 
    }
})();

function buildCustomUI() {
    const googleDiv = document.getElementById('google_translate_element');
    if (!googleDiv) return;

    // Create wrapper and prevent Google from translating it
    const customWrapper = document.createElement('div');
    customWrapper.className = 'lang-selector notranslate'; 
    customWrapper.setAttribute('translate', 'no');
    customWrapper.style.position = 'relative';
    customWrapper.style.zIndex = '9999';

    // Create the clean CTA Button
    const btn = document.createElement('button');
    btn.className = 'btn-secondary action-btn light'; // Try to hook into global CTA classes if available
    btn.style.cssText = 'display: flex; align-items: center; gap: 0.5rem; background: #ffffff; border: 1.5px solid #d1fae5; color: #047857; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-weight: 700; font-family: "DM Sans", sans-serif; transition: 0.2s; white-space: nowrap; height: 40px;';
    btn.innerHTML = '🌐 <span id="customLangLabel">English</span>';
    
    // Create the Dropdown
    const dropdown = document.createElement('div');
    dropdown.className = 'lang-dropdown'; // Removed 'hidden' class to prevent CSS !important overrides
    dropdown.style.cssText = 'position: absolute; top: calc(100% + 8px); right: 0; background: #ffffff; box-shadow: 0 10px 25px rgba(0,0,0,0.1); border-radius: 12px; min-width: 160px; z-index: 10000; overflow: hidden; border: 1px solid #e5e7eb; display: none; flex-direction: column;';

    const languages = [
        { code: 'en', name: 'English' },
        { code: 'hi', name: 'हिंदी' },
        { code: 'bn', name: 'বাংলা' },
        { code: 'te', name: 'తెలుగు' },
        { code: 'mr', name: 'मराठी' },
        { code: 'ta', name: 'தமிழ்' },
        { code: 'gu', name: 'ગુજરાતી' },
        { code: 'ur', name: 'اردو' },
        { code: 'kn', name: 'ಕನ್ನಡ' },
        { code: 'or', name: 'ଓଡ଼ିଆ' },
        { code: 'pa', name: 'ਪੰਜਾਬੀ' },
        { code: 'ml', name: 'മലയാളം' }
    ];

    languages.forEach(lang => {
        const option = document.createElement('button');
        option.style.cssText = 'display: block; width: 100%; padding: 12px 16px; border: none; background: transparent; text-align: left; cursor: pointer; color: #374151; font-family: "DM Sans", sans-serif; font-weight: 600; font-size: 14px; transition: 0.15s;';
        option.innerHTML = lang.name;
        
        // Hover effects
        option.addEventListener('mouseover', () => {
            option.style.background = '#f0fdf4';
            option.style.color = '#047857';
        });
        option.addEventListener('mouseout', () => {
            option.style.background = 'transparent';
            option.style.color = '#374151';
        });
        
        option.addEventListener('click', () => {
            document.getElementById('customLangLabel').innerText = lang.name;
            dropdown.style.display = 'none'; // close dropdown
            
            // 1. Set the cookie natively so it propagates
            document.cookie = "googtrans=/en/" + lang.code + "; path=/";
            document.cookie = "googtrans=/en/" + lang.code + "; domain=" + window.location.hostname + "; path=/";
            
            // 2. Try pushing selection to Google Translate secretly
            const selectElement = document.querySelector('.goog-te-combo');
            if (selectElement) {
                selectElement.value = lang.code;
                try {
                    selectElement.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
                } catch(e) {
                    let ev = document.createEvent("HTMLEvents");
                    ev.initEvent("change", true, true);
                    selectElement.dispatchEvent(ev);
                }
            } else {
                location.reload(); // Fallback if widget is missing
            }
        });
        dropdown.appendChild(option);
    });

    // Toggle dropdown
    btn.addEventListener('click', (e) => {
        e.stopPropagation(); // prevent window click from closing immediately
        if (dropdown.style.display === 'none') {
            dropdown.style.display = 'flex';
            btn.style.borderColor = '#10b981'; // Activate border
        } else {
            dropdown.style.display = 'none';
            btn.style.borderColor = '#d1fae5'; // Deactivate border
        }
    });

    // Close on outside click
    document.addEventListener('click', () => {
        dropdown.style.display = 'none';
        btn.style.borderColor = '#d1fae5';
    });
    
    // Hover effects on the main CTA
    btn.addEventListener('mouseover', () => btn.style.background = '#f0fdf4');
    btn.addEventListener('mouseout', () => btn.style.background = '#ffffff');

    customWrapper.appendChild(btn);
    customWrapper.appendChild(dropdown);
    
    // Inject into the DOM right where google translate was dropped
    googleDiv.parentNode.insertBefore(customWrapper, googleDiv.nextSibling);

    // Initial label set based on current cookie
    const match = document.cookie.match(/googtrans=\/en\/([a-z]{2})/);
    if (match && match[1]) {
        const found = languages.find(l => l.code === match[1]);
        if (found) document.getElementById('customLangLabel').innerText = found.name;
    }
}

// =============================================================================
// DT POLYFILL (Backwards Compatibility)
// =============================================================================
// Provides a mock 'DT' object to prevent legacy Dashboard scripts from crashing 
// now that the manual dictionary system has been removed.
window.DT = {
    ready: Promise.resolve(),
    t: function(key) {
        const dictionary = {
            "status.active": "Active", 
            "status.partially_sold": "Partially Sold", 
            "status.negotiating": "Negotiating", 
            "status.sold": "Sold", 
            "status.pending": "Pending",
            "status.rejected": "Rejected",
            "no_active_crops": "No active crops found.", 
            "label.qty": "Qty", 
            "farmer.quantity_quintals": "Quintals", 
            "label.status": "Status", 
            "remove_listing": "Remove Listing", 
            "confirm_remove_listing": "Are you sure you want to remove this active listing?",
            "no_history": "No history available.", 
            "btn.clear": "Clear", 
            "no_interests": "No interests found.", 
            "open_chat": "Open Chat", 
            "final_accept_btn": "Accept & Finalize",
            "accept_btn": "Accept", 
            "reject_btn": "Reject", 
            "label.contractor": "Contractor", 
            "label.offered": "Offered Price",
            "failed_crops": "Failed to load crops data.", 
            "no_crops": "No active crops available right now.", 
            "interest_shown": "Interest Shown", 
            "resubmit_btn": "Resubmit Offer",
            "show_interest_btn": "Show Interest", 
            "quantity_lbl": "Quantity", 
            "quintals": "Quintals", 
            "price_lbl": "Price", 
            "quintal_short": "quintal", 
            "location_lbl": "Location", 
            "toast.interest_sent": "Interest has been sent successfully!"
        };
        return dictionary[key] || key.split('.').pop().replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
};
