"""Completed-result adapter for the protected Admin dashboard."""

from modules.game import storage


class GameResult:
    """Admin adapter exposes completed scores, never tokens or secret numbers."""

    @classmethod
    async def get_instances(cls):
        with storage.connect() as db:
            return [
                storage.public(row)
                for row in db.execute(
                    "SELECT * FROM games WHERE outcome != 'playing' ORDER BY completed_at DESC"
                )
            ]

    @classmethod
    async def get_instance(cls, id):
        with storage.connect() as db:
            row = db.execute(
                "SELECT * FROM games WHERE id=? AND outcome != 'playing'", (str(id),)
            ).fetchone()
            return storage.public(row) if row else None

    @classmethod
    async def delete_instance(cls, id):
        with storage.connect() as db:
            return (
                db.execute(
                    "DELETE FROM games WHERE id=? AND outcome != 'playing'", (str(id),)
                ).rowcount
                > 0
            )

    @classmethod
    async def create_instance(cls, data):
        raise PermissionError("Results are produced by gameplay only.")

    @classmethod
    async def update_instance(cls, id, data):
        raise PermissionError("Scores cannot be edited.")
