from __future__ import annotations

import asyncio
import urllib.error
import json
from urllib.parse import quote
import urllib.request
from typing import Any


class VercelBlobStorage:
    """Small async adapter for Vercel Blob's token-authenticated HTTP API."""

    def __init__(self, token: str, public_url: str | None = None) -> None:
        self.token = token
        self.public_url = (public_url or "").rstrip("/") or None

    def get_url(self, path: str) -> str:
        if not self.public_url:
            raise RuntimeError("BLOB_PUBLIC_URL is required for public media URLs")
        return f"{self.public_url}/{path.lstrip('/')}"

    async def _request(self, method: str, path: str, data: bytes | None = None, content_type: str | None = None) -> tuple[int, bytes, dict[str, str]]:
        url = f"https://blob.vercel-storage.com/{path.lstrip('/')}" if not str(path).startswith("?") else f"https://blob.vercel-storage.com/{path}"
        headers = {"Authorization": f"Bearer {self.token}", "x-api-version": "7"}
        if content_type:
            headers["Content-Type"] = content_type

        def send() -> tuple[int, bytes, dict[str, str]]:
            request = urllib.request.Request(url, data=data, headers=headers, method=method)
            try:
                with urllib.request.urlopen(request, timeout=30) as response:
                    return response.status, response.read(), dict(response.headers.items())
            except urllib.error.HTTPError as exc:
                return exc.code, exc.read(), dict(exc.headers.items())

        return await asyncio.to_thread(send)

    async def write(self, path: str, data: bytes, content_type: str | None = None) -> None:
        status, _, _ = await self._request("PUT", path, data, content_type)
        if status >= 300:
            raise RuntimeError(f"Vercel Blob upload failed with HTTP {status}")

    async def read(self, path: str) -> bytes:
        status, data, _ = await self._request("GET", path)
        if status >= 300:
            raise FileNotFoundError(path)
        return data

    async def delete(self, path: str) -> bool:
        status, _, _ = await self._request("DELETE", path)
        return status < 300

    async def exists(self, path: str) -> bool:
        status, _, _ = await self._request("HEAD", path)
        return status < 300

    async def size(self, path: str) -> int:
        status, _, headers = await self._request("HEAD", path)
        if status >= 300:
            return 0
        return int(headers.get("Content-Length", 0))

    async def list(self, prefix: str = "") -> list[str]:
        keys: list[str] = []
        cursor: str | None = None
        while True:
            query = "?limit=1000"
            if prefix:
                query += f"&prefix={quote(prefix)}"
            if cursor:
                query += f"&cursor={quote(cursor)}"
            status, body, _ = await self._request("GET", query)
            if status >= 300:
                raise RuntimeError(f"Vercel Blob listing failed with HTTP {status}")
            payload = json.loads(body or b"{}")
            keys.extend(str(blob["pathname"]) for blob in payload.get("blobs", []) if blob.get("pathname"))
            if not payload.get("hasMore") or not payload.get("nextCursor"):
                return keys
            cursor = str(payload["nextCursor"])
