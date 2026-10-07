"""Run real-browser layout and interaction checks without any CDN requests.

Install playwright==1.51.0 and run `python -m playwright install chromium`.
Then: python tests/browser_docs.py
"""

from __future__ import annotations

import functools
import http.server
import json
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def translate_path(self, path):
        if path.startswith("/preview/"):
            path = path.removeprefix("/preview")
        return super().translate_path(path)


def main():
    server = http.server.ThreadingHTTPServer(
        ("127.0.0.1", 0), functools.partial(Handler, directory=str(ROOT))
    )
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{server.server_port}"
    pages = json.loads((ROOT / "data/docs-manifest.json").read_text())["pages"]
    try:
        with sync_playwright() as playwright:
            browser = playwright.chromium.launch(headless=True, args=["--no-sandbox"])
            for width in [1440, 390]:
                context = browser.new_context(
                    viewport={"width": width, "height": 900}, color_scheme="light"
                )
                page = context.new_page()
                errors = []
                page.on("pageerror", lambda error: errors.append(str(error)))
                page.route(
                    "**/*",
                    lambda route: (
                        route.continue_()
                        if route.request.url.startswith(base)
                        else route.abort()
                    ),
                )
                for index, entry in enumerate(pages):
                    page.goto(base + "/" + entry["url"], wait_until="domcontentloaded")
                    page.wait_for_function(
                        "document.querySelector('#docs-sidebar .doc-sidebar')?.dataset.bound === 'true'"
                    )
                    assert page.locator("#dark-mode-toggle").is_visible(), entry["url"]
                    assert not page.evaluate(
                        "document.documentElement.scrollWidth > innerWidth"
                    ), entry["url"]
                    assert page.locator(".doc-content").evaluate(
                        "(el) => el.getBoundingClientRect().right <= innerWidth + 1"
                    ), entry["url"]
                    assert page.locator(".doc-content pre code").evaluate_all(
                        "els => els.every(el => getComputedStyle(el).backgroundColor === 'rgba(0, 0, 0, 0)')"
                    ), ("Code blocks must not inherit inline backgrounds", entry["url"])
                    assert len(page.locator('[aria-current="page"]').all()) == 1, entry[
                        "url"
                    ]
                    if width == 1440:
                        nav = page.locator("#docs-navigation").bounding_box()
                        assert (
                            nav and nav["y"] >= 60 and nav["y"] + nav["height"] <= 901
                        ), (entry["url"], nav)
                    page.evaluate("window.scrollTo(0,800)")
                    box = page.locator("#dark-mode-toggle").bounding_box()
                    assert box and 0 <= box["y"] < 80, (entry["url"], box)
                    if (
                        width == 1440
                        and page.locator(".doc-content").bounding_box()["height"] > 1800
                    ):
                        nav = page.locator("#docs-navigation").bounding_box()
                        assert (
                            nav and nav["y"] >= 60 and nav["y"] + nav["height"] <= 901
                        ), (entry["url"], nav)
                    if index % 25 == 0:
                        print(f"Layout {width}px: {index + 1}/{len(pages)}", flush=True)
                page.goto(base + "/examples.html", wait_until="domcontentloaded")
                page.wait_for_selector("#dark-mode-toggle")
                assert page.locator("#dark-mode-toggle").is_visible()
                assert not page.evaluate("document.documentElement.scrollWidth > innerWidth")
                assert page.locator(".doc-content").evaluate(
                    "(el) => el.getBoundingClientRect().right <= innerWidth + 1"
                )
                assert page.get_by_role("heading", name="Backend-only APIs and services").is_visible()
                assert not errors, errors
                context.close()
            context = browser.new_context(
                viewport={"width": 390, "height": 844},
                color_scheme="dark",
                permissions=["clipboard-read", "clipboard-write"],
            )
            page = context.new_page()
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.goto(base + "/docs/getting-started/project-setup.html")
            page.wait_for_function(
                "document.querySelector('#docs-sidebar .doc-sidebar')?.dataset.bound === 'true'"
            )
            assert page.locator("html").get_attribute("class") == "dark"
            page.locator("#dark-mode-toggle").click()
            assert not page.locator("html").evaluate(
                "el => el.classList.contains('dark')"
            )
            page.goto(base + "/docs/fullstack/04-typescript.html")
            page.wait_for_function(
                "document.querySelector('#docs-sidebar .doc-sidebar')?.dataset.bound === 'true'"
            )
            assert not page.locator("html").evaluate(
                "el => el.classList.contains('dark')"
            )
            page.locator("#docs-menu-toggle").click()
            assert (
                page.locator("#docs-menu-toggle").get_attribute("aria-expanded")
                == "true"
            )
            page.locator("#docs-nav-filter").fill("live updates")
            assert page.locator(".docs-nav-group li:visible").count() == 1
            page.locator("#docs-nav-filter").press("Escape")
            assert (
                page.locator("#docs-menu-toggle").get_attribute("aria-expanded")
                == "false"
            )
            page.locator("#mobile-menu-btn").click()
            assert page.locator("#mobile-menu").is_visible()
            page.locator("#mobile-menu-btn").click()
            assert not page.locator("#mobile-menu").is_visible()
            page.locator("#search-trigger").click()
            page.locator("#search-input").fill("management.py")
            page.locator(".search-result").first.wait_for()
            assert page.locator(".search-result").count() > 0
            page.locator("#search-input").press("Escape")
            assert not page.locator("#search-modal").is_visible()
            button = page.locator(".doc-code .copy-btn").first
            button.click()
            assert button.inner_text() == "Copied"
            expected = page.locator(".doc-code pre").first.inner_text()
            assert page.evaluate("navigator.clipboard.readText()") == expected
            page.goto(base + "/preview/docs/api/admin.html")
            page.wait_for_function(
                "document.querySelector('#docs-sidebar .doc-sidebar')?.dataset.bound === 'true'"
            )
            assert "/preview/components/" not in page.url
            assert (
                page.locator("#docs-navigation a.active")
                .get_attribute("href")
                .startswith(base + "/preview/")
            )
            page.locator("#search-trigger").click()
            page.locator("#search-input").fill("TypeScript")
            page.locator(".search-result").first.wait_for()
            assert (
                page.locator(".search-result")
                .first.get_attribute("href")
                .startswith(base + "/preview/")
            )
            assert not errors, errors
            context.close()
            context = browser.new_context(viewport={"width": 320, "height": 700})
            context.add_init_script(
                "Object.defineProperty(window, 'localStorage', {get() {throw new DOMException('Disabled', 'SecurityError');}})"
            )
            page = context.new_page()
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.goto(base + "/docs.html")
            page.locator("#dark-mode-toggle").wait_for()
            page.locator("#dark-mode-toggle").click()
            assert not page.evaluate(
                "document.documentElement.scrollWidth > innerWidth"
            )
            assert not errors, errors
            context.close()
            browser.close()
            print(
                f"Passed: {len(pages) * 2} desktop/mobile page layouts, theme persistence, sidebar filtering, menus, search, clipboard, project-prefix links, and blocked storage.",
                flush=True,
            )
    finally:
        server.shutdown()


if __name__ == "__main__":
    main()
