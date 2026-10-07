"""Content coverage and link invariants for the generated documentation."""

import json
import unittest
from pathlib import Path
from urllib.parse import unquote, urlsplit

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]


class DocumentationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.manifest = json.loads((ROOT / "data/docs-manifest.json").read_text())
        cls.source = json.loads((ROOT / "content/framework/manifest.json").read_text())
        cls.search = json.loads((ROOT / "data/search-index.json").read_text())["pages"]
        cls.html = {
            p: BeautifulSoup(p.read_text(), "html.parser") for p in ROOT.rglob("*.html") if "templates" not in p.relative_to(ROOT).parts and not p.is_relative_to(ROOT / "examples/guessing-game")
        }

    def test_all_synced_markdown_has_a_published_page(self):
        for entry in self.source["pages"]:
            with self.subTest(source=entry["source"]):
                self.assertTrue(
                    (ROOT / "content/framework" / entry["source"]).is_file()
                )
                self.assertTrue((ROOT / entry["url"]).is_file())
                self.assertEqual(
                    len(self.html[ROOT / entry["url"]].select(".doc-content h1")), 1
                )

    def test_search_covers_every_document_and_navigation_link(self):
        expected = {"/" + e["url"] for e in self.manifest["pages"]}
        self.assertEqual({e["url"] for e in self.search}, expected)
        nav = self.html[ROOT / "components/sidebar.html"]
        self.assertTrue(expected.issubset({a["href"] for a in nav.select("a[href]")}))
        self.assertEqual(len(expected), len(self.manifest["pages"]))

    def test_core_concepts_are_discoverable_without_removing_old_urls(self):
        core = {e.get("source") for e in self.source["pages"] if e["section"] == "Core concepts"}
        for name in ("routing", "requests", "responses", "middleware", "validation",
                     "authentication", "authorization", "databases", "Modules",
                     "jinax", "websockets", "tasks", "testing"):
            self.assertIn(f"docs/guides/{name}.md", core)
        self.assertIn("docs/architecture.md", core)
        self.assertIn("docs/configuration.md", core)

    def test_examples_keep_fullstack_and_backend_paths(self):
        page = self.html[ROOT / "examples.html"]
        text = page.get_text(" ", strip=True)
        for label in ("Teloce", "Jinax", "Backend-only", "Browser demos"):
            self.assertIn(label, text)
        links = {a["href"] for a in page.select("a[href]")}
        for url in ("docs/examples/basic-api.html", "docs/examples/react-backend.html",
                    "docs/examples/android-backend.html", "docs/examples/websocket-chat.html",
                    "docs/examples/jinax-website.html", "docs/examples/large-application.html",
                    "docs/guides/backend-only.html", "docs/projects/teloce-taskboard/index.html"):
            self.assertIn(url, links)

    def test_fullstack_course_has_all_ten_lessons(self):
        paths = [
            e["url"]
            for e in self.manifest["pages"]
            if e["section"] == "Full-stack course"
        ]
        self.assertEqual(len(paths), 14)
        self.assertIn("docs/fullstack/11-guessing-game.html", paths)
        for number in range(1, 11):
            self.assertTrue(any(f"/fullstack/{number:02d}-" in p for p in paths))

    def test_local_links_assets_and_fragment_targets_exist(self):
        for file, soup in self.html.items():
            for node in soup.select("[href], [src]"):
                attr = "href" if node.has_attr("href") else "src"
                value = node[attr]
                url = urlsplit(value)
                if url.scheme or url.netloc:
                    continue
                if not url.path and (
                    not url.fragment or file.parent.name in ("components", "partials")
                ):
                    continue
                target = (
                    (
                        ROOT / url.path.lstrip("/")
                        if url.path.startswith("/")
                        else file.parent / unquote(url.path)
                    ).resolve()
                    if url.path
                    else file
                )
                if target.is_dir():
                    target = target / "index.html"
                with self.subTest(file=file.relative_to(ROOT), link=value):
                    self.assertTrue(target.exists())
                    if url.fragment and target.suffix == ".html":
                        self.assertIn(
                            unquote(url.fragment),
                            {n["id"] for n in self.html[target].select("[id]")},
                        )

    def test_all_docs_have_the_same_layout_and_accessible_controls(self):
        for entry in self.manifest["pages"]:
            soup = self.html[ROOT / entry["url"]]
            with self.subTest(page=entry["url"]):
                self.assertIsNotNone(soup.select_one(".docs-layout #docs-sidebar"))
                self.assertIsNotNone(soup.select_one("main#doc-main"))
                self.assertIsNotNone(soup.select_one(".skip-link"))
                self.assertTrue(
                    any(
                        "dark-mode.js" in s.get("src", "")
                        for s in soup.select("script")
                    )
                )
                self.assertFalse(
                    any("alpinejs" in s.get("src", "") for s in soup.select("script"))
                )

    def test_api_directives_are_rendered_from_real_source(self):
        self.assertTrue(self.source["api_symbols"])
        for name, fragment in self.source["api_symbols"].items():
            with self.subTest(symbol=name):
                self.assertNotIn("not exported", fragment)
                self.assertIn("View implementation", fragment)


if __name__ == "__main__":
    unittest.main()
