"""Game APIs and the Play page belong to one feature module."""

import asyncio
from pathlib import Path
from urllib.parse import urlsplit

from flaxon import Request
from flaxon.http import JSONResponse
from flaxon.modules import FlaxonModule
from flaxon.validation import Schema, fields

from modules.game import storage

game = FlaxonModule("game", ui_dir=Path(__file__).parent / "ui")


class GuessInput(Schema):
    value = fields.IntField(required=True, minimum=1, maximum=100)


def is_game_client(request: Request) -> bool:
    """Require a same-origin browser client for mutation requests."""
    if request.headers.get("x-game-client") != "flaxon-spa":
        return False

    origin = request.headers.get("origin")
    if not origin:
        return True  # Command-line clients have no browser Origin header.

    origin_url = urlsplit(origin)
    production = request.app.state.production
    allowed_schemes = {"https"} if production else {"http", "https"}
    return (
        origin_url.netloc == request.headers.get("host")
        and origin_url.scheme in allowed_schemes
    )


@game.post("/")
async def start_game(request: Request):
    if not is_game_client(request):
        return JSONResponse(
            {"error": "Same-origin game client required."}, status_code=403
        )

    round_data = await asyncio.to_thread(storage.create)
    return JSONResponse(
        round_data, status_code=201, headers={"Cache-Control": "no-store"}
    )


@game.get("/<game_id>")
async def get_game(request: Request, game_id: str):
    token = request.headers.get("x-game-token", "")
    try:
        round_data = await asyncio.to_thread(storage.read, game_id, token)
        return JSONResponse(round_data, headers={"Cache-Control": "no-store"})
    except LookupError as error:
        return JSONResponse({"error": str(error)}, status_code=404)


@game.post("/<game_id>/guesses")
async def submit_guess(request: Request, game_id: str, data: GuessInput):
    if not is_game_client(request):
        return JSONResponse(
            {"error": "Same-origin game client required."}, status_code=403
        )

    token = request.headers.get("x-game-token", "")
    value = data.to_dict()["value"]
    try:
        round_data = await asyncio.to_thread(storage.guess, game_id, token, value)
        return JSONResponse(round_data, headers={"Cache-Control": "no-store"})
    except LookupError as error:
        return JSONResponse({"error": str(error)}, status_code=404)
    except ValueError as error:
        return JSONResponse({"error": str(error)}, status_code=409)
