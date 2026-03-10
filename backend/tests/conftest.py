from __future__ import annotations

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

from neti_search.database import Base, SessionLocal, engine
from neti_search.main import app, get_llm_client, get_search_client
from neti_search.schemas import (
    DocumentExtraction,
    ExtractedEntity,
    ExtractedEvent,
    ResearchAnswerPayload,
    ResearchCitation,
    ResearchTimelineItem,
    WebSearchResult,
)


class FakeSearchClient:
    def search(self, query: str, num_results: int) -> list[WebSearchResult]:
        results = [
            WebSearchResult(
                title="Circle publishes USDC reserve report",
                url="https://example.com/circle-usdc-reserve-report",
                published_date="2026-03-01",
                text=(
                    "Circle published a USDC reserve report. "
                    "USDC reserves are backed by cash and short-duration U.S. Treasuries. "
                    "The report applies to the United States."
                ),
                score=0.9,
            ),
            WebSearchResult(
                title="Regulator statement on stablecoin reserve transparency",
                url="https://example.com/regulator-stablecoin-transparency",
                published_date="2026-03-02",
                text=(
                    "A U.S. regulator published guidance on stablecoin reserve transparency. "
                    "The statement mentions USDC and reserve reporting expectations."
                ),
                score=0.82,
            ),
        ]
        return results[:num_results]


class FakeOpenRouterClient:
    def call_tool(self, **kwargs):
        response_model = kwargs["response_model"]
        if response_model is DocumentExtraction:
            return DocumentExtraction(
                summary="USDC reserve reporting update in the United States.",
                document_type="reserve_report",
                jurisdictions=["US"],
                entities=[
                    ExtractedEntity(name="USDC", kind="stablecoin", summary="USD-backed stablecoin."),
                    ExtractedEntity(name="Circle", kind="issuer", summary="Issuer of USDC."),
                ],
                key_facts=[
                    "USDC reserves are backed by cash and U.S. Treasuries.",
                    "Reserve reporting was updated.",
                ],
                evidence_quotes=[
                    "USDC reserves are backed by cash and short-duration U.S. Treasuries.",
                ],
                event_candidates=[
                    ExtractedEvent(
                        event_type="reserve_report_update",
                        severity="high",
                        summary="USDC reserve reporting was updated.",
                    ),
                ],
            )
        if response_model is ResearchAnswerPayload:
            return ResearchAnswerPayload(
                concise_answer="USDC reserve reporting was updated and the new material emphasizes cash and U.S. Treasury backing.",
                expanded_answer=(
                    "Circle's reserve reporting update and the related regulatory statement both reinforce "
                    "reserve transparency expectations for USDC in the United States."
                ),
                confidence=0.88,
                contradictions=[],
                timeline=[
                    ResearchTimelineItem(
                        date="2026-03-01",
                        summary="Circle published a reserve reporting update for USDC.",
                        source_url="https://example.com/circle-usdc-reserve-report",
                    ),
                ],
                citations=[
                    ResearchCitation(
                        source_title="Circle publishes USDC reserve report",
                        source_url="https://example.com/circle-usdc-reserve-report",
                        published_date="2026-03-01",
                        crawl_date="2026-03-08T00:00:00+00:00",
                        quote="USDC reserves are backed by cash and short-duration U.S. Treasuries.",
                        reason="Supports the reserve composition claim.",
                    ),
                ],
            )
        raise AssertionError(f"Unexpected response model: {response_model}")


@pytest.fixture()
def client() -> Generator[TestClient, None, None]:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    app.dependency_overrides[get_search_client] = lambda: FakeSearchClient()
    app.dependency_overrides[get_llm_client] = lambda: FakeOpenRouterClient()
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def db_session():
    with SessionLocal() as session:
        yield session
