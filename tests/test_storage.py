from __future__ import annotations

import json
from unittest.mock import patch

import pytest

from flaxon_labs.services.media_storage import VercelBlobStorage


class FakeResponse:
    def __init__(self, status=200, body=b"", headers=None):
        self.status, self._body = status, body
        self.headers = headers or {}

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def read(self):
        return self._body


@pytest.mark.asyncio
async def test_blob_adapter_authenticates_and_follows_list_cursors():
    requests = []
    responses = iter([
        FakeResponse(body=b"data"),
        FakeResponse(body=json.dumps({"blobs": [{"pathname": "images/a.png"}], "hasMore": True, "nextCursor": "next"}).encode()),
        FakeResponse(body=json.dumps({"blobs": [{"pathname": "images/b.png"}], "hasMore": False}).encode()),
        FakeResponse(status=204),
    ])

    def fake_urlopen(request, timeout):
        requests.append((request.method, request.full_url, request.get_header("Authorization")))
        return next(responses)

    storage = VercelBlobStorage("secret", "https://public.example")
    with patch("flaxon_labs.services.media_storage.urllib.request.urlopen", fake_urlopen):
        assert await storage.read("data.txt") == b"data"
        assert await storage.list("images/") == ["images/a.png", "images/b.png"]
        assert await storage.delete("data.txt") is True
    assert requests[0] == ("GET", "https://blob.vercel-storage.com/data.txt", "Bearer secret")
    assert "cursor=next" in requests[2][1]
    assert storage.get_url("images/a.png") == "https://public.example/images/a.png"
