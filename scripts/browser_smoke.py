"""Run the production-site browser contract against a running server.

Usage: python scripts/browser_smoke.py
Set `FLAXON_BROWSER_BASE_URL` and Admin credentials for another environment.
"""

from __future__ import annotations

import os
import time
from playwright.sync_api import sync_playwright


BASE_URL = os.getenv("FLAXON_BROWSER_BASE_URL", "http://127.0.0.1:8020").rstrip("/")
USERNAME = os.getenv("FLAXON_ADMIN_USERNAME", "aldane")
PASSWORD = os.getenv("FLAXON_ADMIN_PASSWORD", "ChangeThis123!")


def main() -> None:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1280, "height": 800})
        health = page.request.get(BASE_URL + "/api/health")
        assert health.status == 200 and health.json()["checks"]["database"] is True
        assert page.request.get(BASE_URL + "/robots.txt").status == 200
        assert page.request.get(BASE_URL + "/sitemap.xml").status == 200
        missing = page.request.get(BASE_URL + "/does-not-exist")
        assert missing.status == 404
        protected = page.request.get(BASE_URL + "/admin/labs/projects")
        assert protected.status == 401
        for path in ("/", "/about", "/projects", "/blog", "/docs", "/changelog", "/releases", "/community", "/contact", "/search", "/admin/login"):
            response = page.goto(BASE_URL + path, wait_until="domcontentloaded")
            assert response is not None and response.status == 200, f"{path}: {response.status if response else 'no response'}"
        page.goto(BASE_URL + "/projects", wait_until="domcontentloaded")
        for href in page.locator('a[href^="/projects/"]').evaluate_all("links => links.map(link => link.getAttribute('href'))"):
            response = page.goto(BASE_URL + href, wait_until="domcontentloaded")
            assert response is not None and response.status == 200, f"{href}: {response.status if response else 'no response'}"
        page.goto(BASE_URL + "/community", wait_until="domcontentloaded")
        smoke_email = f"browser-smoke-{int(time.time())}@example.com"
        page.locator('input[name="email"]').fill(smoke_email)
        page.locator('form[action="/community/subscribe"] button').click()
        assert "Subscribed" in page.title()
        page.goto(BASE_URL + "/contact", wait_until="domcontentloaded")
        page.locator('input[name="name"]').fill("Browser Smoke")
        page.locator('input[name="email"]').fill(smoke_email)
        page.locator('input[name="subject"]').fill("Browser check")
        page.locator('textarea[name="message"]').fill("Automated workflow verification.")
        page.locator("form.form button").click()
        assert "Message sent" in page.text_content("body")
        page.goto(BASE_URL + "/admin/login", wait_until="domcontentloaded")
        assert page.locator('input[name="_csrf"]').count() == 1
        page.locator('input[name="username"]').fill(USERNAME)
        page.locator('input[name="password"]').fill(PASSWORD)
        page.locator("button.login-submit").click()
        page.wait_for_load_state("domcontentloaded")
        assert page.url.rstrip("/").endswith("/admin")
        assert page.locator("text=CMS").count() > 0
        page.goto(BASE_URL + "/admin/labs/settings", wait_until="domcontentloaded")
        page.locator('input[name="site_title"]').fill("Flaxon Labs")
        page.locator('form button[type="submit"]').click()
        page.wait_for_load_state("domcontentloaded")
        assert page.locator('input[name="site_title"]').input_value() == "Flaxon Labs"
        for path, heading in (("/admin/labs/projects", "Projects operations"), ("/admin/labs/documentation", "Documentation operations"), ("/admin/labs/releases", "Release operations"), ("/admin/labs/community", "Community operations")):
            page.goto(BASE_URL + path, wait_until="domcontentloaded")
            assert page.locator(f"text={heading}").count() == 1
        page.goto(BASE_URL + "/admin/cms/", wait_until="domcontentloaded")
        assert "Content" in page.title() or "CMS" in page.title()
        page.get_by_text("Projects", exact=True).first.click()
        page.get_by_role("button", name="Add Project").click()
        smoke_title = f"Browser smoke {int(time.time())}"
        form_inputs = page.locator("form input")
        form_inputs.nth(0).fill(smoke_title)
        form_inputs.nth(1).fill("Created by the browser contract")
        page.locator("form textarea").first.fill("<p>Browser contract content.</p>")
        page.get_by_role("button", name="Save").click()
        page.get_by_text(smoke_title, exact=True).wait_for(state="visible", timeout=10000)
        page.get_by_text(smoke_title, exact=True).first.click()
        page.locator("form input").nth(1).fill("Updated by the browser contract")
        page.get_by_role("button", name="Save").click()
        page.get_by_text(smoke_title, exact=True).wait_for(state="visible", timeout=10000)
        mobile = browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=1)
        for path in ("/", "/projects", "/community", "/admin/login"):
            response = mobile.goto(BASE_URL + path, wait_until="domcontentloaded")
            assert response is not None and response.status == 200, f"mobile {path}: {response.status if response else 'no response'}"
            mobile.wait_for_timeout(150)
            assert mobile.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"), f"mobile horizontal overflow: {path}"
        mobile.close()
        browser.close()
    print(f"Browser smoke passed: {BASE_URL}")


if __name__ == "__main__":
    main()
