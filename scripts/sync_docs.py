#!/usr/bin/env python3
"""Sync a framework checkout once, then rebuild the static docs offline.

Usage: python scripts/sync_docs.py --source ../flaxon
       python scripts/sync_docs.py
"""

from __future__ import annotations

import argparse
import ast
import html
import json
import posixpath
import re
import shutil
import subprocess
import zipfile
from pathlib import Path
from urllib.parse import quote, unquote, urlsplit

from build_game_guide import build_game_guide

import markdown
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content/framework"
REPO = "https://github.com/Flaxon-Labs/flaxon"
ALIASES = {
    "docs/index.md": "docs/getting-started/index.html",
    "docs/installation.md": "docs/getting-started/installation.html",
    "docs/quickstart.md": "docs/getting-started/quickstart.html",
    "docs/getting-started.md": "docs/getting-started/project-setup.html",
    "docs/mail.md": "docs/guides/mail.html",
    "docs/ecosystem.md": "docs/guides/ecosystem.html",
    "docs/guides/mobile-developement.md": "docs/guides/mobile-backends.html",
    "docs/examples/android-Development.md": "docs/examples/android-backend.html",
    "README.md": "docs/reference/framework-overview.html",
    "CHANGELOG.md": "docs/changelog.html",
    "CONTRIBUTING.md": "docs/reference/framework-contributing.html",
    "SECURITY.md": "docs/reference/security-policy.html",
    "SECURITY_HARDENING.md": "docs/reference/security-hardening.html",
    "benchmarks/README.md": "docs/reference/benchmarks.html",
    "ROADMAP.md": "docs/reference/roadmap.html",
    "SUPPORT.md": "docs/reference/support.html",
    "CODE_OF_CONDUCT.md": "docs/reference/code-of-conduct.html",
    "tests/expanded/README.md": "docs/reference/expanded-tests.html",
}
for name in ["routing", "requests", "responses", "middleware", "validation"]:
    ALIASES[f"docs/guides/{name}.md"] = f"docs/core-concepts/{name}.html"
GROUPS = [
    "Getting started",
    "Full-stack course",
    "Core concepts",
    "Feature guides",
    "Admin and CMS",
    "API reference",
    "Examples",
    "Runnable projects",
    "Lessons",
    "VS Code extension",
    "Operations and reference",
    "Website guides",
]


def slug(value):
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def target_path(source):
    if source in ALIASES:
        return ALIASES[source]
    path = Path(source)
    if source.startswith("docs/vs Code (Extension)/"):
        parts = ["docs", "editor", *path.parts[2:]]
    elif source.startswith("examples/"):
        parts = ["docs", "projects", *path.parts[1:]]
    else:
        parts = list(path.parts)
    stem = Path(parts[-1]).stem
    parts[-1] = (
        "index.html" if stem.lower() in ("readme", "index") else slug(stem) + ".html"
    )
    return "/".join([slug(p) for p in parts[:-1]] + [parts[-1]])


def section(source, url):
    if "/fullstack/" in url:
        return "Full-stack course"
    if source in {
        "docs/architecture.md", "docs/configuration.md",
        "docs/guides/authentication.md", "docs/guides/authorization.md",
        "docs/guides/databases.md", "docs/guides/Modules.md",
        "docs/guides/jinax.md", "docs/guides/websockets.md",
        "docs/guides/tasks.md", "docs/guides/testing.md",
    } or "/core-concepts/" in url:
        return "Core concepts"
    if "/getting-started/" in url or source == "docs/philosophy.md":
        return "Getting started"
    if "/api/" in url:
        return "API reference"
    if "/editor/" in url:
        return "VS Code extension"
    if "/lessons/" in url:
        return "Lessons"
    if "/projects/" in url:
        return "Runnable projects"
    if "/examples/" in url:
        return "Examples"
    if any(s in source.lower() for s in ["admin", "cms", "microservices"]):
        return "Admin and CMS"
    if "/guides/" in url:
        return "Feature guides"
    return "Operations and reference"


def relative(url, page):
    return posixpath.relpath(url, posixpath.dirname(page) or ".")


def resolve_symbol(checkout, symbol, visited=None):
    """Resolve Python re-exports without importing application code or drivers."""
    visited = set() if visited is None else visited
    if symbol in visited:
        return None
    visited.add(symbol)
    parts = symbol.split(".")
    for end in range(len(parts), 0, -1):
        module = ".".join(parts[:end])
        base = checkout / "src" / Path(*parts[:end])
        file = base.with_suffix(".py")
        package = False
        if not file.exists():
            file = base / "__init__.py"
            package = True
        if not file.exists():
            continue
        try:
            tree = ast.parse(file.read_text())
        except SyntaxError:
            return None
        nodes = tree.body
        remaining = parts[end:]
        if not remaining:
            return None
        node = None
        for index, name in enumerate(remaining):
            node = next(
                (
                    n
                    for n in nodes
                    if isinstance(
                        n, (ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef)
                    )
                    and n.name == name
                ),
                None,
            )
            if node is not None:
                nodes = getattr(node, "body", [])
                continue
            if index:
                return None
            for statement in nodes:
                if isinstance(statement, ast.ImportFrom):
                    alias = next(
                        (a for a in statement.names if (a.asname or a.name) == name),
                        None,
                    )
                    if not alias:
                        continue
                    if statement.level:
                        package_parts = (
                            module.split(".") if package else module.split(".")[:-1]
                        )
                        prefix = package_parts[
                            : len(package_parts) - statement.level + 1
                        ]
                        destination = ".".join(
                            prefix
                            + ([statement.module] if statement.module else [])
                            + [alias.name]
                            + remaining[1:]
                        )
                    else:
                        destination = ".".join(
                            ([statement.module] if statement.module else [])
                            + [alias.name]
                            + remaining[1:]
                        )
                    return resolve_symbol(checkout, destination, visited)
            # Admin exposes microservice types lazily via __getattr__.
            exports = next(
                (
                    n
                    for n in nodes
                    if isinstance(n, ast.Assign)
                    and any(
                        isinstance(t, ast.Name) and t.id == "_MICROSERVICE_EXPORTS"
                        for t in n.targets
                    )
                ),
                None,
            )
            if exports and name in ast.literal_eval(exports.value):
                return resolve_symbol(
                    checkout, module + ".microservices." + ".".join(remaining), visited
                )
            return None
        return file, node
    return None


def signature(node):
    if isinstance(node, ast.ClassDef):
        init = next(
            (
                n
                for n in node.body
                if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))
                and n.name == "__init__"
            ),
            None,
        )
        if init:
            return f"{node.name}({ast.unparse(init.args)})"
        return f"class {node.name}"
    returns = " -> " + ast.unparse(node.returns) if node.returns else ""
    return (
        "async " if isinstance(node, ast.AsyncFunctionDef) else ""
    ) + f"def {node.name}({ast.unparse(node.args)}){returns}"


def api_fragment(checkout, symbol, commit):
    resolved = resolve_symbol(checkout, symbol)
    source_url = f"{REPO}/tree/{commit}/src/flaxon"
    if resolved is None:
        # The source docs sometimes refer to historical names. Preserve the
        # explanation and link to source instead of inventing a live signature.
        return f'<p class="source-reference"><code>{html.escape(symbol)}</code> — <a href="{source_url}">Browse the framework source</a>. This name is not exported by the synced revision.</p>'
    file, node = resolved
    source_url = f"{REPO}/blob/{commit}/{quote(file.relative_to(checkout).as_posix())}#L{node.lineno}"
    doc = ast.get_docstring(node) or ""
    rendered = (
        markdown.markdown(doc, extensions=["fenced_code", "tables"]) if doc else ""
    )
    block = f'<div class="api-symbol"><pre><code class="language-python">{html.escape(signature(node))}</code></pre>{rendered}<p><a href="{source_url}">View implementation</a></p>'
    if isinstance(node, ast.ClassDef):
        methods = [
            n
            for n in node.body
            if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))
            and not n.name.startswith("_")
        ]
        if methods:
            block += "<details><summary>Public methods and properties</summary>"
            for method in methods:
                block += f'<h4><code>{html.escape(method.name)}</code></h4><pre><code class="language-python">{html.escape(signature(method))}</code></pre>'
                text = ast.get_docstring(method)
                if text:
                    block += markdown.markdown(
                        text, extensions=["fenced_code", "tables"]
                    )
            block += "</details>"
    return block + "</div>"


def sync(checkout):
    checkout = checkout.resolve()
    commit = subprocess.check_output(
        ["git", "-C", str(checkout), "rev-parse", "HEAD"], text=True
    ).strip()
    # Every tracked Markdown document belongs in the published inventory.
    tracked = subprocess.check_output(
        ["git", "-C", str(checkout), "ls-files", "-z", "*.md"], text=True
    ).split("\0")
    sources = [checkout / path for path in sorted(tracked) if path]
    entries = []
    symbols = {}
    outputs = set()
    for file in sources:
        path = file.relative_to(checkout).as_posix()
        text = file.read_text()
        destination = CONTENT / path
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(file, destination)
        url = target_path(path)
        if url in outputs:
            raise ValueError(f"Colliding doc URL: {url}")
        outputs.add(url)
        heading = re.search(r"^#\s+(.+)$", text, re.M)
        title = (
            heading.group(1).strip()
            if heading
            else Path(path).stem.replace("-", " ").title()
        )
        title = re.sub(r"[*`]", "", title)
        if path == "docs/guides/Teloce-Spa.md":
            title = "Teloce SPA integration"
        entries.append(
            {"source": path, "url": url, "title": title, "section": section(path, url)}
        )
        for symbol in re.findall(r"^:::\s+(\S+)\s*$", text, re.M):
            symbols[symbol] = api_fragment(checkout, symbol, commit)
    manifest = {
        "repository": REPO,
        "commit": commit,
        "pages": entries,
        "api_symbols": symbols,
    }
    (CONTENT / "manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n"
    )
    print(
        f"Synced {len(entries)} Markdown documents and {len(symbols)} API symbols from {commit[:12]}"
    )


def rewrite_links(soup, entry, mapping, manifest):
    source = entry["source"]
    commit = manifest["commit"]
    for element in soup.select("[href], [src]"):
        attr = "href" if element.has_attr("href") else "src"
        value = element.get(attr)
        parsed = urlsplit(value)
        if parsed.scheme or parsed.netloc or not parsed.path:
            continue
        path = unquote(parsed.path)
        resolved = (
            posixpath.normpath(posixpath.join(posixpath.dirname(source), path))
            if not path.startswith("/")
            else path.lstrip("/")
        )
        if resolved in mapping:
            value = relative(mapping[resolved], entry["url"])
        elif resolved + "/README.md" in mapping:
            value = relative(mapping[resolved + "/README.md"], entry["url"])
        elif resolved + "/index.md" in mapping:
            value = relative(mapping[resolved + "/index.md"], entry["url"])
        elif path.startswith("/assets/") and (ROOT / path.lstrip("/")).exists():
            value = relative(path.lstrip("/"), entry["url"])
        else:
            # Code files and downloadable project assets remain at their pinned source.
            value = f"{manifest['repository']}/{'raw' if attr == 'src' else 'blob'}/{commit}/{quote(resolved)}"
        if parsed.query:
            value += "?" + parsed.query
        if parsed.fragment:
            value += "#" + parsed.fragment
        element[attr] = value


def page_shell(entry, body, manifest=None):
    page = entry["url"]
    title = html.escape(entry["title"])
    r = lambda p: relative(p, page)
    parsed = BeautifulSoup(body, "html.parser")
    ids = {n["id"] for n in parsed.select("[id]")}
    for heading in parsed.select("h1,h2,h3,h4"):
        if not heading.get("id"):
            base = slug(heading.get_text(" ", strip=True)) or "section"
            identity = base
            suffix = 2
            while identity in ids:
                identity = f"{base}-{suffix}"
                suffix += 1
            heading["id"] = identity
            ids.add(identity)
    for element in parsed.select("[href], [src]"):
        attr = "href" if element.has_attr("href") else "src"
        value = element[attr]
        if value.startswith("/") and not value.startswith("//"):
            url = urlsplit(value)
            target = url.path.lstrip("/") or "index.html"
            element[attr] = (
                relative(target, page)
                + ("?" + url.query if url.query else "")
                + ("#" + url.fragment if url.fragment else "")
            )
    body = str(parsed)
    source_note = ""
    if manifest:
        path = entry["source"]
        source_url = f"{manifest['repository']}/blob/{manifest['commit']}/{quote(path)}"
        source_note = f'<p class="doc-source"><a href="{source_url}">Framework source</a> · <a href="{r("content/framework/" + path)}" download>Markdown</a></p>'
    output = f'''<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="{title} — Flaxon, the Python full-stack framework with Teloce, Jinax, Admin and CMS.">
<meta name="theme-color" content="#ffffff"><title>{title} — Flaxon Docs</title>
<link rel="icon" href="{r("assets/images/logo/flaxon.png")}">
<link rel="stylesheet" href="{r("assets/css/style.css")}"><link rel="stylesheet" href="{r("assets/css/docs.css")}">
<script src="{r("assets/js/dark-mode.js")}"></script>
<script defer src="{r("assets/js/site-shell.js")}"></script>
<script defer src="{r("assets/js/docs.js")}"></script>
</head><body class="docs-page">
<a class="skip-link" href="#doc-main">Skip to content</a><div id="header"></div>
<div class="docs-layout"><div id="docs-sidebar"></div><main id="doc-main" tabindex="-1">
<nav class="doc-breadcrumb" aria-label="Breadcrumb"><a href="{r("docs.html")}">Documentation</a><span aria-hidden="true"> / </span><span>{title}</span></nav>
<article class="doc-content">{source_note}{body}</article>
</main></div><div id="footer"></div></body></html>\n'''
    return re.sub(r"(?m)^[ \t]+$", "", output)


def build():
    manifest = json.loads((CONTENT / "manifest.json").read_text())
    pages = manifest["pages"]
    mapping = {e["source"]: e["url"] for e in pages}
    imported = {e["url"] for e in pages}
    build_game_guide(ROOT)
    tutorial_url = "docs/fullstack/11-guessing-game.html"
    tutorial_text = (ROOT / "content/tutorials/guessing-game.md").read_text()
    tutorial_body = markdown.markdown(tutorial_text, extensions=["tables", "fenced_code", "toc"])
    preserved = [{"url": tutorial_url, "title": "Full-stack capstone: a guessing-game SPA", "section": "Full-stack course", "body": tutorial_body}]
    api_lesson_url = "docs/fullstack/12-teloce-flaxon-apis.html"
    api_lesson_body = markdown.markdown((ROOT / "content/tutorials/teloce-flaxon-apis.md").read_text(), extensions=["tables", "fenced_code", "toc"])
    preserved.append({"url": api_lesson_url, "title": "Lesson 12: Using Teloce and Flaxon APIs", "section": "Full-stack course", "body": api_lesson_body})
    downloads = ROOT / "downloads"
    downloads.mkdir(exist_ok=True)
    with zipfile.ZipFile(downloads / "flaxon-guessing-game.zip", "w", zipfile.ZIP_DEFLATED) as archive:
        for source in sorted((ROOT / "examples/guessing-game").rglob("*")):
            if source.is_file() and not any(part in {"__pycache__", ".pytest_cache", "data", ".venv", ".flaxon", "backups"} for part in source.parts):
                entry = zipfile.ZipInfo(source.relative_to(ROOT / "examples/guessing-game").as_posix(), date_time=(2000, 1, 1, 0, 0, 0))
                entry.compress_type = zipfile.ZIP_DEFLATED
                entry.external_attr = 0o100644 << 16
                archive.writestr(entry, source.read_bytes())
    for file in sorted((ROOT / "docs").rglob("*.html")):
        url = file.relative_to(ROOT).as_posix()
        if url in imported or url in {tutorial_url, api_lesson_url}:
            continue
        soup = BeautifulSoup(file.read_text(), "html.parser")
        content = soup.select_one(".doc-content")
        if not content:
            continue
        for node in content.select(".doc-source, .doc-toc, .copy-btn"):
            node.decompose()
        heading = content.find("h1")
        title = (
            heading.get_text(" ", strip=True)
            if heading
            else file.stem.replace("-", " ").title()
        )
        preserved.append(
            {
                "url": url,
                "title": title,
                "section": "Website guides",
                "body": "".join(str(n) for n in content.contents),
            }
        )
    for entry in pages:
        text = (CONTENT / entry["source"]).read_text()
        text = re.sub(
            r"^:::\s+(\S+)\s*$(?:\n[ \t]+[^\n]*)*",
            lambda m: manifest["api_symbols"][m.group(1)],
            text,
            flags=re.M,
        )
        body = markdown.markdown(
            text,
            extensions=[
                "tables",
                "toc",
                "admonition",
                "attr_list",
                "def_list",
                "footnotes",
                "md_in_html",
                "pymdownx.superfences",
                "pymdownx.details",
                "pymdownx.tabbed",
                "pymdownx.tasklist",
            ],
            extension_configs={"pymdownx.tabbed": {"alternate_style": True}},
        )
        soup = BeautifulSoup(body, "html.parser")
        rewrite_links(soup, entry, mapping, manifest)
        # One page heading; subsequent source headings retain their original IDs.
        if not soup.find("h1"):
            heading = soup.new_tag("h1")
            heading.string = entry["title"]
            soup.insert(0, heading)
        for heading in soup.find_all("h1")[1:]:
            heading.name = "h2"
        output = ROOT / entry["url"]
        output.parent.mkdir(parents=True, exist_ok=True)
        if entry["url"].startswith("docs/fullstack/") and (entry["url"].endswith("index.html") or "/10" in entry["url"]):
            capstone = soup.new_tag("p")
            link = soup.new_tag("a", href="11-guessing-game.html")
            link.string = "Next: build the complete guessing-game SPA with Admin and Render deployment"
            capstone.append(link)
            soup.append(capstone)
            api_link = soup.new_tag("a", href="12-teloce-flaxon-apis.html")
            api_link.string = "Lesson 12: using Teloce and Flaxon APIs"
            api_paragraph = soup.new_tag("p")
            api_paragraph.append(api_link)
            soup.append(api_paragraph)
        output.write_text(page_shell(entry, str(soup), manifest))
    for entry in preserved:
        (ROOT / entry["url"]).write_text(page_shell(entry, entry["body"]))
    all_pages = pages + [{k: v for k, v in e.items() if k != "body"} for e in preserved]
    # Root entry points keep working and carry the same readable layout.
    for alias, canonical in [
        ("installation.html", "docs/getting-started/installation.html"),
        ("security.html", "docs/security.html"),
    ]:
        entry = next(e for e in pages if e["url"] == canonical)
        soup = BeautifulSoup((ROOT / canonical).read_text(), "html.parser")
        content = soup.select_one(".doc-content")
        content.select_one(".doc-source").decompose()
        for node in content.select("[href], [src]"):
            attr = "href" if node.has_attr("href") else "src"
            value = node[attr]
            if not urlsplit(value).scheme and not value.startswith("#"):
                node[attr] = posixpath.normpath(
                    posixpath.join(posixpath.dirname(canonical), value)
                )
        (ROOT / alias).write_text(
            page_shell(
                {**entry, "url": alias}, "".join(str(n) for n in content.contents)
            )
        )
    grouped = {name: [e for e in all_pages if e["section"] == name] for name in GROUPS}
    nav = '<nav id="docs-navigation" aria-label="Flaxon documentation"><label for="docs-nav-filter">Find a page</label><input id="docs-nav-filter" type="search" placeholder="Filter navigation…" autocomplete="off"><a href="/docs.html" class="docs-home">Documentation home</a>'
    catalog = '<h1>Flaxon documentation</h1><p>Build complete applications with Python and Teloce, server-rendered pages with Jinax, or combine both. Flaxon includes Admin, CMS, authentication, WebSockets, database tools, and reusable modules.</p><div class="doc-paths"><a href="docs/getting-started/project-setup.html"><strong>Create your first project</strong><span>Welcome app, management.py, migrations, and protected Admin.</span></a><a href="docs/fullstack/index.html"><strong>Learn full-stack development</strong><span>Twelve lessons including a Teloce SPA capstone, Admin, Render, and a practical API guide.</span></a><a href="docs/guides/jinax.html"><strong>Build with Jinax</strong><span>Complete server-rendered applications and reusable templates.</span></a><a href="docs/guides/admin-cms.html"><strong>Configure Admin and CMS</strong><span>Users, permissions, content, media, and operational tools.</span></a></div><p>Using a separate frontend? Start with the <a href="docs/guides/backend-only.html">backend-only quick start</a> and the <a href="examples.html">examples directory</a>.</p><h2>Complete documentation directory</h2>'
    for name, entries in grouped.items():
        if not entries:
            continue
        nav += f'<details class="docs-nav-group"><summary>{html.escape(name)}</summary><ul>'
        catalog += f"<h2>{html.escape(name)}</h2><ul>"
        for entry in entries:
            nav += (
                f'<li><a href="/{entry["url"]}">{html.escape(entry["title"])}</a></li>'
            )
            catalog += (
                f'<li><a href="{entry["url"]}">{html.escape(entry["title"])}</a></li>'
            )
        nav += "</ul></details>"
        catalog += "</ul>"
    nav += '<p id="docs-nav-empty" hidden>No matching pages.</p></nav>'
    sidebar = f'<aside class="doc-sidebar"><button id="docs-menu-toggle" class="docs-menu-toggle" type="button" aria-expanded="false" aria-controls="docs-navigation">Documentation navigation <span aria-hidden="true">▾</span></button>{nav}</aside>\n'
    (ROOT / "components/sidebar.html").write_text(sidebar)
    (ROOT / "docs.html").write_text(
        page_shell({"url": "docs.html", "title": "Documentation"}, catalog)
    )
    search = []
    for entry in all_pages:
        soup = BeautifulSoup((ROOT / entry["url"]).read_text(), "html.parser")
        article = soup.select_one(".doc-content")
        search.append(
            {
                "title": entry["title"],
                "url": "/" + entry["url"],
                "section": entry["section"],
                "content": article.get_text(" ", strip=True),
            }
        )
    (ROOT / "data/search-index.json").write_text(
        json.dumps({"pages": search}, indent=2, ensure_ascii=False) + "\n"
    )
    (ROOT / "data/docs-manifest.json").write_text(
        json.dumps(
            {
                "repository": manifest["repository"],
                "commit": manifest["commit"],
                "pages": all_pages,
            },
            indent=2,
            ensure_ascii=False,
        )
        + "\n"
    )
    print(
        f"Built {len(pages)} framework pages, retained {len(preserved)} website guides, indexed {len(search)} docs pages"
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path)
    args = parser.parse_args()
    if args.source:
        sync(args.source)
    build()
