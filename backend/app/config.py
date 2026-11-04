from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://factfulness:factfulness@localhost:5432/factfulness"
    api_prefix: str = "/v1"
    cors_origins: str = "*"

    # Auth: dev | supabase
    auth_mode: str = "dev"
    supabase_url: str = ""
    supabase_jwt_secret: str = ""
    dev_user_external_id: str = "dev-local-user"
    dev_user_display_name: str = "dev"

    report_auto_hide_threshold: int = 3


settings = Settings()
