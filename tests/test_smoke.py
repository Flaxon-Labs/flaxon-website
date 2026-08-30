from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
FRAMEWORK_SRC = ROOT.parent / "Flaxon-Backend-Framework-main" / "src"
sys.path.insert(0, str(ROOT / "src"))
sys.path.insert(0, str(FRAMEWORK_SRC))


@pytest.fixture(scope="module")
def website_app(tmp_path_factory):
    os.environ["FLAXON_ADMIN_PASSWORD"] = "SmokeTest123!"
    os.environ["FLAXON_LABS_DATA_DIR"] = str(tmp_path_factory.mktemp("website-data"))
    from flaxon_labs import create_app

    return create_app()


def test_public_route_contract(website_app):
    expected = {"/", "/about", "/projects", "/blog", "/community", "/docs", "/changelog", "/releases", "/search", "/robots.txt", "/sitemap.xml", "/api/projects", "/api/health", "/admin/login", "/static/admin/<path:filepath>"}
    registered = {route.path for route in website_app.router.routes}
    assert expected <= registered
    assert "/admin/labs/community/data" in registered
    assert "/admin/labs/community/export" in registered


def test_admin_custom_pages_are_protected(website_app):
    route = next(route for route in website_app.router.routes if route.path == "/admin/labs/projects")
    assert route.methods == {"GET"}


def test_seeded_cms_types_are_editable(website_app):
    cms = website_app.flaxon_labs_cms
    assert {"page", "project", "post", "release"} <= set(cms.content_types)
    project = cms.content_types["project"].create({"title": "Smoke project", "summary": "A test project", "status": "published"})
    assert project["slug"] == "smoke-project"
