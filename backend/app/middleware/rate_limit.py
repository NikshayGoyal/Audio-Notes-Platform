from collections import defaultdict
import time
from typing import Callable

from fastapi import Request, Response, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse


class SlidingWindowRateLimiter:
    def __init__(self, default_limit: int = 150, window_seconds: int = 60) -> None:
        self.default_limit = default_limit
        self.window_seconds = window_seconds
        self.route_limits: dict[str, int] = {
            "/api/notes": 40,
            "/chat": 25,
            "/retry": 20,
        }
        self.requests: dict[str, list[float]] = defaultdict(list)

    def is_allowed(self, client_id: str, path: str, method: str) -> tuple[bool, int, int]:
        now = time.time()
        window_start = now - self.window_seconds
        key = f"{client_id}:{method}:{path}"

        # Evict old timestamps
        timestamps = [t for t in self.requests[key] if t > window_start]
        self.requests[key] = timestamps

        limit = self.default_limit
        if method == "POST":
            for prefix, r_limit in self.route_limits.items():
                if prefix in path:
                    limit = r_limit
                    break

        if len(timestamps) >= limit:
            return False, limit, 0

        self.requests[key].append(now)
        remaining = max(0, limit - len(self.requests[key]))
        return True, limit, remaining

    def reset(self) -> None:
        self.requests.clear()


class SecurityAndRateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, rate_limiter: SlidingWindowRateLimiter | None = None) -> None:
        super().__init__(app)
        self.limiter = rate_limiter or SlidingWindowRateLimiter()

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        path = request.url.path
        # Exclude internal health checks, root, docs, and CORS preflight
        if (
            path in ("/", "/api/health", "/api/ready", "/docs", "/openapi.json")
            or request.method == "OPTIONS"
        ):
            response = await call_next(request)
            return self._apply_security_headers(response)

        client_ip = request.client.host if request.client else "unknown"
        auth_header = request.headers.get("Authorization", "")
        client_id = auth_header if auth_header else client_ip

        allowed, limit, remaining = self.limiter.is_allowed(client_id, path, request.method)

        if not allowed:
            res = JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": "Rate limit exceeded. Please wait a moment before sending more requests."
                },
            )
            res.headers["Retry-After"] = str(self.limiter.window_seconds)
            res.headers["X-RateLimit-Limit"] = str(limit)
            res.headers["X-RateLimit-Remaining"] = "0"
            return self._apply_security_headers(res)

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        return self._apply_security_headers(response)

    def _apply_security_headers(self, response: Response) -> Response:
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response
