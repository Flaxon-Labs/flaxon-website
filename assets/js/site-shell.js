/** Shared header and footer loader for the static Flaxon site. */
(function () {
    "use strict";

    async function loadComponent(id, path) {
        const target = document.getElementById(id);
        if (!target) return;

        try {
            const response = await fetch(path, { credentials: "same-origin" });
            if (!response.ok) throw new Error(`Could not load ${path}`);
            target.innerHTML = await response.text();
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
