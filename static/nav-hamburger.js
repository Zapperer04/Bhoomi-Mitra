/* ============================================================
   nav-hamburger.js — Mobile Navigation Controller
   ============================================================
   Builds a structured off-canvas menu for dashboard and
   landing navs without disturbing the desktop layout.
   ============================================================ */

(function initHamburger() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', buildHamburger);
    } else {
        buildHamburger();
    }
})();

function buildHamburger() {
    const nav = document.querySelector('.dash-nav') || document.querySelector('.prof-nav') || document.querySelector('.nav');
    if (!nav || nav.dataset.hamburgerReady === 'true') return;
    nav.dataset.hamburgerReady = 'true';

    const isDashNav = nav.classList.contains('dash-nav');
    const isProfileNav = nav.classList.contains('prof-nav');
    const navLabel = isProfileNav ? 'Profile menu' : (isDashNav ? 'Dashboard menu' : 'Site menu');

    const burger = document.createElement('button');
    burger.type = 'button';
    burger.className = 'hamburger-toggle';
    burger.setAttribute('aria-label', 'Open navigation menu');
    burger.setAttribute('aria-expanded', 'false');
    burger.innerHTML = '<span></span><span></span><span></span>';

    const backdrop = document.createElement('div');
    backdrop.className = 'nav-backdrop';
    document.body.appendChild(backdrop);

    const panel = document.createElement('aside');
    panel.className = 'nav-slide-panel';
    panel.setAttribute('aria-label', 'Mobile navigation');

    const header = document.createElement('div');
    header.className = 'nav-panel-header';
    header.innerHTML = `
        <div class="nav-panel-header-copy">
            <span class="panel-title notranslate">Bhoomi Mitra</span>
            <span class="panel-subtitle">${navLabel}</span>
        </div>
        <button type="button" class="nav-panel-close" aria-label="Close menu">&times;</button>
    `;
    panel.appendChild(header);

    const content = document.createElement('div');
    content.className = 'nav-panel-items';

    if (isDashNav || isProfileNav) {
        buildDashPanelItems(nav, content);
    } else {
        buildLandingPanelItems(nav, content);
    }

    panel.appendChild(content);
    document.body.appendChild(panel);

    if (isDashNav || isProfileNav) {
        const navLeft = nav.querySelector('.nav-left');
        if (navLeft) navLeft.appendChild(burger);
        else nav.appendChild(burger);
    } else {
        nav.appendChild(burger);
    }

    function openMenu() {
        panel.classList.add('open');
        backdrop.classList.add('visible');
        burger.classList.add('active');
        burger.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
    }

    function closeMenu() {
        panel.classList.remove('open');
        backdrop.classList.remove('visible');
        burger.classList.remove('active');
        burger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
    }

    burger.addEventListener('click', (event) => {
        event.stopPropagation();
        if (panel.classList.contains('open')) closeMenu();
        else openMenu();
    });

    backdrop.addEventListener('click', closeMenu);
    header.querySelector('.nav-panel-close').addEventListener('click', closeMenu);

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeMenu();
    });

    panel.addEventListener('click', (event) => {
        const interactive = event.target.closest('a, button');
        if (!interactive || interactive.classList.contains('nav-panel-close')) return;
        if (interactive.closest('.lang-selector')) return;
        setTimeout(closeMenu, 120);
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) closeMenu();
    });
}

function buildDashPanelItems(nav, container) {
    const navLeft = nav.querySelector('.nav-left');
    const navRight = nav.querySelector('.nav-right');
    const isProfileNav = nav.classList.contains('prof-nav');
    const useMobilePanel = window.innerWidth <= 768;

    const quickLinks = collectLinks(navLeft, isProfileNav ? 'a.nav-back' : 'a.nav-messages-link');
    if (quickLinks.length > 0) {
        const section = createPanelSection(isProfileNav ? 'Navigation' : 'Quick links');
        quickLinks.forEach((link) => section.body.appendChild(buildPanelLink(link)));
        container.appendChild(section.root);
    }

    if (navRight) {
        const accountSection = createPanelSection('Account');
        const profileBtn = navRight.querySelector('.profile-nav-btn');
        const roleBadge = navRight.querySelector('.role-badge');
        const avatarEl = navRight.querySelector('.profile-nav-avatar');
        const nameEl = navRight.querySelector('.profile-nav-name');

        if (profileBtn) {
            // Late-joiner check: If dashboard.js already loaded the name into the desktop nav, use it.
            const currentAvatar = avatarEl?.textContent?.trim() || '❓';
            const currentName = nameEl?.textContent?.trim() || 'Profile';
            
            accountSection.body.appendChild(buildProfileCard({
                href: profileBtn.href || '/profile',
                avatar: (currentAvatar === '?' || !currentAvatar) ? '❓' : currentAvatar,
                name: (currentName === 'Profile' || currentName === 'Loading...') ? 'My Profile' : currentName,
                role: roleBadge?.textContent?.trim() || ''
            }));
        }

        const translateHost = navRight.querySelector('#google_translate_element');
        if (translateHost) {
            const placeholder = document.createElement('div');
            placeholder.className = 'google-translate-placeholder';
            accountSection.body.appendChild(buildWidgetWrap('Language', placeholder));
        }

        const logoutBtn = navRight.querySelector(isProfileNav ? '.nav-logout, #logoutBtn' : '.logout-btn, #logoutBtn');
        if (logoutBtn) {
            accountSection.body.appendChild(buildActionButton({
                className: 'panel-logout',
                icon: '🚪',
                label: 'Logout',
                onClick: () => logoutBtn.click()
            }));
        }

        if (accountSection.body.childElementCount > 0) {
            container.appendChild(accountSection.root);
        }
    }
}

function buildLandingPanelItems(nav, container) {
    const navRight = nav.querySelector('.nav-right');
    if (!navRight) return;
    const useMobilePanel = window.innerWidth <= 768;

    const exploreSection = createPanelSection('Explore');
    navRight.querySelectorAll('a.nav-link').forEach((link) => {
        exploreSection.body.appendChild(buildPanelLink(link));
    });
    if (exploreSection.body.childElementCount > 0) {
        container.appendChild(exploreSection.root);
    }

    const translateHost = navRight.querySelector('#google_translate_element');
    if (translateHost) {
        const languageSection = createPanelSection('Language');
        const placeholder = document.createElement('div');
        placeholder.className = 'google-translate-placeholder';
        languageSection.body.appendChild(placeholder);
        container.appendChild(languageSection.root);
    }
}

function createPanelSection(title) {
    const root = document.createElement('section');
    root.className = 'nav-panel-section';

    if (title) {
        const titleEl = document.createElement('div');
        titleEl.className = 'nav-panel-section-title';
        titleEl.textContent = title;
        root.appendChild(titleEl);
    }

    const body = document.createElement('div');
    body.className = 'nav-panel-section-body';
    root.appendChild(body);

    return { root, body };
}

function buildPanelLink(link) {
    const item = document.createElement('a');
    item.href = link.href;
    item.className = 'nav-panel-link';

    const label = extractNavLabel(link);
    const icon = extractNavIcon(link, label);
    const badgeText = extractBadgeText(link);

    item.innerHTML = `
        <span class="panel-icon" aria-hidden="true">${icon}</span>
        <span class="panel-label">${label}</span>
        ${badgeText ? `<span class="panel-badge">${badgeText}</span>` : ''}
    `;

    return item;
}

function buildProfileCard({ href, avatar, name, role }) {
    const profileSection = document.createElement('a');
    profileSection.href = href;
    profileSection.className = 'nav-panel-profile nav-panel-link';
    profileSection.innerHTML = `
        <span class="panel-avatar">${avatar}</span>
        <span class="panel-profile-info">
            <span class="panel-profile-name">${name}</span>
            ${role ? `<span class="panel-profile-role">${role}</span>` : ''}
        </span>
    `;
    return profileSection;
}

function buildWidgetWrap(title, widget) {
    const wrap = document.createElement('div');
    wrap.className = 'nav-panel-lang';
    if (title) {
        const titleEl = document.createElement('div');
        titleEl.className = 'nav-panel-section-title';
        titleEl.textContent = title;
        wrap.appendChild(titleEl);
    }
    wrap.appendChild(widget);
    return wrap;
}

function buildActionButton({ className, icon, label, onClick }) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.innerHTML = `
        <span class="panel-icon" aria-hidden="true">${icon}</span>
        <span class="panel-label">${label}</span>
    `;
    button.addEventListener('click', onClick);
    return button;
}

function extractNavLabel(link) {
    const labelSpan = link.querySelector('span:not(.unread-badge-nav)');
    if (labelSpan) return labelSpan.textContent.trim();
    return link.textContent.replace(/\s+/g, ' ').trim();
}

function extractNavIcon(link, label) {
    const hasExplicitLabel = Boolean(link.querySelector('span:not(.unread-badge-nav)'));
    if (hasExplicitLabel) {
        const prefixNode = Array.from(link.childNodes).find((node) => {
            return node.nodeType === Node.TEXT_NODE && node.textContent.trim();
        });
        const prefix = prefixNode?.textContent.trim();
        if (prefix && prefix.length <= 4) return prefix;
    }

    const normalized = label.toLowerCase();
    if (normalized.includes('message')) return '💬';
    if (normalized.includes('scheme') || normalized.includes('gov')) return '🏛️';
    if (normalized.includes('help')) return '❓';
    if (normalized.includes('dashboard') || normalized.includes('home')) return '🏠';
    if (normalized.includes('profile')) return '👤';
    if (normalized.includes('login') || normalized.includes('signin')) return '🔐';
    return '•';
}

function extractBadgeText(link) {
    const badge = link.querySelector('.unread-badge-nav');
    if (!badge) return '';

    const text = badge.textContent.trim();
    if (!text || text === '0') return '';
    return text;
}

function collectLinks(scope, selector) {
    if (!scope) return [];
    return Array.from(scope.querySelectorAll(selector));
}

/* ── Keep panel profile in sync with main nav ───────────── */
// dashboard.js / Profile.js set #navAvatar, #navName, #displayName after API calls.
const avatarObserver = new MutationObserver(() => {
    // Check all possible source elements (Dashboard vs Profile Page)
    const srcAvatar = document.getElementById('navAvatar') || document.getElementById('avatarInitial');
    const srcName = document.getElementById('navName') || document.getElementById('displayName');
    
    const panelAvatar = document.querySelector('.panel-avatar');
    const panelName = document.querySelector('.panel-profile-name');

    if (srcAvatar && panelAvatar) {
        const val = srcAvatar.textContent.trim();
        if (val && val !== '?' && val !== 'Loading...') panelAvatar.textContent = val;
    }
    if (srcName && panelName) {
        const val = srcName.textContent.trim();
        if (val && val !== 'Profile' && val !== 'Loading...') panelName.textContent = val;
    }
});

document.addEventListener('DOMContentLoaded', () => {
    // Observe both Dashboard and Profile page elements
    ['navAvatar', 'navName', 'avatarInitial', 'displayName'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            avatarObserver.observe(el, { childList: true, characterData: true, subtree: true });
        }
    });
});
