"""
Announcements panel — admin creates; all authenticated users can read.
"""
from datetime import datetime, timezone
from typing import Annotated, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_roles
from app.models import Announcement, User
from app.schemas import AnnouncementCreate, AnnouncementOut

router = APIRouter(prefix="/api/announcements", tags=["announcements"])


@router.get("/", response_model=List[AnnouncementOut])
def list_announcements(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> List[Announcement]:
    now = datetime.now(timezone.utc)
    rows = (
        db.query(Announcement)
        .filter((Announcement.expires_at.is_(None)) | (Announcement.expires_at > now))
        .order_by(Announcement.id.desc())
        .limit(50)
        .all()
    )
    return rows


@router.post("/", response_model=AnnouncementOut)
def create_announcement(
    body: AnnouncementCreate,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles("Admin"))],
) -> Announcement:
    a = Announcement(
        title=body.title.strip(),
        body=body.body.strip(),
        priority=body.priority,
        created_by_user_id=user.id,
        expires_at=body.expires_at,
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


@router.delete("/{announcement_id}")
def delete_announcement(
    announcement_id: int,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles("Admin"))],
) -> dict:
    a = db.query(Announcement).filter(Announcement.id == announcement_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(a)
    db.commit()
    return {"ok": True}
