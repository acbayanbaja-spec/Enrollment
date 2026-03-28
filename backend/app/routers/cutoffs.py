"""
Public cut-off windows for each phase.
"""
from typing import Annotated, List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import CutOffDate, User

router = APIRouter(prefix="/api/cutoffs", tags=["cutoffs"])


@router.get("/")
def list_cutoffs(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(get_current_user)],
) -> List[dict]:
    rows = db.query(CutOffDate).filter(CutOffDate.is_active.is_(True)).order_by(CutOffDate.phase).all()
    return [
        {
            "id": r.id,
            "label": r.label,
            "phase": r.phase,
            "starts_at": r.starts_at.isoformat(),
            "ends_at": r.ends_at.isoformat(),
        }
        for r in rows
    ]
