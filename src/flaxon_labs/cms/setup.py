from __future__ import annotations

from typing import Any

from flaxon.admin.cms import CMS, CMSField, ContentType

from ..config import Settings


def setup_cms(app: Any, settings: Settings, database: Any, admin: Any) -> CMS:
    cms = CMS(
        app,
        url_prefix="/admin/cms",
        title="Flaxon Labs Content",
        template_path=settings.template_dir / "admin" / "cms.html",
        auth=admin.auth,
        database=database,
        redis_url=settings.redis_url,
    )
    cms.register(ContentType(
        "page", label="Page", label_plural="Pages",
        fields=[CMSField("title", required=True), CMSField("body", type="richtext"), CMSField("seo_description"), CMSField("status", type="select", choices=["draft", "review", "published", "archived"])],
        list_display=["title", "status", "updated_at"], list_filter=["status"], search_fields=["title", "body"],
    ))
    cms.register(ContentType(
        "project", label="Project", label_plural="Projects",
        fields=[CMSField("title", required=True), CMSField("summary", required=True), CMSField("body", type="richtext"), CMSField("repository_url", type="url"), CMSField("documentation_url", type="url"), CMSField("status", type="select", choices=["draft", "published", "archived"])],
        list_display=["title", "repository_url", "status", "updated_at"], list_filter=["status"], search_fields=["title", "summary", "body"],
    ))
    cms.register(ContentType(
        "post", label="Blog post", label_plural="Blog posts",
        fields=[CMSField("title", required=True), CMSField("excerpt"), CMSField("body", type="richtext"), CMSField("author", default="Aldane Hutchinson"), CMSField("status", type="select", choices=["draft", "review", "scheduled", "published", "archived"]), CMSField("publish_at", type="datetime")],
        list_display=["title", "author", "status", "updated_at"], list_filter=["status"], search_fields=["title", "excerpt", "body"],
    ))
    cms.register(ContentType(
        "release", label="Release", label_plural="Releases",
        fields=[CMSField("title", required=True), CMSField("version", required=True), CMSField("project", required=True), CMSField("body", type="richtext"), CMSField("release_url", type="url"), CMSField("status", type="select", choices=["draft", "published"])],
        list_display=["version", "project", "status", "updated_at"], list_filter=["project", "status"], search_fields=["title", "version", "project", "body"],
    ))
    return cms
