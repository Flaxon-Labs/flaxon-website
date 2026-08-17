/** A small, browser-only Flaxon route playground. */
(function () {
    "use strict";

    function setOutput(element, message, isError) {
        element.textContent = message;
        element.classList.toggle("playground-error", Boolean(isError));
    }

    function parseRoutes(code) {
        if (!/\bapp\s*=\s*Flaxon\s*\(/.test(code)) {
            throw new Error('Create an application with app = Flaxon("my-app").');
        }

        const appName = (code.match(/\bapp\s*=\s*Flaxon\s*\(\s*["']([^"']+)["']/) || [])[1] || "app";
        const routes = [];
        const decorator = /^\s*@app\.(get|post|put|patch|delete)\(\s*(["'])(.*?)\2\s*\)\s*\r?\n\s*(?:async\s+)?def\s+([A-Za-z_]\w*)/gm;
        const genericRoute = /^\s*@app\.route\(\s*(["'])(.*?)\1\s*,\s*methods\s*=\s*\{([^}]+)\}\s*\)\s*\r?\n\s*(?:async\s+)?def\s+([A-Za-z_]\w*)/gm;
        let match;

        while ((match = decorator.exec(code)) !== null) {
            routes.push({ path: match[3], methods: [match[1].toUpperCase()], name: match[4] });
        }
        while ((match = genericRoute.exec(code)) !== null) {
            const methods = Array.from(match[3].matchAll(/["']([A-Za-z]+)["']/g), item => item[1].toUpperCase());
            routes.push({ path: match[2], methods: methods.length ? methods : ["GET"], name: match[4] });
        }
        if (!routes.length) {
            throw new Error("No Flaxon route decorators were found. Try @app.get(\"/\") above a function.");
        }
        return { application: appName, routes: routes };
    }

    function initialize() {
        const editor = document.getElementById("playground-editor");
        const runButton = document.getElementById("playground-run");
        const resetButton = document.getElementById("playground-reset");
        const output = document.getElementById("playground-output");
        const routeCount = document.getElementById("playground-route-count");
        const status = document.getElementById("playground-status");
        if (!editor || !runButton || !resetButton || !output) return;

        const starter = editor.value;
        runButton.addEventListener("click", () => {
            try {
                const routeMap = parseRoutes(editor.value);
                setOutput(output, JSON.stringify(routeMap, null, 2), false);
                if (routeCount) routeCount.textContent = `${routeMap.routes.length} route${routeMap.routes.length === 1 ? "" : "s"}`;
                if (status) status.innerHTML = '<i class="fas fa-check-circle mr-1 text-emerald-500"></i>Route map updated';
            } catch (error) {
                setOutput(output, `Error: ${error.message || error}`, true);
                if (routeCount) routeCount.textContent = "Needs attention";
                if (status) status.innerHTML = '<i class="fas fa-triangle-exclamation mr-1 text-rose-500"></i>Check the route syntax';
            }
        });
        resetButton.addEventListener("click", () => {
            editor.value = starter;
            setOutput(output, "Click “Inspect routes” to build a route map.", false);
            if (routeCount) routeCount.textContent = "Waiting";
            if (status) status.innerHTML = '<i class="fas fa-pen-nib mr-1"></i>Ready to inspect routes';
        });
    }

    document.addEventListener("DOMContentLoaded", initialize, { once: true });
}());
