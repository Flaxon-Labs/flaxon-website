from __future__ import annotations

import pytest

from flaxon_labs.services.community import CommunityStore


class FakeDatabase:
    def __init__(self):
        self.subscribers = []
        self.messages = []
        self.rate_events = []

    async def execute(self, query, *args):
        if "flaxon_subscribers" in query and query.lstrip().startswith("INSERT"):
            self.subscribers.append({"id": args[0], "email": args[1], "created_at": args[2]})
        if "flaxon_contact_messages" in query and query.lstrip().startswith("INSERT"):
            self.messages.append(dict(zip(("id", "name", "email", "subject", "message", "status", "created_at", "ip_address", "user_agent"), args)))
        if "flaxon_contact_messages" in query and query.lstrip().startswith("UPDATE"):
            for item in self.messages:
                if item["id"] == args[1]:
                    item["status"] = args[0]
        if "flaxon_community_rate_events" in query and query.lstrip().startswith("INSERT"):
            self.rate_events.append({"id": args[0], "action": args[1], "ip_address": args[2], "created_at": args[3]})

    async def fetch_one(self, query, *args):
        if "flaxon_contact_messages" in query:
            return next((item for item in self.messages if item["id"] == args[0]), None)
        return next((item for item in self.subscribers if item["email"] == args[0]), None)

    async def fetch_all(self, query, *args):
        if "flaxon_community_rate_events" in query:
            return [item for item in self.rate_events if item["action"] == args[0] and item["ip_address"] == args[1]]
        return self.messages if "flaxon_contact_messages" in query else self.subscribers

    async def fetch_val(self, query, *args):
        return len(self.subscribers) if "subscribers" in query else len(self.messages)


@pytest.mark.asyncio
async def test_subscription_is_persisted_and_idempotent():
    database = FakeDatabase()
    store = CommunityStore(database)
    await store.initialize()
    first = await store.subscribe("Person@Example.com")
    second = await store.subscribe("person@example.com")
    assert first["existing"] is False
    assert second["existing"] is True
    assert len(database.subscribers) == 1


@pytest.mark.asyncio
async def test_contact_is_persisted_and_validated():
    database = FakeDatabase()
    store = CommunityStore(database)
    await store.initialize()
    record = await store.contact({"name": "Contributor", "email": "person@example.com", "subject": "Bug report", "message": "I found an issue."})
    assert record["status"] == "new"
    assert len(database.messages) == 1
    with pytest.raises(ValueError, match="valid email"):
        await store.subscribe("invalid")


@pytest.mark.asyncio
async def test_admin_can_review_and_update_contact_status():
    database = FakeDatabase()
    store = CommunityStore(database)
    await store.initialize()
    record = await store.contact({"name": "Contributor", "email": "person@example.com", "subject": "Bug report", "message": "Details", "ip_address": "127.0.0.1", "user_agent": "test"})
    messages = await store.list_messages()
    assert messages[0]["ip_address"] == "127.0.0.1"
    assert await store.update_message_status(record["id"], "in_progress") is True
    assert database.messages[0]["status"] == "in_progress"


@pytest.mark.asyncio
async def test_public_submission_rate_limit_is_shared_by_ip():
    database = FakeDatabase()
    store = CommunityStore(database)
    await store.initialize()
    for index in range(5):
        await store.subscribe(f"person{index}@example.com", ip_address="203.0.113.10")
    with pytest.raises(ValueError, match="Too many submissions"):
        await store.subscribe("person5@example.com", ip_address="203.0.113.10")
