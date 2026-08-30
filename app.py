"""Flaxon Labs organization website entry point."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))

from flaxon_labs import create_app

app = create_app()


if __name__ == "__main__":
    import uvicorn

    import os

    uvicorn.run(
        "app:app",
        host=os.getenv("FLAXON_HOST", "127.0.0.1"),
        port=int(os.getenv("PORT", os.getenv("FLAXON_PORT", "8000"))),
        reload=os.getenv("FLAXON_RELOAD", "true").lower() not in {"0", "false", "no"},
    )
