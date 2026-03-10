from __future__ import annotations

from datetime import datetime
from pathlib import Path
from urllib.robotparser import RobotFileParser

from sqlalchemy import select

from conftest import FakeOpenRouterClient
from neti_search.main import app, get_llm_client
from neti_search.main import get_search_client
from neti_search.models import DigestSettings, Entity
from neti_search.schemas import ResearchAnswerPayload, WebSearchResult
from neti_search.services.crawl_service import ROBOTS_CACHE


class NoCitationOpenRouterClient(FakeOpenRouterClient):
    def call_tool(self, **kwargs):
        response_model = kwargs["response_model"]
        if response_model is ResearchAnswerPayload:
            return ResearchAnswerPayload(
                concise_answer="Fallback citation path exercised for USDC reserve reporting.",
                expanded_answer="The answer content exists, but citations and timeline are intentionally omitted.",
                confidence=0.72,
                contradictions=[],
                timeline=[],
                citations=[],
            )
        return super().call_tool(**kwargs)


def test_api_root_is_served(client):
    response = client.get("/")
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["name"] == "Neti Search API"
    assert payload["health"] == "/healthz"


def test_source_crawl_populates_runs_documents_and_entities(client, db_session):
    watchlist = client.post(
        "/watchlists",
        json={
            "name": "USDC monitor",
            "watched_entities": ["USDC"],
            "watched_jurisdictions": ["US"],
            "watched_topics": ["reserve"],
        },
    )
    assert watchlist.status_code == 200, watchlist.text

    source_response = client.post(
        "/sources",
        json={
            "kind": "search_query",
            "label": "USDC reserve query",
            "seed_value": "USDC reserve report",
            "jurisdiction": "US",
            "source_tier": "tier1",
        },
    )
    assert source_response.status_code == 200, source_response.text
    source_id = source_response.json()["id"]

    crawl_response = client.post(f"/sources/{source_id}/crawl")
    assert crawl_response.status_code == 200, crawl_response.text
    assert crawl_response.json()["status"] == "completed"

    runs_response = client.get(f"/sources/{source_id}/runs")
    assert runs_response.status_code == 200, runs_response.text
    assert len(runs_response.json()) == 1

    search_response = client.get("/search", params={"q": "USDC", "num_results": 2})
    assert search_response.status_code == 200, search_response.text
    payload = search_response.json()
    assert payload["remote_results"]
    assert payload["local_results"]

    entity = db_session.scalar(select(Entity).where(Entity.canonical_name == "USDC"))
    assert entity is not None

    entity_response = client.get(f"/entities/{entity.id}")
    assert entity_response.status_code == 200, entity_response.text
    entity_payload = entity_response.json()
    assert entity_payload["canonical_name"] == "USDC"
    assert entity_payload["documents"]
    assert entity_payload["timeline"]

    dashboard = client.get("/dashboard/summary")
    assert dashboard.status_code == 200, dashboard.text
    dashboard_payload = dashboard.json()
    assert dashboard_payload["stats"]["sources"] >= 1
    assert dashboard_payload["stats"]["documents"] >= 1
    assert dashboard_payload["recent_entities"]


def test_research_query_returns_structured_answer_and_alerts(client):
    watchlist = client.post(
        "/watchlists",
        json={
            "name": "Reserve alerts",
            "watched_entities": ["USDC"],
            "watched_topics": ["reserve"],
        },
    )
    assert watchlist.status_code == 200, watchlist.text

    response = client.post(
        "/research/queries",
        json={"query": "What changed in USDC reserve reporting?", "num_results": 2},
    )
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["concise_answer"]
    assert payload["expanded_answer"]
    assert payload["citations"]
    assert payload["confidence"] > 0

    query_id = payload["id"]
    get_query = client.get(f"/research/queries/{query_id}")
    assert get_query.status_code == 200, get_query.text
    assert get_query.json()["query"] == "What changed in USDC reserve reporting?"

    alerts = client.get("/alerts")
    assert alerts.status_code == 200, alerts.text
    assert len(alerts.json()) >= 1


def test_research_query_falls_back_to_extracted_citations(client):
    app.dependency_overrides[get_llm_client] = lambda: NoCitationOpenRouterClient()

    response = client.post(
        "/research/queries",
        json={"query": "What changed in USDC reserve reporting?", "num_results": 2},
    )
    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["citations"]
    assert payload["timeline"]


class StatefulSearchClient:
    def __init__(self) -> None:
        self.calls = 0

    def search(self, query: str, num_results: int) -> list[WebSearchResult]:
        self.calls += 1
        base_text = (
            "Circle published a USDC reserve report. "
            "USDC reserves are backed by cash and short-duration U.S. Treasuries. "
            "The report applies to the United States."
        )
        if self.calls > 1:
            base_text += (
                " The updated report now includes daily disclosure timing, "
                "expanded attestation language, additional segregation detail, "
                "and a revised reserve operations appendix for U.S. oversight teams."
            )
        return [
            WebSearchResult(
                title="Circle publishes USDC reserve report",
                url="https://example.com/circle-usdc-reserve-report",
                published_date="2026-03-01",
                text=base_text,
                score=0.9,
            ),
        ][:num_results]


def test_filtered_search_diff_digest_and_delivery(client):
    search_client = StatefulSearchClient()
    app.dependency_overrides[get_search_client] = lambda: search_client

    watchlist = client.post(
        "/watchlists",
        json={
            "name": "Digest watch",
            "watched_entities": ["USDC"],
            "watched_jurisdictions": ["US"],
            "watched_topics": ["reserve", "disclosure"],
        },
    )
    assert watchlist.status_code == 200, watchlist.text

    digest_settings = client.put(
        "/digest/settings",
        json={
            "schedule": "0 8 * * *",
            "email_recipients": ["ops@example.com"],
            "webhook_targets": [],
            "enabled": True,
        },
    )
    assert digest_settings.status_code == 200, digest_settings.text
    assert digest_settings.json()["email_recipients"] == ["ops@example.com"]

    source_response = client.post(
        "/sources",
        json={
            "kind": "search_query",
            "label": "USDC reserve query",
            "seed_value": "USDC reserve report",
            "jurisdiction": "US",
            "source_tier": "tier1",
        },
    )
    assert source_response.status_code == 200, source_response.text
    source_id = source_response.json()["id"]

    first_crawl = client.post(f"/sources/{source_id}/crawl")
    assert first_crawl.status_code == 200, first_crawl.text

    second_crawl = client.post(f"/sources/{source_id}/crawl")
    assert second_crawl.status_code == 200, second_crawl.text

    diffs = client.get("/diffs")
    assert diffs.status_code == 200, diffs.text
    diff_payload = diffs.json()
    assert diff_payload
    assert diff_payload[0]["document_id"] >= 1
    assert diff_payload[0]["material_change"] is True

    search_response = client.get(
        "/search",
        params={
            "q": "USDC",
            "jurisdiction": "US",
            "entity_type": "stablecoin",
            "document_type": "reserve_report",
            "source_tier": "tier1",
            "freshness_days": 30,
            "num_results": 5,
        },
    )
    assert search_response.status_code == 200, search_response.text
    search_payload = search_response.json()
    assert search_payload["local_results"]
    assert search_payload["local_results"][0]["jurisdictions"] == ["US"]

    digest_run = client.post("/digest/run")
    assert digest_run.status_code == 200, digest_run.text
    digest_payload = digest_run.json()
    assert digest_payload["delivery_count"] == 1
    assert digest_payload["deliveries"][0]["channel"] == "email"
    assert Path(digest_payload["deliveries"][0]["artifact_uri"]).exists()


def test_digest_run_handles_naive_last_sent_at(client, db_session):
    digest_settings = client.put(
        "/digest/settings",
        json={
            "schedule": "0 8 * * *",
            "email_recipients": ["ops@example.com"],
            "webhook_targets": [],
            "enabled": True,
        },
    )
    assert digest_settings.status_code == 200, digest_settings.text

    settings_record = db_session.scalar(select(DigestSettings).limit(1))
    assert settings_record is not None
    settings_record.last_sent_at = datetime(2026, 3, 9, 8, 0, 0)
    db_session.add(settings_record)
    db_session.commit()

    digest_run = client.post("/digest/run")
    assert digest_run.status_code == 200, digest_run.text
    digest_payload = digest_run.json()
    assert digest_payload["delivery_count"] == 1
    assert digest_payload["status"] == "completed"


def test_source_watchlist_update_archive_and_scheduler_status(client):
    source_response = client.post(
        "/sources",
        json={
            "kind": "search_query",
            "label": "Initial source",
            "seed_value": "USDC reserve report",
            "jurisdiction": "US",
            "source_tier": "tier1",
        },
    )
    assert source_response.status_code == 200, source_response.text
    source_id = source_response.json()["id"]

    updated_source = client.put(
        f"/sources/{source_id}",
        json={
            "kind": "search_query",
            "label": "Updated source",
            "seed_value": "USDC reserve report",
            "jurisdiction": "US",
            "source_tier": "tier1",
            "crawl_frequency": "hourly",
            "trust_score": 0.85,
            "allow_flag": True,
            "deny_flag": False,
            "status": "active",
        },
    )
    assert updated_source.status_code == 200, updated_source.text
    assert updated_source.json()["label"] == "Updated source"
    assert updated_source.json()["crawl_frequency"] == "hourly"

    watchlist = client.post(
        "/watchlists",
        json={
            "name": "Archive me",
            "watched_entities": ["USDC"],
            "watched_jurisdictions": ["US"],
            "watched_topics": ["reserve"],
        },
    )
    assert watchlist.status_code == 200, watchlist.text
    watchlist_id = watchlist.json()["id"]

    updated_watchlist = client.put(
        f"/watchlists/{watchlist_id}",
        json={
            "name": "Archive me",
            "watched_entities": ["USDC", "Circle"],
            "watched_jurisdictions": ["US"],
            "watched_topics": ["reserve", "disclosure"],
            "status": "active",
        },
    )
    assert updated_watchlist.status_code == 200, updated_watchlist.text
    assert updated_watchlist.json()["watched_entities"] == ["USDC", "Circle"]

    scheduler_status = client.get("/scheduler/status")
    assert scheduler_status.status_code == 200, scheduler_status.text
    assert source_id in scheduler_status.json()["due_source_ids"]

    archived_source = client.post(f"/sources/{source_id}/archive")
    assert archived_source.status_code == 200, archived_source.text
    assert archived_source.json()["status"] == "archived"

    archived_watchlist = client.post(f"/watchlists/{watchlist_id}/archive")
    assert archived_watchlist.status_code == 200, archived_watchlist.text
    assert archived_watchlist.json()["status"] == "archived"

    active_sources = client.get("/sources")
    assert active_sources.status_code == 200, active_sources.text
    assert all(source["id"] != source_id for source in active_sources.json())

    active_watchlists = client.get("/watchlists")
    assert active_watchlists.status_code == 200, active_watchlists.text
    assert all(item["id"] != watchlist_id for item in active_watchlists.json())

    all_sources = client.get("/sources", params={"include_archived": True})
    assert all_sources.status_code == 200, all_sources.text
    assert any(source["id"] == source_id and source["archived_at"] for source in all_sources.json())

    all_watchlists = client.get("/watchlists", params={"include_archived": True})
    assert all_watchlists.status_code == 200, all_watchlists.text
    assert any(item["id"] == watchlist_id and item["archived_at"] for item in all_watchlists.json())


def test_robots_failure_is_classified(client):
    parser = RobotFileParser()
    parser.parse(["User-agent: *", "Disallow: /blocked"])
    ROBOTS_CACHE["https://example.com/robots.txt"] = parser

    source_response = client.post(
        "/sources",
        json={
            "kind": "url",
            "label": "Blocked page",
            "seed_value": "https://example.com/blocked",
            "jurisdiction": "US",
            "source_tier": "tier1",
        },
    )
    assert source_response.status_code == 200, source_response.text
    source_id = source_response.json()["id"]

    crawl_response = client.post(f"/sources/{source_id}/crawl")
    assert crawl_response.status_code == 500
    assert "Robots policy denied" in crawl_response.text

    runs_response = client.get(f"/sources/{source_id}/runs")
    assert runs_response.status_code == 200, runs_response.text
    run_payload = runs_response.json()[0]
    assert run_payload["failure_type"] == "robots_denied"
    assert run_payload["failure_stage"] == "policy"

    ROBOTS_CACHE.clear()
