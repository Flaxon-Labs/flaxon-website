from __future__ import annotations

import json
from unittest.mock import patch

import pytest

from flaxon_labs.services.github import GitHubAPIError, GitHubClient


class FakeResponse:
    def __init__(self, payload):
        self.payload = json.dumps(payload).encode()

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def read(self):
        return self.payload


@pytest.mark.asyncio
async def test_github_client_requests_repositories_and_releases():
    calls = []

    def fake_urlopen(request, timeout):
        calls.append((request.full_url, timeout, request.get_header("Authorization")))
        return FakeResponse([{"name": "flaxon"}])

    client = GitHubClient("Flaxon-Labs", token="secret", timeout=4)
    with patch("flaxon_labs.services.github.urlopen", fake_urlopen):
        assert await client.repositories() == [{"name": "flaxon"}]
        assert await client.releases("flaxon") == [{"name": "flaxon"}]
    assert calls[0][0].endswith("/orgs/Flaxon-Labs/repos?sort=updated&per_page=100")
    assert calls[1][0].endswith("/repos/Flaxon-Labs/flaxon/releases?per_page=100")
    assert all(call[1] == 4 for call in calls)
    assert all(call[2] == "Bearer secret" for call in calls)


@pytest.mark.asyncio
async def test_github_client_rejects_non_list_payload():
    client = GitHubClient("Flaxon-Labs")
    with patch("flaxon_labs.services.github.urlopen", lambda request, timeout: FakeResponse({"message": "bad"})):
        with pytest.raises(GitHubAPIError, match="unexpected response"):
            await client.repositories()
