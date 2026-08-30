"""Small, dependency-free GitHub API client for public organization data."""

from __future__ import annotations

import asyncio
import json
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request as UrlRequest, urlopen


class GitHubAPIError(RuntimeError):
    """Raised when GitHub cannot provide a valid response."""


class GitHubClient:
    def __init__(self, organization: str, token: str | None = None, timeout: float = 8.0) -> None:
        self.organization = organization.strip()
        self.token = token
        self.timeout = max(1.0, min(float(timeout), 30.0))

    async def repositories(self) -> list[dict[str, Any]]:
        return await self._get(f"/orgs/{self.organization}/repos?sort=updated&per_page=100")

    async def releases(self, repository: str) -> list[dict[str, Any]]:
        return await self._get(f"/repos/{self.organization}/{repository}/releases?per_page=100")

    async def _get(self, path: str) -> list[dict[str, Any]]:
        url = "https://api.github.com" + path

        def fetch() -> list[dict[str, Any]]:
            request = UrlRequest(url, headers={"Accept": "application/vnd.github+json", "User-Agent": "flaxon-labs-website"})
            if self.token:
                request.add_header("Authorization", f"Bearer {self.token}")
            try:
                with urlopen(request, timeout=self.timeout) as response:
                    payload = json.loads(response.read().decode("utf-8"))
            except (HTTPError, URLError, TimeoutError, ValueError) as exc:
                raise GitHubAPIError(f"GitHub request failed: {exc}") from exc
            if not isinstance(payload, list):
                raise GitHubAPIError("GitHub returned an unexpected response.")
            return payload

        return await asyncio.to_thread(fetch)
