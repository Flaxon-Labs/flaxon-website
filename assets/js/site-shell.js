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

    async function initializeShell() {
        await Promise.all([
            loadComponent("header", "/components/header.html"),
            loadComponent("footer", "/components/footer.html"),
        ]);
        document.dispatchEvent(new CustomEvent("flaxon:header-ready"));
        document.dispatchEvent(new CustomEvent("flaxon:shell-ready"));
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initializeShell, { once: true });
    } else {
        initializeShell();
    }
}());
