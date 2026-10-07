"""Run the published routing files and zero-import signal example verbatim."""
from pathlib import Path
import re
import socket
import sys
import tempfile
import threading
import time
import uvicorn
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


def main():
    lesson = (ROOT / "content/tutorials/html-spa-routing.md").read_text()
    signal_lesson = (ROOT / "content/tutorials/teloce-flaxon-apis.md").read_text()
    counter = next(code for code in re.findall(r"```html\n(.*?)```", signal_lesson, re.S) if "const sharedCount = signal" in code)
    with tempfile.TemporaryDirectory() as directory:
        project = Path(directory)
        for filename, code in re.findall(r"## \d+\. (app\.py|ui/[^\n]+\.html)\n\n```(?:python|html)\n(.*?)```", lesson, re.S):
            file = project / filename
            file.parent.mkdir(parents=True, exist_ok=True)
            file.write_text(code)
        home = project / "ui/pages/Home.html"
        home.write_text(home.read_text().replace("</section>", "<Counter /></section>") + '\n<script>import Counter from "../components/Counter.html"; export default { components: { Counter } };</script>')
        (project / "ui/components").mkdir()
        (project / "ui/components/Counter.html").write_text(counter)
        sys.path.insert(0, directory)
        import app
        sock = socket.socket()
        sock.bind(("127.0.0.1", 0))
        port = sock.getsockname()[1]
        server = uvicorn.Server(uvicorn.Config(app.app, log_level="error"))
        thread = threading.Thread(target=lambda: server.run(sockets=[sock]), daemon=True)
        thread.start()
        for _ in range(100):
            if server.started:
                break
            time.sleep(0.05)
        assert server.started
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
                for width in (1440, 390):
                    page = browser.new_page(viewport={"width": width, "height": 850})
                    errors = []
                    page.on("pageerror", lambda error: errors.append(str(error)))
                    base = f"http://127.0.0.1:{port}"
                    page.goto(base)
                    page.get_by_role("button", name="0 clicks").click()
                    page.get_by_role("button", name="1 clicks").wait_for()
                    page.evaluate("window.navigationCheck = 42")
                    page.locator('nav a[href="/about"]').click()
                    page.get_by_role("heading", name="About", exact=True).wait_for()
                    assert page.evaluate("window.navigationCheck") == 42
                    page.locator('nav a[href="/users/2"]').click()
                    page.get_by_text("Jordan (user 2)", exact=True).wait_for()
                    page.reload()
                    page.get_by_text("Jordan (user 2)", exact=True).wait_for()
                    page.locator('nav a[href="/users/1"]').click()
                    page.get_by_text("Avery (user 1)", exact=True).wait_for()
                    page.go_back()
                    page.get_by_text("Jordan (user 2)", exact=True).wait_for()
                    page.goto(base + "/users/99")
                    page.get_by_text("User not found.", exact=True).wait_for()
                    assert page.request.get(base + "/api/missing").status == 404
                    assert not errors, errors
                    page.close()
                browser.close()
        finally:
            server.should_exit = True
            thread.join(timeout=5)
            sock.close()
    print("Published routing project and zero-import signals passed desktop/mobile browser checks.")


if __name__ == "__main__":
    main()
