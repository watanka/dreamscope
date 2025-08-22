from fastapi import APIRouter, Body, HTTPException, Depends, Response
from app.dependencies import get_db, get_current_user
from app.db.repository import UserRepository
import os
import requests
from app.db.models import User as DBUser
from sqlalchemy.orm import Session
from fastapi.responses import RedirectResponse
import urllib.parse
from dotenv import load_dotenv
from app.core.jwt import issue_tokens, set_auth_cookies, clear_auth_cookies
load_dotenv()
router = APIRouter()

@router.get("/google/callback")
def google_callback(code: str, state: str = None, next: str = None, db: Session = Depends(get_db)):
    user_repo = UserRepository(db)
    token_endpoint = "https://oauth2.googleapis.com/token"
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI") or "http://localhost:8000/auth/google/callback"
    print("redirect_uri: ", redirect_uri)
    if not client_id or not client_secret:
        raise HTTPException(status_code=500, detail="Google OAuth is not configured. Missing GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET.")
    data = {
        "code": code,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    }

    r = requests.post(token_endpoint, data=data)
    if r.status_code != 200:
        raise HTTPException(status_code=400, detail=f"Google token exchange failed: {r.text}")
    
    token_json = r.json()
    access_token = token_json['access_token']
    id_token = token_json.get("id_token")

    userinfo_endpoint = "https://www.googleapis.com/oauth2/v2/userinfo"
    headers = {"Authorization": f"Bearer {access_token}"}
    userinfo_resp = requests.get(userinfo_endpoint, headers = headers)
    if userinfo_resp.status_code != 200:
        raise HTTPException(status_code=400, detail="Google user info fetch failed")
    
    user_info = userinfo_resp.json()
    email = user_info.get('email')
    if not email:
        raise HTTPException(status_code=400, detail="Google user info missing email")

    user = user_repo.get_by_email(email)
    if not user:
        # 새로운 유저 생성
        # email은 위에서 검증됨
        given_name = user_info.get('given_name') or ""
        family_name = user_info.get('family_name') or ""
        picture = user_info.get('picture') or ""
        new_user = DBUser(
            email=email,
            given_name=given_name,
            family_name=family_name,
            picture=picture,
        )
        user_repo.create(new_user)
        user = new_user

    # server-side jwt 발급 및 전송
    access_token, refresh_token = issue_tokens(user)

    # Server-side callback: redirect to frontend with minimal user info (UI only)
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    params = {
        # id_token은 이제 사용하지 않지만, 기존 프론트 호환을 위해 남겨둠
        "id_token": id_token or "",
        "name": f"{user.given_name} {user.family_name}",
        "email": user.email or "",
        "avatar_url": user.picture or "",
    }
    if state:
        params["state"] = state
    if next:
        params["next"] = next
    qs = urllib.parse.urlencode(params, doseq=False, safe="")
    redirect_to = f"{frontend_url}/auth/complete?{qs}"
    resp = RedirectResponse(url=redirect_to, status_code=302)
    set_auth_cookies(resp, access_token, refresh_token)
    return resp

@router.post("/logout")
def logout(response: Response):
    # token 삭제 (쿠키 제거)
    clear_auth_cookies(response)
    return {"ok": True}


@router.get("/whoami")
def whoami(user: DBUser = Depends(get_current_user)):
    return {
        "id": user.id,
        "email": user.email,
        "name": f"{user.given_name or ''} {user.family_name or ''}".strip(),
        "avatar_url": user.picture,
    }
