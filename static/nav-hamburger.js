/* ============================================================
   nav-hamburger.js — Hamburger Menu Controller
   ============================================================
   Reads existing .dash-nav / .nav items and builds a clean
   slide-in panel for phone layouts. Self-initializing.
   ============================================================ */

(function initHamburger() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', buildHamburger);
    } else {
        buildHamburger();
    }
})();

function buildHamburger() {
    const nav = document.querySelector('.dash-nav') || document.querySelector('.nav');
    if (!nav) return;

    const isDashNav = nav.classList.contains('dash-nav');

    // --- 1. Create the hamburger button ---
    const burger = document.createElement('button');
    burger.className = 'hamburger-toggle';
    burger.setAttribute('aria-label', 'Open menu');
    burger.innerHTML = '<span></span><span></span><span></span>';

    // --- 2. Create backdrop ---
    const backdrop = document.createElement('div');
    backdrop.className = 'nav-backdrop';
    document.body.appendChild(backdrop);

    // --- 3. Create slide panel ---
    const panel = document.createElement('div');
    panel.className = 'nav-slide-panel';

    // Panel header
    const header = document.createElement('div');
    header.className = 'nav-panel-header';
    header.innerHTML = `
        <span class="panel-title notranslate">Bhoomi Mitra</span>
        <button class="nav-panel-close" aria-label="Close menu">&times;</button>
    `;
    panel.appendChild(header);

    // --- 4. Build panel items from existing nav ---
    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'nav-panel-items';

    if (isDashNav) {
        buildDashPanelItems(nav, itemsContainer, panel);
    } else {
        buildLandingPanelItems(nav, itemsContainer);
    }

    panel.appendChild(itemsContainer);
    document.body.appendChild(panel);

    // --- 5. Insert hamburger into nav ---
    if (isDashNav) {
        // Place hamburger at the end of nav-left (after logo)
        const navLeft = nav.querySelector('.nav-left');
        if (navLeft) navLeft.appendChild(burger);
        else nav.appendChild(burger);
    } else {
        // Landing page: put burger in the nav directly
        nav.appendChild(burger);
    }

    // --- 6. Toggle logic ---
    function openMenu() {
        panel.classList.add('open');
        backdrop.classList.add('visible');
        burger.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    function closeMenu() {
        panel.classList.remove('open');
        backdrop.classList.remove('visible');
        burger.classList.remove('active');
        document.body.style.overflow = '';
    }

    burger.addEventListener('click', (e) => {
        e.stopPropagation();
        if (panel.classList.contains('open')) closeMenu();
        else openMenu();
    });

    backdrop.addEventListener('click', closeMenu);
    header.querySelector('.nav-panel-close').addEventListener('click', closeMenu);

    // Close on ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeMenu();
    });

    // Close when a panel link is clicked
    panel.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => setTimeout(closeMenu, 150));
    });
}

/* ── Build panel items for dashboard-style navs ─────────── */
function buildDashPanelItems(nav, container, panel) {
    const navLeft = nav.querySelector('.nav-left');
    const navRight = nav.querySelector('.nav-right');

    // Collect links from nav-left (skip logo)
    if (navLeft) {
        navLeft.querySelectorAll('a.nav-messages-link').forEach(link => {
            const item = document.createElement('a');
            item.href = link.href;
            // Extract text content (emoji + text)
            const emoji = link.childNodes[0]?.textContent?.trim() || '';
            const spanText = link.querySelector('span')?.textContent?.trim() || '';
            item.innerHTML = `<span class="panel-icon">${emoji}</span> ${spanText}`;
            container.appendChild(item);
        });
    }

    container.appendChild(createDivider());

    // Profile section
    if (navRight) {
        const profileBtn = navRight.querySelector('.profile-nav-btn');
        const roleBadge = navRight.querySelector('.role-badge');
        const avatarEl = navRight.querySelector('.profile-nav-avatar');
        const nameEl = navRight.querySelector('.profile-nav-name');

        if (profileBtn) {
            const profileSection = document.createElement('a');
            profileSection.href = profileBtn.href || '/profile';
            profileSection.className = 'nav-panel-profile';
            profileSection.innerHTML = `
                <span class="panel-avatar">${avatarEl?.textContent?.trim() || '?'}</span>
                <span class="panel-profile-info">
                    <span class="panel-profile-name">${nameEl?.textContent?.trim() || 'Profile'}</span>
                    <span class="panel-profile-role">${roleBadge?.textContent?.trim() || ''}</span>
                </span>
            `;
            container.appendChild(profileSection);
        }

        container.appendChild(createDivider());

        // Language widget — move the actual widget into the panel
        const translateEl = navRight.querySelector('#google_translate_element');
        const langSelector = navRight.querySelector('.lang-selector');
        if (langSelector) {
            const langWrap = document.createElement('div');
            langWrap.className = 'nav-panel-lang';
            langWrap.appendChild(langSelector);
            container.appendChild(langWrap);
        } else if (translateEl) {
            // The custom widget built by google_translate.js will be placed after this element
            // We need to check if the custom lang-selector was already built
            const customLang = translateEl.parentElement?.querySelector('.lang-selector');
            if (customLang) {
                const langWrap = document.createElement('div');
                langWrap.className = 'nav-panel-lang';
                langWrap.appendChild(customLang);
                container.appendChild(langWrap);
            }
        }

        container.appendChild(createDivider());

        // Logout
        const logoutBtn = navRight.querySelector('.logout-btn, #logoutBtn');
        if (logoutBtn) {
            const logoutItem = document.createElement('button');
            logoutItem.className = 'panel-logout';
            logoutItem.innerHTML = '<span class="panel-icon">🚪</span> Logout';
            logoutItem.addEventListener('click', () => {
                logoutBtn.click();
            });
            container.appendChild(logoutItem);
        }
    }
}

/* ── Build panel items for landing page nav ─────────────── */
function buildLandingPanelItems(nav, container) {
    const navRight = nav.querySelector('.nav-right');
    if (!navRight) return;

    navRight.querySelectorAll('a.nav-link').forEach(link => {
        const item = document.createElement('a');
        item.href = link.href;
        const isLogin = link.classList.contains('login');
        const text = link.textContent.trim();
        item.innerHTML = `<span class="panel-icon">${isLogin ? '🔐' : '🏠'}</span> ${text}`;
        if (isLogin) {
            item.style.color = '#047857';
            item.style.fontWeight = '800';
        }
        container.appendChild(item);
    });

    container.appendChild(createDivider());

    // Language widget
    const translateEl = navRight.querySelector('#google_translate_element');
    const langSelector = navRight.querySelector('.lang-selector');
    if (langSelector) {
        const langWrap = document.createElement('div');
        langWrap.className = 'nav-panel-lang';
        langWrap.appendChild(langSelector);
        container.appendChild(langWrap);
    }
}

function createDivider() {
    const d = document.createElement('div');
    d.className = 'nav-panel-divider';
    return d;
}

/* ── Keep panel profile in sync with main nav ───────────── */
// The dashboard.js sets #navAvatar and #navName after API calls.
// This observer keeps the panel copy in sync.
const avatarObserver = new MutationObserver(() => {
    const src = document.getElementById('navAvatar');
    const name = document.getElementById('navName');
    const panelAvatar = document.querySelector('.panel-avatar');
    const panelName = document.querySelector('.panel-profile-name');
    if (src && panelAvatar) panelAvatar.textContent = src.textContent;
    if (name && panelName) panelName.textContent = name.textContent;
});

document.addEventListener('DOMContentLoaded', () => {
    const target = document.getElementById('navAvatar');
    if (target) {
        avatarObserver.observe(target, { childList: true, characterData: true, subtree: true });
    }
    const nameTarget = document.getElementById('navName');
    if (nameTarget) {
        avatarObserver.observe(nameTarget, { childList: true, characterData: true, subtree: true });
    }
});
