from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/  (config.py -> core -> app -> backend)
BASE_DIR = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- Database ---
    DATABASE_URL: str

    # --- Auth (admin) ---
    SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 480
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "admin123"

    # --- Google Cloud Storage (file storage) ---
    GCS_BUCKET: str | None = None
    GCS_KEY_PATH: str | None = None  # path to the service-account JSON key

    # --- AI / email (later phases) ---
    GEMINI_API_KEY: str | None = None
    RESEND_API_KEY: str | None = None

    # --- Frontend ---
    FRONTEND_URL: str = "http://localhost:5173"

    @property
    def gcs_key_abs(self) -> str | None:
        """Absolute path to the GCS key (relative paths resolve under backend/)."""
        if not self.GCS_KEY_PATH:
            return None
        p = Path(self.GCS_KEY_PATH)
        return str(p if p.is_absolute() else (BASE_DIR / p))

    @property
    def gcs_configured(self) -> bool:
        key = self.gcs_key_abs
        return bool(self.GCS_BUCKET and key and Path(key).exists())


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
