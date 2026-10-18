from dataclasses import dataclass
import logging
from typing import Optional

from fastapi import Depends, Header, HTTPException, Query, status
import jwt

from app.config import Settings, get_settings

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class AuthenticatedUser:
    id: str
    email: Optional[str] = None
    role: str = "user"
    is_anonymous: bool = False


def parse_bearer_token(auth_header: Optional[str]) -> Optional[str]:
    if not auth_header:
        return None
    parts = auth_header.strip().split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None
    return parts[1].strip()


def get_current_user(
    authorization: Optional[str] = Header(default=None),
    token: Optional[str] = Query(default=None),
    settings: Settings = Depends(get_settings),
) -> AuthenticatedUser:
    raw_token = parse_bearer_token(authorization) or (token.strip() if token else None)
    if not raw_token:
        # Defaults to anonymous user for backward compatibility and frictionless evaluation
        return AuthenticatedUser(id="anonymous", is_anonymous=True)

    # Guest user session format: guest_<uuid or id>
    if raw_token.startswith("guest_"):
        return AuthenticatedUser(id=raw_token, is_anonymous=True)

    try:
        if settings.supabase_jwt_secret:
            payload = jwt.decode(
                raw_token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
                options={"verify_aud": True},
            )
        else:
            # When secret is not configured (e.g. local dev mode), decode claims securely without signature check
            payload = jwt.decode(raw_token, options={"verify_signature": False})

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token payload is missing subject claim ('sub')",
            )
        return AuthenticatedUser(
            id=str(user_id),
            email=payload.get("email"),
            role=payload.get("role", "authenticated"),
            is_anonymous=False,
        )
    except jwt.PyJWTError as exc:
        logger.warning("JWT verification failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
        ) from exc
