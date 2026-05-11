import boto3
from botocore.config import Config
from app.config import get_settings

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
            region_name="nl-ams",
            config=Config(signature_version="s3v4"),
        )
    return _client


def upload_fileobj(
    fileobj,
    key: str,
    content_type: str = "application/octet-stream",
    public: bool = False,
) -> str:
    extra: dict = {"ContentType": content_type}
    if public:
        extra["ACL"] = "public-read"

    _s3().upload_fileobj(fileobj, settings.s3_bucket, key, ExtraArgs=extra)
    return key


def get_presigned_url(key: str, expires: int = 3600) -> str:
    return _s3().generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.s3_bucket, "Key": key},
        ExpiresIn=expires,
    )


def delete_object(key: str) -> None:
    _s3().delete_object(Bucket=settings.s3_bucket, Key=key)
