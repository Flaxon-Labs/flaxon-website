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
        return JSON.stringify({ application: appName, routes: routes }, null, 2);
    }

    function initialize() {
        const editor = document.getElementById("playground-editor");
        const runButton = document.getElementById("playground-run");
        const resetButton = document.getElementById("playground-reset");
        const output = document.getElementById("playground-output");
        if (!editor || !runButton || !resetButton || !output) return;

        const starter = editor.value;
        runButton.addEventListener("click", () => {
            try {
                setOutput(output, parseRoutes(editor.value), false);
            } catch (error) {
                setOutput(output, `Error: ${error.message || error}`, true);
            }
        });
        resetButton.addEventListener("click", () => {
            editor.value = starter;
            setOutput(output, "Run the example to inspect its registered routes.", false);
        });
    }

    document.addEventListener("DOMContentLoaded", initialize, { once: true });
}());
