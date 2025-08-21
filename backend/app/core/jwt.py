import os
from datetime import datetime, timedelta, timezone
from typing import Tuple, Dict, Any
import jwt
import uuid
from fastapi import Response

# Configuration via environment variables with sensible defaults
JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change")
JWT_ALG = os.getenv("JWT_ALG", "HS256")
ACCESS_TOKEN_MIN = int(os.getenv("ACCESS_TOKEN_MIN", "15"))
REFRESH_TOKEN_DAYS = int(os.getenv("REFRESH_TOKEN_DAYS", "14"))

COOKIE_DOMAIN = os.getenv("COOKIE_DOMAIN") or None
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"
COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "lax").lower()  # lax | strict | none

ACCESS_COOKIE_NAME = os.getenv("ACCESS_COOKIE_NAME", "access_token")
REFRESH_COOKIE_NAME = os.getenv("REFRESH_COOKIE_NAME", "refresh_token")


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def sign_jwt(payload: Dict[str, Any], exp: datetime) -> str:
    """Sign a JWT with provided payload and absolute expiration datetime (UTC)."""
    to_encode = payload.copy()
    to_encode.update({
        "iat": int(_utcnow().timestamp()),
        "exp": int(exp.timestamp()),
    })
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALG)


def verify_jwt(token: str) -> Dict[str, Any]:
    """Verify and decode a JWT token. Raises on invalid/expired."""
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])


def issue_tokens(user) -> Tuple[str, str]:
    """Issue (access, refresh) token pair for the given user."""
    
    now = _utcnow()
    access_exp = now + timedelta(minutes=ACCESS_TOKEN_MIN)
    refresh_exp = now + timedelta(days=REFRESH_TOKEN_DAYS)

    access_payload = {"sub": str(user.id), "type": "access"}
    refresh_payload = {"sub": str(user.id), "type": "refresh", "jti": uuid.uuid4().hex}

    access_token = sign_jwt(access_payload, access_exp)
    refresh_token = sign_jwt(refresh_payload, refresh_exp)
    return access_token, refresh_token


def rotate_refresh(user, old_refresh: str) -> Tuple[str, str]:
    """Verify old refresh token and rotate to a new (access, refresh) pair."""
    payload = verify_jwt(old_refresh)
    if payload.get("type") != "refresh":
        raise ValueError("Invalid token type for refresh")
    sub = payload.get("sub")
    if not sub or sub != getattr(user, "id"):
        raise ValueError("Refresh token subject mismatch")
    return issue_tokens(user)


def set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    """Set HttpOnly auth cookies on the response."""
    # Access cookie
    response.set_cookie(
        key=ACCESS_COOKIE_NAME,
        value=access_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=ACCESS_TOKEN_MIN * 60,
        path="/",
        domain=COOKIE_DOMAIN,
    )
    # Refresh cookie
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=REFRESH_TOKEN_DAYS * 24 * 60 * 60,
        path="/",
        domain=COOKIE_DOMAIN,
    )


def clear_auth_cookies(response: Response) -> None:
    """Clear auth cookies from the client."""
    response.delete_cookie(
        key=ACCESS_COOKIE_NAME,
        path="/",
        domain=COOKIE_DOMAIN,
    )
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        path="/",
        domain=COOKIE_DOMAIN,
    )