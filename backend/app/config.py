from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://factfulness:factfulness@localhost:5432/factfulness"
    api_prefix: str = "/v1"
    cors_origins: str = "*"

    auth_mode: str = "dev"
    supabase_url: str = ""
    supabase_jwt_secret: str = ""
    dev_user_external_id: str = "dev-local-user"
    dev_user_display_name: str = "dev"

    report_auto_hide_threshold: int = 3

    # Object storage: memory | filesystem | s3 (R2 / MinIO)
    storage_backend: str = "memory"
    filesystem_storage_root: str = "/tmp/factfulness-storage"
    s3_endpoint_url: str = ""
    s3_access_key_id: str = ""
    s3_secret_access_key: str = ""
    s3_region: str = "auto"
    s3_quarantine_bucket: str = "factfulness-quarantine"
    s3_clean_bucket: str = "factfulness-evidence"
    presigned_upload_ttl_seconds: int = 900
    presigned_download_ttl_seconds: int = 900
    max_evidence_file_bytes: int = 10_485_760

    # Scanner: fake | always_clean | clamd
    scanner_backend: str = "fake"
    clamav_host: str = "localhost"
    clamav_port: int = 3310

    # Rate limits (mirror mobile/src/config/rateLimits.ts)
    rate_vote_per_user_per_minute: int = 30
    rate_trust_per_user_per_minute: int = 60
    rate_comment_per_user_per_minute: int = 20
    rate_topic_create_per_user_per_hour: int = 5
    rate_claim_create_per_user_per_hour: int = 20
    rate_evidence_create_per_user_per_hour: int = 30
    rate_file_upload_per_user_per_hour: int = 30


settings = Settings()
