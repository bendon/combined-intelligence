"""Scaleway S3 / Object Storage client.

Every object the app stores is placed under ``settings.s3_prefix`` so a single
bucket can be shared safely with other workloads. Callers pass the *logical*
key (for example ``reports/<slug>/report.pdf``) and the prefix is added here.
"""

from __future__ import annotations

import logging
from urllib.parse import quote

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from app.config import get_settings

log = logging.getLogger(__name__)
settings = get_settings()

_client = None


def _s3():
    global _client
    if _client is None:
        _client = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint_url,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
            region_name=settings.s3_region,
            config=Config(signature_version="s3v4"),
        )
    return _client


def _full_key(key: str) -> str:
    """Prepend the configured prefix to a logical key.

    Idempotent — re-applying the prefix to an already-prefixed key is a no-op.
    """
    prefix = (settings.s3_prefix or "").strip("/")
    cleaned = (key or "").lstrip("/")
    if not prefix:
        return cleaned
    if cleaned == prefix or cleaned.startswith(prefix + "/"):
        return cleaned
    return f"{prefix}/{cleaned}"


def public_url(key: str) -> str:
    """Build the canonical public URL for a (possibly already-prefixed) key."""
    return f"{settings.s3_endpoint_url}/{settings.s3_bucket}/{quote(_full_key(key))}"


def ensure_prefix_exists() -> None:
    """Best-effort: drop a zero-byte ``<prefix>/`` placeholder so the prefix
    shows up as a folder in object browsers. Silently no-ops if the prefix is
    empty or the bucket isn't reachable yet (we don't want a missing remote
    bucket to crash startup in local-dev)."""
    prefix = (settings.s3_prefix or "").strip("/")
    if not prefix:
        return
    placeholder = f"{prefix}/"
    try:
        try:
            _s3().head_object(Bucket=settings.s3_bucket, Key=placeholder)
            return
        except ClientError as exc:
            code = exc.response.get("Error", {}).get("Code")
            if code not in ("404", "NoSuchKey", "NotFound"):
                raise
        _s3().put_object(
            Bucket=settings.s3_bucket,
            Key=placeholder,
            Body=b"",
            ContentType="application/x-directory",
        )
        log.info("Created S3 prefix s3://%s/%s", settings.s3_bucket, placeholder)
    except Exception as exc:  # noqa: BLE001 — best-effort
        log.warning("Could not ensure S3 prefix %r exists: %s", placeholder, exc)


def upload_fileobj(
    fileobj,
    key: str,
    content_type: str = "application/octet-stream",
    public: bool = False,
) -> str:
    """Upload a file-like object to S3 under the configured prefix.

    Returns the full key (including prefix) so callers can persist it.
    """
    extra: dict = {"ContentType": content_type}
    if public:
        extra["ACL"] = "public-read"

    full_key = _full_key(key)
    _s3().upload_fileobj(fileobj, settings.s3_bucket, full_key, ExtraArgs=extra)
    return full_key


def get_presigned_url(key: str, expires: int = 3600) -> str:
    return _s3().generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.s3_bucket, "Key": _full_key(key)},
        ExpiresIn=expires,
    )


def delete_object(key: str) -> None:
    _s3().delete_object(Bucket=settings.s3_bucket, Key=_full_key(key))
