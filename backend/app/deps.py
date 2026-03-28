"""
FastAPI dependencies: DB session, current user, RBAC.
"""
from typing import Annotated, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import User
from app.security import safe_decode_token

security_bearer = HTTPBearer(auto_error=False)


def get_current_user_optional(
    db: Annotated[Session, Depends(get_db)],
    creds: Annotated[Optional[HTTPAuthorizationCredentials], Depends(security_bearer)],
) -> Optional[User]:
    if not creds or not creds.credentials:
        return None
    payload = safe_decode_token(creds.credentials)
    if not payload or "sub" not in payload:
        return None
    uid = int(payload["sub"])
    user = (
        db.query(User)
        .options(joinedload(User.role))
        .filter(User.id == uid, User.is_active.is_(True))
        .first()
    )
    return user


def get_current_user(
    user: Annotated[Optional[User], Depends(get_current_user_optional)],
) -> User:
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def require_roles(*allowed_role_names: str):
    """Factory: dependency that ensures user role is one of allowed_role_names."""

    def _inner(user: Annotated[User, Depends(get_current_user)]) -> User:
        name = user.role.name if user.role else ""
        if name not in allowed_role_names:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user

    return _inner
