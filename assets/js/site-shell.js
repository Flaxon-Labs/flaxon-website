/** Shared header and footer loader for the static Flaxon site. */
(function () {
    "use strict";

    const scriptUrl = new URL(document.currentScript.src, window.location.href);
    const siteBaseUrl = new URL("../..", scriptUrl);

    function siteUrl(path) {
        return new URL(String(path).replace(/^\//, ""), siteBaseUrl).href;
    }

    // Shared components and their links must work on both a custom domain and
    // a GitHub Pages project URL such as /flaxon-website/.
    window.flaxonSiteUrl = siteUrl;

    function normalizeComponentUrls(target) {
        target.querySelectorAll("[href^='/'], [src^='/']").forEach(function (element) {
            const attribute = element.hasAttribute("href") ? "href" : "src";
            element.setAttribute(attribute, siteUrl(element.getAttribute(attribute)));
        });
    }

    async function loadComponent(id, path) {
        const target = document.getElementById(id);
        if (!target) return;

        try {
            const response = await fetch(siteUrl(path), { credentials: "same-origin" });
            if (!response.ok) throw new Error(`Could not load ${path}`);
            target.innerHTML = await response.text();
            normalizeComponentUrls(target);
        } catch (error) {
            console.error("Flaxon site shell error:", error);
            target.hidden = true;
        }
    }

    function hasLoadedScript(name) {
        return Array.from(document.scripts).some(function (script) {
            return (script.src || "").includes(name);
        });
    }

    function loadScript(path) {
        return new Promise(function (resolve, reject) {
            var script = document.createElement("script");
            script.src = siteUrl(path);
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async function ensureSharedInteractions() {
        var scripts = [];

        // Some compact documentation pages intentionally have a small head.
        // Load the shared controls there as well so search, theme, and the
        // mobile menu do not depend on which page template was copied.
        if (!hasLoadedScript("header-search.js")) {
            scripts.push(loadScript("/assets/js/header-search.js"));
        }
        if (!hasLoadedScript("main.js")) {
            scripts.push(loadScript("/assets/js/main.js"));
        }

        if (!hasLoadedScript("dark-mode.js")) {
            scripts.push(loadScript("/assets/js/dark-mode.js"));
        }

        if (scripts.length) {
            await Promise.all(scripts);
        }
    }

    function initializeMobileMenu() {
        var button = document.getElementById("mobile-menu-btn");
        var menu = document.getElementById("mobile-menu");
        if (!button || !menu || button.dataset.menuBound === "true") return;

        button.dataset.menuBound = "true";
        button.setAttribute("aria-expanded", "false");
        button.addEventListener("click", function () {
            var isOpen = !menu.classList.contains("hidden");
            menu.classList.toggle("hidden", isOpen);
            button.setAttribute("aria-expanded", String(!isOpen));
            var icon = button.querySelector("i");
            if (icon) {
                icon.classList.toggle("fa-bars", isOpen);
                icon.classList.toggle("fa-times", !isOpen);
            }
        });
    }

    async function initializeShell() {
        await Promise.all([
            loadComponent("header", "/components/header.html"),
            loadComponent("footer", "/components/footer.html"),
            loadComponent("docs-sidebar", "/components/sidebar.html"),
        ]);
        await ensureSharedInteractions();
        initializeMobileMenu();
        document.dispatchEvent(new CustomEvent("flaxon:header-ready"));
        document.dispatchEvent(new CustomEvent("flaxon:shell-ready"));
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initializeShell, { once: true });
    } else {
        initializeShell();
    }
}());
