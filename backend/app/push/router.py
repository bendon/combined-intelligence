import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.database import get_db
from app.auth.jwt import current_user, require_admin
from app.push.tasks import send_push
from app.config import get_settings

settings = get_settings()
router = APIRouter()


class SubscriptionKeys(BaseModel):
    p256dh: str
    auth: str


class PushSubscription(BaseModel):
    endpoint: str
    keys: SubscriptionKeys


class BroadcastPayload(BaseModel):
    title: str
    body: str
    url: str = "/"
    icon: str = "/icon-192.png"


@router.get("/vapid-public-key")
async def vapid_public_key():
    """Return the VAPID public key so the frontend can subscribe."""
    return {"publicKey": settings.vapid_public_key}


@router.post("/subscribe", status_code=201)
async def subscribe(
    sub: PushSubscription,
    user: dict = Depends(current_user),
):
    """Save or refresh a push subscription for the current user."""
    db = get_db()
    from datetime import datetime, timezone
    doc = {
        "endpoint": sub.endpoint,
        "keys": sub.keys.model_dump(),
        "user_id": user["sub"],
        "email": user["email"],
        "updated_at": datetime.now(timezone.utc),
    }
    await db.push_subscriptions.update_one(
        {"endpoint": sub.endpoint},
        {"$set": doc},
        upsert=True,
    )
    return {"ok": True}


@router.delete("/unsubscribe")
async def unsubscribe(endpoint: str, user: dict = Depends(current_user)):
    db = get_db()
    await db.push_subscriptions.delete_one({"endpoint": endpoint, "user_id": user["sub"]})
    return {"ok": True}


@router.post("/broadcast")
async def broadcast(payload: BroadcastPayload, user: dict = Depends(require_admin)):
    """Fan-out a notification to all active subscribers."""
    db = get_db()
    count = 0
    async for sub in db.push_subscriptions.find({}):
        subscription_info = {"endpoint": sub["endpoint"], "keys": sub["keys"]}
        send_push.apply_async(
            args=[subscription_info, payload.model_dump()],
            queue="push",
        )
        count += 1
    return {"ok": True, "queued": count}


@router.post("/notify-report/{slug}")
async def notify_report(slug: str, user: dict = Depends(require_admin)):
    """Push a 'new report' notification to all subscribers."""
    db = get_db()
    report = await db.reports.find_one({"slug": slug})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    payload = {
        "title": "New Report Published",
        "body": report["title"],
        "url": f"/reports/{slug}",
        "icon": report.get("og_image_url") or "/icon-192.png",
    }

    count = 0
    async for sub in db.push_subscriptions.find({}):
        send_push.apply_async(
            args=[{"endpoint": sub["endpoint"], "keys": sub["keys"]}, payload],
            queue="push",
        )
        count += 1

    return {"ok": True, "queued": count, "report": slug}
