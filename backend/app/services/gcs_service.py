"""Google Cloud Storage upload helpers.

All file uploads go through the backend (never directly from the browser).
If GCS is not configured in .env, ``upload_image`` raises ``StorageNotConfigured``
so callers can return a clean 503.
"""

import uuid
from functools import lru_cache

from google.cloud import storage

from app.core.config import settings


class StorageNotConfigured(RuntimeError):
    pass


_EXT_BY_TYPE = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
}


@lru_cache
def _get_bucket():
    if not settings.gcs_configured:
        raise StorageNotConfigured(
            "Google Cloud Storage is not configured. Set GCS_BUCKET and "
            "GCS_KEY_PATH (path to the service-account JSON) in backend/.env."
        )
    client = storage.Client.from_service_account_json(settings.gcs_key_abs)
    return client.bucket(settings.GCS_BUCKET)


def upload_file(
    file_bytes: bytes,
    content_type: str,
    folder: str = "gradify",
    ext: str = "",
) -> str:
    """Upload bytes to GCS and return the public URL."""
    bucket = _get_bucket()
    name = f"{folder}/{uuid.uuid4().hex}{ext}"
    blob = bucket.blob(name)
    blob.upload_from_string(file_bytes, content_type=content_type)
    return blob.public_url


def upload_image(file_bytes: bytes, content_type: str, folder: str = "questions") -> str:
    ext = _EXT_BY_TYPE.get(content_type, "")
    return upload_file(file_bytes, content_type, folder=folder, ext=ext)
