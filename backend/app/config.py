from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # ── Domain ──────────────────────────────────────────────────────────────
    base_url: str = "https://combinedintelligence.us"
    api_prefix: str = "/api"

    # ── Security ────────────────────────────────────────────────────────────
    jwt_secret: str                         # strong random string
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7  # 7 days
    cookie_domain: str = "combinedintelligence.us"
    cookie_secure: bool = True
    allowed_origins: list[str] = [
        "https://combinedintelligence.us",
        "https://www.combinedintelligence.us",
    ]

    # ── Google OAuth2 ───────────────────────────────────────────────────────
    google_client_id: str
    google_client_secret: str
    google_redirect_uri: str = "https://combinedintelligence.us/api/auth/google/callback"

    # ── MongoDB ─────────────────────────────────────────────────────────────
    mongo_url: str = "mongodb://localhost:27017"
    mongo_db: str = "combined_intelligence"

    # ── Redis ───────────────────────────────────────────────────────────────
    redis_url: str = "redis://localhost:6379/0"

    # ── Qdrant ──────────────────────────────────────────────────────────────
    qdrant_url: str = "http://localhost:6333"

    # ── Scaleway S3 ─────────────────────────────────────────────────────────
    s3_endpoint_url: str = "https://s3.nl-ams.scw.cloud"
    s3_access_key: str
    s3_secret_key: str
    s3_bucket: str = "combined-intelligence-assets"

    # ── GCP Compute (Ollama VM) ──────────────────────────────────────────────
    gcp_project: str
    gcp_zone: str = "us-central1-a"
    gcp_vm_instance: str = "ci-ollama-inference"

    # ── VAPID (Web Push) ─────────────────────────────────────────────────────
    vapid_private_key: str
    vapid_public_key: str
    vapid_claims_sub: str = "mailto:desk@combinedintelligence.us"

    # ── Ollama (on GCP VM) ───────────────────────────────────────────────────
    ollama_base_url: str = "http://34.0.0.0:11434"  # GCP VM external IP
    ollama_model: str = "deepseek-r1:8b"

    # ── External LLM APIs (optional — used for classification / enrichment) ──
    anthropic_api_key: str | None = None
    anthropic_model: str = "claude-haiku-4-5-20251001"   # cost-efficient for classification
    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"

    # ── Environment ──────────────────────────────────────────────────────────
    environment: str = "production"

    @property
    def is_dev(self) -> bool:
        return self.environment == "development"


@lru_cache
def get_settings() -> Settings:
    return Settings()
