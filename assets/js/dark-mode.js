/** Persistent user theme; shared controls can arrive at any time. */
(function () {
    'use strict';
    if (window.flaxonDarkMode) return;
    const key = 'flaxon-dark-mode';
    const preference = window.matchMedia('(prefers-color-scheme: dark)');
    const selector = '#dark-mode-toggle, .dark-mode-toggle';
    function storedTheme() {
        try { return localStorage.getItem(key); } catch (_) { return null; }
    }
    function preferredTheme() {
        const value = storedTheme();
        return value === null ? preference.matches : value === 'true';
    }
    function updateButtons() {
        const dark = document.documentElement.classList.contains('dark');
        document.querySelectorAll(selector).forEach(function (button) {
            button.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
            button.setAttribute('aria-pressed', String(dark));
            const text = button.querySelector('.toggle-text');
            if (text) text.textContent = dark ? 'Light' : 'Dark';
            const icon = button.querySelector('i');
            if (icon) icon.className = dark ? 'fas fa-sun' : 'fas fa-moon';
            const svg = button.querySelector('.theme-icon');
            if (svg) svg.innerHTML = dark
                ? '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/>'
                : '<path d="M21 12.7A9 9 0 0 1 11.3 3a9 9 0 1 0 9.7 9.7Z"/>';
        });
    }
    function setTheme(dark, persist = true) {
        document.documentElement.classList.toggle('dark', dark);
        document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
        if (persist) {
            try { localStorage.setItem(key, String(dark)); } catch (_) { /* Private storage may be disabled. */ }
        }
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.content = dark ? '#0f172a' : '#ffffff';
        updateButtons();
        document.dispatchEvent(new CustomEvent('themechange', {detail: {dark}}));
        return dark;
    }
    function toggleTheme() { return setTheme(!document.documentElement.classList.contains('dark')); }
    // Delegation removes races with asynchronously fetched headers.
    document.addEventListener('click', function (event) {
        if (event.target.closest(selector)) { event.preventDefault(); toggleTheme(); }
    });
    document.addEventListener('DOMContentLoaded', updateButtons);
    document.addEventListener('flaxon:header-ready', updateButtons);
    preference.addEventListener('change', function (event) {
        if (storedTheme() === null) setTheme(event.matches, false);
    });
    window.addEventListener('storage', function (event) {
        if (event.key === key) setTheme(preferredTheme(), false);
    });
    setTheme(preferredTheme(), false);
    window.flaxonDarkMode = {
        getCurrent: () => document.documentElement.classList.contains('dark'),
        set: setTheme, toggle: toggleTheme, getPreferred: preferredTheme
    };
}());
