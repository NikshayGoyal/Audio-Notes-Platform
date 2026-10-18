from fastapi.testclient import TestClient

from app.main import app
from app.middleware.rate_limit import SlidingWindowRateLimiter

client = TestClient(app)


def test_security_headers_present():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.headers.get("x-content-type-options") == "nosniff"
    assert response.headers.get("x-frame-options") == "DENY"


def test_rate_limit_headers_present():
    response = client.get("/api/notes")
    assert response.status_code == 200
    assert "x-ratelimit-limit" in response.headers
    assert "x-ratelimit-remaining" in response.headers


def test_sliding_window_rate_limiter_logic():
    limiter = SlidingWindowRateLimiter(default_limit=3, window_seconds=60)
    client_id = "test_user_ip"

    # First 3 requests allowed
    assert limiter.is_allowed(client_id, "/api/notes", "GET")[0] is True
    assert limiter.is_allowed(client_id, "/api/notes", "GET")[0] is True
    assert limiter.is_allowed(client_id, "/api/notes", "GET")[0] is True

    # 4th request blocked
    allowed, limit, remaining = limiter.is_allowed(client_id, "/api/notes", "GET")
    assert allowed is False
    assert remaining == 0


def test_rate_limiter_distinct_clients():
    limiter = SlidingWindowRateLimiter(default_limit=2, window_seconds=60)

    # Client A exhausts limit
    assert limiter.is_allowed("client_a", "/api/notes", "GET")[0] is True
    assert limiter.is_allowed("client_a", "/api/notes", "GET")[0] is True
    assert limiter.is_allowed("client_a", "/api/notes", "GET")[0] is False

    # Client B still has quota
    assert limiter.is_allowed("client_b", "/api/notes", "GET")[0] is True
