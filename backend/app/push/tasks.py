"""Celery task — send a Web Push notification to a single subscription."""
from celery import shared_task
from celery.utils.log import get_task_logger
from pywebpush import webpush, WebPushException
import json

from celery_app import celery
from app.config import get_settings

log = get_task_logger(__name__)
settings = get_settings()


@celery.task(bind=True, name="app.push.tasks.send_push", queue="push",
             max_retries=3, default_retry_delay=30)
def send_push(self, subscription: dict, payload: dict) -> None:
    """
    subscription: {endpoint, keys: {p256dh, auth}}
    payload:      {title, body, url, icon}
    """
    try:
        webpush(
            subscription_info=subscription,
            data=json.dumps(payload),
            vapid_private_key=settings.vapid_private_key,
            vapid_claims={
                "sub": settings.vapid_claims_sub,
            },
        )
        log.info("Push sent to %s", subscription["endpoint"][:60])
    except WebPushException as exc:
        status = exc.response.status_code if exc.response else None
        if status in (404, 410):
            # Subscription gone — remove from DB
            _remove_subscription(subscription["endpoint"])
            log.info("Removed expired subscription: %s", subscription["endpoint"][:60])
            return
        log.warning("Push failed (%s): %s", status, exc)
        raise self.retry(exc=exc)


def _remove_subscription(endpoint: str) -> None:
    from pymongo import MongoClient
    client = MongoClient(settings.mongo_url)
    db = client[settings.mongo_db]
    db.push_subscriptions.delete_one({"endpoint": endpoint})
