from app.db.base import SessionLocal
from sqlalchemy.orm import Session
from fastapi import Depends, Request, Response, HTTPException
from app.db.repository import UserRepository
from app.core.jwt import (
    verify_jwt,
    rotate_refresh,
    issue_tokens,
    ACCESS_COOKIE_NAME,
    REFRESH_COOKIE_NAME,
    set_auth_cookies,
)
import jwt


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    response: Response,
    request: Request,
    db: Session = Depends(get_db),
):
    """Authenticate user via HttpOnly cookies.

    - Try access token first.
    - If expired/invalid, try refresh token and rotate to new pair.
    - On success, returns DB user.
    - On failure, raises 401.
    """
    user_repo = UserRepository(db)

    access_token = request.cookies.get(ACCESS_COOKIE_NAME)
    refresh_token = request.cookies.get(REFRESH_COOKIE_NAME)

    # 1) Validate access token
    if access_token:
        try:
            payload = verify_jwt(access_token)
            if payload.get("type") != "access":
                raise HTTPException(status_code=401, detail="Invalid access token")
            sub = payload.get("sub")
            if not sub:
                raise HTTPException(status_code=401, detail="Invalid token subject")
            user = user_repo.get_by_id(int(sub))
            if not user:
                raise HTTPException(status_code=401, detail="Not authenticated")
            return user
        except jwt.ExpiredSignatureError:
            import traceback
            traceback.print_exc()
            # fall through to refresh
            pass
        except jwt.InvalidTokenError:
            import traceback
            traceback.print_exc()
            # fall through to refresh if available
            pass

    # 2) Try refresh token
    if refresh_token:
        try:
            payload = verify_jwt(refresh_token)
            print("refresh token payload: ", payload)
            if payload.get("type") != "refresh":
                raise HTTPException(status_code=401, detail="Invalid refresh token")
            sub = payload.get("sub")
            if not sub:
                raise HTTPException(status_code=401, detail="Invalid refresh subject")
            user = user_repo.get_by_id(int(sub))
            if not user:
                raise HTTPException(status_code=401, detail="User not found")
            # rotate tokens (re-issue without re-decoding again)
            new_access, new_refresh = issue_tokens(user)
            set_auth_cookies(response, new_access, new_refresh)
            return user
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Refresh token expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid refresh token")

    raise HTTPException(status_code=401, detail="Not authenticated")
