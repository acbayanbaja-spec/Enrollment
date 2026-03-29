"""
Authentication: login, JWT issuance, admin user registration.
"""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.deps import get_current_user, require_roles
from app.models import Role, Student, User
from app.schemas import LoginRequest, StudentSelfRegisterRequest, TokenResponse, UserCreate, UserOut
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _user_out(u: User) -> UserOut:
    return UserOut(
        id=u.id,
        email=u.email,
        full_name=u.full_name,
        role_name=u.role.name if u.role else "",
    )


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Annotated[Session, Depends(get_db)]) -> TokenResponse:
    email = body.email.lower().strip()
    stmt = select(User).options(joinedload(User.role)).where(User.email == email).limit(1)
    user = db.execute(stmt).unique().scalar_one_or_none()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")
    token = create_access_token(
        user.id,
        extra_claims={"role": user.role.name if user.role else ""},
    )
    return TokenResponse(access_token=token, user=_user_out(user))


@router.post("/register-student", response_model=TokenResponse)
def register_student(
    body: StudentSelfRegisterRequest, db: Annotated[Session, Depends(get_db)]
) -> TokenResponse:
    """Create a student account and return a JWT (same as login). Requires institutional email."""
    email = body.email.lower().strip()
    existing = db.scalars(select(User).where(User.email == email).limit(1)).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    role = db.query(Role).filter(Role.name == "Student").first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Student role is not configured. Run database schema and seed.",
        )
    u = User(
        email=email,
        password_hash=hash_password(body.password),
        full_name=body.full_name.strip(),
        role_id=role.id,
    )
    db.add(u)
    db.flush()
    db.add(Student(user_id=u.id))
    db.commit()
    user = db.scalars(
        select(User).options(joinedload(User.role)).where(User.id == u.id).limit(1)
    ).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Registration failed")
    token = create_access_token(
        user.id,
        extra_claims={"role": user.role.name if user.role else ""},
    )
    return TokenResponse(access_token=token, user=_user_out(user))


@router.get("/me", response_model=UserOut)
def me(user: Annotated[User, Depends(get_current_user)]) -> UserOut:
    return _user_out(user)


@router.post("/register", response_model=UserOut)
def register_user(
    body: UserCreate,
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles("Admin"))],
) -> UserOut:
    """Create a staff or student account (Admin only)."""
    if db.query(User).filter(User.email == body.email.lower().strip()).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    role = db.query(Role).filter(Role.name == body.role_name).first()
    if not role:
        raise HTTPException(status_code=400, detail="Invalid role")
    u = User(
        email=body.email.lower().strip(),
        password_hash=hash_password(body.password),
        full_name=body.full_name.strip(),
        role_id=role.id,
    )
    db.add(u)
    db.flush()
    if role.name == "Student":
        from app.models import Student

        db.add(Student(user_id=u.id))
    db.commit()
    user = (
        db.query(User).options(joinedload(User.role)).filter(User.id == u.id).first()
    )
    assert user is not None
    return _user_out(user)
