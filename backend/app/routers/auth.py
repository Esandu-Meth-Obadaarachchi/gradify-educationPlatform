import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.config import settings
from app.core.security import create_access_token, get_current_admin

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest):
    # Constant-time comparison against the shared admin credentials in .env.
    correct_user = secrets.compare_digest(payload.username, settings.ADMIN_USERNAME)
    correct_pass = secrets.compare_digest(payload.password, settings.ADMIN_PASSWORD)
    if not (correct_user and correct_pass):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )
    token = create_access_token(subject=payload.username)
    return TokenResponse(access_token=token)


@router.get("/me")
async def me(admin: str = Depends(get_current_admin)):
    """Cheap endpoint the frontend can hit to validate a stored token."""
    return {"username": admin}
