/** A small, browser-only Flaxon route playground. */
(function () {
    "use strict";

    const PYODIDE_URL = "https://cdn.jsdelivr.net/pyodide/v0.27.0/full/pyodide.js";
    let pyodidePromise;

    function loadPyodide() {
        if (pyodidePromise) return pyodidePromise;
        pyodidePromise = new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = PYODIDE_URL;
            script.onload = async () => {
                try {
                    resolve(await window.loadPyodide());
                } catch (error) {
                    reject(error);
                }
            };
            script.onerror = () => reject(new Error("Could not load the Python runtime."));
            document.head.appendChild(script);
        });
        return pyodidePromise;
    }

    function setOutput(element, message, isError) {
        element.textContent = message;
        element.classList.toggle("playground-error", Boolean(isError));
    }

    async function run(code, output) {
        const pyodide = await loadPyodide();
        pyodide.globals.set("user_code", code);
        const runner = `
import json
import sys
import types

class Flaxon:
    def __init__(self, name, **options):
        self.name = name
        self.options = options
        self.routes = []
    def route(self, path, methods=None):
        methods = methods or {"GET"}
        def register(handler):
            self.routes.append({"path": path, "methods": sorted(methods), "name": handler.__name__})
            return handler
        return register
    def get(self, path):
        return self.route(path, {"GET"})
    def post(self, path):
        return self.route(path, {"POST"})

flaxon_module = types.ModuleType("flaxon")
flaxon_module.Flaxon = Flaxon
sys.modules["flaxon"] = flaxon_module
namespace = {"Flaxon": Flaxon}
exec(user_code, namespace)
app = namespace.get("app")
if not isinstance(app, Flaxon):
    raise RuntimeError("Create an app with app = Flaxon(\"my-app\")")
json.dumps({"application": app.name, "routes": app.routes}, indent=2)
`;
        return await pyodide.runPythonAsync(runner);
    }

    function initialize() {
        const editor = document.getElementById("playground-editor");
        const runButton = document.getElementById("playground-run");
        const resetButton = document.getElementById("playground-reset");
        const output = document.getElementById("playground-output");
        if (!editor || !runButton || !resetButton || !output) return;

        const starter = editor.value;
        runButton.addEventListener("click", async () => {
            runButton.disabled = true;
            setOutput(output, "Starting the browser Python runtime…", false);
            try {
                setOutput(output, await run(editor.value, output), false);
            } catch (error) {
                setOutput(output, `Error: ${error.message || error}`, true);
            } finally {
                runButton.disabled = false;
            }
        });
        resetButton.addEventListener("click", () => {
            editor.value = starter;
            setOutput(output, "Run the example to inspect its registered routes.", false);
        });
    }

    document.addEventListener("DOMContentLoaded", initialize, { once: true });
}());
