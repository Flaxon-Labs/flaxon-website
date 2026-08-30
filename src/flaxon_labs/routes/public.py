from __future__ import annotations

from xml.sax.saxutils import escape
from typing import Any

from flaxon.http import Request, TextResponse


def register_public_routes(app: Any, cms: Any, settings: Any, community_store: Any) -> None:
    async def content(name: str) -> list[dict[str, Any]]:
        await cms._load_database()
        return [item for item in cms.content_types[name].items.values() if item.get("status", "published") == "published"]

    @app.get("/")
    async def home(request: Request):
        projects = await content("project")
        posts = await content("post")
        return await request.render("home.html", {"title": "Flaxon Labs", "projects": projects, "posts": posts})

    @app.get("/robots.txt")
    async def robots(request: Request):
        return TextResponse(f"User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: {settings.site_url}/sitemap.xml\n", media_type="text/plain")

    @app.get("/sitemap.xml")
    async def sitemap(request: Request):
        urls = ["/", "/about", "/projects", "/blog", "/docs", "/changelog", "/releases", "/community", "/contact", "/search"]
        for type_name, prefix in (("project", "/projects/"), ("post", "/blog/"), ("page", "/docs/"), ("release", "/releases/")):
            urls.extend(prefix + str(item.get("slug")) for item in await content(type_name) if item.get("slug"))
        body = "".join(f"<url><loc>{escape(settings.site_url + url)}</loc></url>" for url in dict.fromkeys(urls))
        return TextResponse(f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{body}</urlset>', media_type="application/xml")

    @app.get("/about")
    async def about(request: Request):
        pages = await content("page")
        page = next((item for item in pages if item.get("slug") == "about"), None) or (pages[0] if pages else None)
        return await request.render("page.html", {"title": "About Flaxon Labs", "page": page or {"title": "About Flaxon Labs", "body": ""}})

    @app.get("/community")
    async def community(request: Request):
        return await request.render("community/index.html", {"title": "Community", "error": None})

    @app.post("/community/subscribe")
    async def subscribe(request: Request):
        try:
            data = await request.form()
            client = request.scope.get("client") or ("", 0)
            record = await community_store.subscribe(data.get("email", ""), ip_address=str(client[0]))
            message = "You are on the Flaxon Labs newsletter list." if not record["existing"] else "That email is already subscribed."
            return await request.render("community/success.html", {"title": "Subscribed", "message": message})
        except ValueError as exc:
            return await request.render("community/index.html", {"title": "Community", "error": str(exc)})

    @app.get("/contact")
    async def contact(request: Request):
        return await request.render("community/contact.html", {"title": "Contact Flaxon Labs", "error": None})

    @app.post("/contact")
    async def contact_submit(request: Request):
        try:
            form = await request.form()
            data = form.to_dict() if hasattr(form, "to_dict") else dict(form)
            client = request.scope.get("client") or ("", 0)
            data["ip_address"] = str(client[0])
            data["user_agent"] = request.headers.get("user-agent", "")
            await community_store.contact(data)
            return await request.render("community/success.html", {"title": "Message sent", "message": "Your message was sent to Flaxon Labs."})
        except ValueError as exc:
            return await request.render("community/contact.html", {"title": "Contact Flaxon Labs", "error": str(exc)})

    @app.get("/docs")
    async def docs(request: Request):
        pages = await content("page")
        return await request.render("docs/index.html", {"title": "Documentation", "pages": pages})

    @app.get("/docs/<slug>")
    async def docs_detail(request: Request, slug: str):
        page = next((item for item in await content("page") if item.get("slug") == slug), None)
        if page is None:
            return await request.render("404.html", {"title": "Documentation not found"})
        return await request.render("docs/detail.html", {"title": page.get("title"), "page": page})

    @app.get("/changelog")
    async def changelog(request: Request):
        return await request.render("blog/index.html", {"title": "Changelog", "posts": await content("post")})

    @app.get("/changelog/<slug>")
    async def changelog_detail(request: Request, slug: str):
        post = next((item for item in await content("post") if item.get("slug") == slug), None)
        if post is None:
            return await request.render("404.html", {"title": "Changelog entry not found"})
        return await request.render("changelog/detail.html", {"title": post.get("title"), "entry": post})

    @app.get("/releases")
    async def releases(request: Request):
        return await request.render("releases/index.html", {"title": "Releases", "releases": await content("release")})

    @app.get("/releases/<slug>")
    async def release_detail(request: Request, slug: str):
        release = next((item for item in await content("release") if item.get("slug") == slug), None)
        if release is None:
            return await request.render("404.html", {"title": "Release not found"})
        return await request.render("releases/detail.html", {"title": release.get("title") or release.get("version"), "release": release})

    @app.get("/search")
    async def search(request: Request):
        query = str(request.query.get("q", "")).strip()
        results: list[dict[str, Any]] = []
        if query:
            needle = query.casefold()
            for type_name, path in (("project", "/projects/"), ("post", "/blog/"), ("page", "/docs/")):
                for item in await content(type_name):
                    searchable = " ".join(str(item.get(key, "")) for key in ("title", "summary", "excerpt", "body", "version"))
                    if needle in searchable.casefold():
                        results.append({"title": item.get("title", "Untitled"), "summary": item.get("summary") or item.get("excerpt") or "", "url": path + str(item.get("slug", "")), "type": type_name})
        return await request.render("search.html", {"title": "Search", "query": query, "results": results})

    @app.get("/projects")
    async def projects(request: Request):
        return await request.render("projects/index.html", {"title": "Projects", "projects": await content("project")})

    @app.get("/projects/<slug>")
    async def project(request: Request, slug: str):
        item = next((item for item in await content("project") if item.get("slug") == slug), None)
        if item is None:
            return await request.render("404.html", {"title": "Project not found"})
        return await request.render("projects/detail.html", {"title": item.get("title"), "project": item})

    @app.get("/blog")
    async def blog(request: Request):
        return await request.render("blog/index.html", {"title": "Blog", "posts": await content("post")})

    @app.get("/blog/<slug>")
    async def blog_post(request: Request, slug: str):
        post = next((item for item in await content("post") if item.get("slug") == slug), None)
        if post is None:
            return await request.render("404.html", {"title": "Post not found"})
        return await request.render("blog/detail.html", {"title": post.get("title"), "post": post})
