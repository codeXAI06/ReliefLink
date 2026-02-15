"""
JWT Authentication for ReliefLink
Handles token creation, validation, and user dependency injection
"""
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel

from .config import get_settings
from .database import get_db
from .logging_config import get_logger

logger = get_logger("auth")

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Bearer token scheme
security = HTTPBearer(auto_error=False)


class TokenData(BaseModel):
    helper_id: int
    name: str
    role: str = "helper"


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    helper: dict


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    settings = get_settings()
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> Optional[TokenData]:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        helper_id = payload.get("sub")
        name = payload.get("name", "")
        role = payload.get("role", "helper")
        if helper_id is None:
            return None
        return TokenData(helper_id=int(helper_id), name=name, role=role)
    except JWTError:
        return None


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[TokenData]:
    """
    Optional auth dependency - returns user if token present, None otherwise.
    Use this for endpoints that work for both authenticated and anonymous users.
    """
    if credentials is None:
        return None
    token_data = decode_token(credentials.credentials)
    if token_data is None:
        return None
    # Verify helper still exists
    from .models import Helper
    helper = db.query(Helper).filter(Helper.id == token_data.helper_id).first()
    if not helper:
        return None
    return token_data


async def require_auth(
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer()),
    db: Session = Depends(get_db)
) -> TokenData:
    """
    Required auth dependency - raises 401 if no valid token.
    Use this for protected endpoints.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token_data = decode_token(credentials.credentials)
    if token_data is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    from .models import Helper
    helper = db.query(Helper).filter(Helper.id == token_data.helper_id).first()
    if not helper:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists",
        )
    return token_data


async def require_admin(
    user: TokenData = Depends(require_auth)
) -> TokenData:
    """Require admin role"""
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user
