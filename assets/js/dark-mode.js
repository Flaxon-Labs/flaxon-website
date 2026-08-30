// assets/js/dark-mode.js
/**
 * Flaxon Website - Dark Mode
 * Manages dark/light theme toggle with localStorage persistence
 */

(function() {
    'use strict';

    // ============================================================
    // Configuration
    // ============================================================
    const STORAGE_KEY = 'flaxon-dark-mode';
    const CLASS_NAME = 'dark';
    const TOGGLE_SELECTOR = '#dark-mode-toggle, .dark-mode-toggle';

    // ============================================================
    // Core Functions
    // ============================================================
    function getPreferredTheme() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored !== null) {
            return stored === 'true';
        }
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    function setTheme(isDark) {
        if (isDark) {
            document.documentElement.classList.add(CLASS_NAME);
        } else {
            document.documentElement.classList.remove(CLASS_NAME);
        }
        localStorage.setItem(STORAGE_KEY, String(isDark));
        updateToggleButton(isDark);
        updateMetaThemeColor(isDark);
        return isDark;
    }

    function toggleTheme() {
        const isDark = document.documentElement.classList.contains(CLASS_NAME);
        return setTheme(!isDark);
    }

    function getCurrentTheme() {
        return document.documentElement.classList.contains(CLASS_NAME);
    }

    // ============================================================
    // UI Updates
    // ============================================================
    function updateToggleButton(isDark) {
        const toggles = document.querySelectorAll(TOGGLE_SELECTOR);
        toggles.forEach(function(toggle) {
            const icon = toggle.querySelector('i');
            const text = toggle.querySelector('.toggle-text');
            if (icon) {
                icon.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
            }
            if (text) {
                text.textContent = isDark ? 'Light' : 'Dark';
            }
            toggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
        });
    }

    function updateMetaThemeColor(isDark) {
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) {
            meta.content = isDark ? '#0f172a' : '#ffffff';
        }
    }

    // ============================================================
    // Initialize
    // ============================================================
    // NOTE: header.html and footer.html are fetched independently and
    // injected asynchronously, so this file can start running before
    // the toggle button (which lives in header.html) exists yet, and
    // DOMContentLoaded has already fired by the time we get here.
    // So instead of a one-shot DOMContentLoaded listener, retry until
    // the button actually shows up.
    let systemThemeListenerAttached = false;

    function init(attemptsLeft) {
        // Set initial theme (safe to call repeatedly)
        const initialTheme = getPreferredTheme();
        setTheme(initialTheme);

        const toggles = document.querySelectorAll(TOGGLE_SELECTOR);

        if (toggles.length === 0) {
            if (attemptsLeft > 0) {
                setTimeout(function() { init(attemptsLeft - 1); }, 100);
            }
            return;
        }

        // Attach toggle events (guard against double-binding on retry)
        toggles.forEach(function(toggle) {
            if (toggle.dataset.darkModeBound === 'true') return;
            toggle.dataset.darkModeBound = 'true';
            toggle.addEventListener('click', function(e) {
                e.preventDefault();
                const newTheme = toggleTheme();
                // Dispatch event for other components
                document.dispatchEvent(new CustomEvent('themechange', {
                    detail: { dark: newTheme }
                }));
            });
        });

        // Listen for system theme changes (only once)
        if (!systemThemeListenerAttached) {
            systemThemeListenerAttached = true;
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(e) {
                if (localStorage.getItem(STORAGE_KEY) === null) {
                    setTheme(e.matches);
                }
            });
        }

        // Log current state
        console.log('Dark mode initialized:', getCurrentTheme() ? 'dark' : 'light');
    }

    // Try for up to ~5 seconds (50 x 100ms) in case header.html is slow to load
    init(50);

    // ============================================================
    // Expose API
    // ============================================================
    window.flaxonDarkMode = {
        getCurrent: getCurrentTheme,
        set: setTheme,
        toggle: toggleTheme,
        getPreferred: getPreferredTheme,
    };

    console.log('Flaxon dark mode initialized! 🌓');

})();