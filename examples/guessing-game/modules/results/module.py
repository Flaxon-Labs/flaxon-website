"""Results has its own API, Teloce page, and Admin adapter."""

import asyncio
from pathlib import Path

from flaxon import Request
from flaxon.http import JSONResponse
from flaxon.modules import FlaxonModule

from modules.game import storage

results = FlaxonModule("results", ui_dir=Path(__file__).parent / "ui")


@results.get("/<game_id>")
async def get_result(request: Request, game_id: str):
    token = request.headers.get("x-game-token", "")
    try:
        round_data = await asyncio.to_thread(storage.read, game_id, token)
        if round_data["outcome"] == "playing":
            return JSONResponse(
                {"error": "This round has not finished."}, status_code=409
            )
        return JSONResponse(round_data, headers={"Cache-Control": "no-store"})
    except LookupError as error:
        return JSONResponse({"error": str(error)}, status_code=404)
