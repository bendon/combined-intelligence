import secrets
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Response, Request
from fastapi.responses import RedirectResponse

from app.config import get_settings
from app.database import get_db
from app.auth.google import get_google_auth_url, exchange_code
from app.auth.jwt import create_token, set_auth_cookie, clear_auth_cookie, current_user
from fastapi import Depends

settings = get_settings()
router = APIRouter()

# In-memory CSRF state store (use Redis in production for multi-instance)
_pending_states: set[str] = set()


@router.get("/google/login")
async def google_login():
    """Redirect the browser to Google's consent screen."""
    state = secrets.token_urlsafe(32)
    _pending_states.add(state)
    return RedirectResponse(get_google_auth_url(state))


@router.get("/google/callback")
async def google_callback(code: str, state: str, response: Response):
    """Google redirects here after user consents."""
    if state not in _pending_states:
        raise HTTPException(status_code=400, detail="Invalid OAuth state")
    _pending_states.discard(state)

    google_user = await exchange_code(code)
    google_id = google_user["sub"]
    email = google_user["email"]
    name = google_user.get("name", "")
    picture = google_user.get("picture", "")

    db = get_db()
    user = await db.users.find_one({"google_id": google_id})

    if user is None:
        # First login — create account
        result = await db.users.insert_one({
            "google_id": google_id,
            "email": email,
            "name": name,
            "picture": picture,
            "role": "free",          # default tier
            "created_at": datetime.now(timezone.utc),
            "last_login": datetime.now(timezone.utc),
        })
        user_id = str(result.inserted_id)
        role = "free"
    else:
        user_id = str(user["_id"])
        role = user.get("role", "free")
        await db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {"last_login": datetime.now(timezone.utc), "picture": picture}},
        )

    token = create_token(user_id, email, role)
    redirect = RedirectResponse(url=settings.base_url)
    set_auth_cookie(redirect, token)
    return redirect


@router.post("/logout")
async def logout(response: Response):
    clear_auth_cookie(response)
    return {"ok": True}


@router.get("/me")
async def me(user: dict = Depends(current_user)):
    """Return the current session's user info (from JWT)."""
    db = get_db()
    from bson import ObjectId
    doc = await db.users.find_one(
        {"_id": ObjectId(user["sub"])},
        {"google_id": 0},  # never expose google_id externally
    )
    if not doc:
        raise HTTPException(status_code=404, detail="User not found")
    doc["_id"] = str(doc["_id"])
    return doc
