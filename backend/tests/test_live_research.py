from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient

from neti_search.database import Base, engine
from neti_search.main import app


@pytest.mark.live
def test_live_research_query_uses_exa_and_openrouter():
    if not os.getenv("OPENROUTER_API_KEY") or not os.getenv("EXA_API_KEY"):
        pytest.skip("Live provider keys are not configured.")

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    app.dependency_overrides.clear()

    with TestClient(app) as client:
        response = client.post(
            "/research/queries",
            json={
                "query": "Circle USDC reserve report stablecoin regulatory update",
                "num_results": 2,
            },
        )
        assert response.status_code == 200, response.text
        payload = response.json()
        assert payload["concise_answer"]
        assert payload["expanded_answer"]
        assert payload["citations"]
