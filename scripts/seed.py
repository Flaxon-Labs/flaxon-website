from __future__ import annotations

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app import app


async def main() -> None:
    database = app.database
    admin = app.flaxon_labs_admin
    cms = app.flaxon_labs_cms
    await database.initialize()
    await admin._load_database()
    await cms._load_database()
    projects = cms.content_types["project"]
    seeds = [
        ("Flaxon", "Async-first Python backend framework", "https://github.com/Flaxon-Labs/flaxon", "https://flaxon-website.vercel.app/"),
        ("Teloce", "Reactive templates for Python web applications", "https://github.com/Flaxon-Labs", "https://flaxon-website.vercel.app/teloce"),
        ("Teloce-Py", "Python tooling and compiler infrastructure for Teloce", "https://github.com/Flaxon-Labs", "https://flaxon-website.vercel.app/teloce-py"),
        ("Tiny Reactive", "A lightweight reactive system for focused interfaces", "https://github.com/Flaxon-Labs", "https://flaxon-website.vercel.app/tiny-reactive"),
    ]
    if not projects.items:
        for title, summary, repository_url, documentation_url in seeds:
            projects.create({"title": title, "summary": summary, "body": f"<p>{summary}. Built openly by Flaxon Labs and its contributors.</p>", "repository_url": repository_url, "documentation_url": documentation_url, "status": "published"})
        await cms._save_content(projects)
    pages = cms.content_types["page"]
    if not pages.items:
        pages.create({"title": "About Flaxon Labs", "body": "<p>Flaxon Labs is an independent open-source organization focused on practical developer tools.</p><p>The organization is led by Aldane Hutchinson, Head of Flaxon Labs. Contributors are welcome to improve code, documentation, examples, and experiments.</p>", "status": "published"})
        await cms._save_content(pages)
    posts = cms.content_types["post"]
    if not posts.items:
        posts.create({"title": "Building in public", "excerpt": "Why Flaxon Labs builds its tools openly.", "body": "<p>We build frameworks and developer tools in public so users can inspect the work, report issues, and contribute improvements.</p>", "author": "Aldane Hutchinson", "status": "published"})
        await cms._save_content(posts)
    await database.close()


if __name__ == "__main__":
    asyncio.run(main())
