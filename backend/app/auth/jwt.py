from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
from fastapi import Cookie, Depends, HTTPException, status
from app.config import get_settings

settings = get_settings()


def create_token(user_id: str, email: str, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    return jwt.encode(
        {"sub": user_id, "email": email, "role": role, "exp": expire},
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


def set_auth_cookie(response, token: str) -> None:
    response.set_cookie(
        key="ci_token",
        value=token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
        domain=settings.cookie_domain,
        max_age=settings.jwt_expire_minutes * 60,
    )


def clear_auth_cookie(response) -> None:
    response.delete_cookie(
        key="ci_token",
        domain=settings.cookie_domain,
        httponly=True,
        secure=settings.cookie_secure,
    )


# ── FastAPI dependency ────────────────────────────────────────────────────────
async def current_user(ci_token: str | None = Cookie(default=None)) -> dict:
    if not ci_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return decode_token(ci_token)


async def require_admin(user: dict = Depends(current_user)) -> dict:
    if user.get("role") not in ("admin", "super_admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin required")
    return user
