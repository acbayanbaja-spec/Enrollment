"""
Cut-off date enforcement per phase.
"""
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.models import CutOffDate


def is_phase_open(db: Session, phase: int) -> tuple[bool, str]:
    """Return (allowed, message)."""
    now = datetime.now(timezone.utc)
    row = (
        db.query(CutOffDate)
        .filter(CutOffDate.phase == phase, CutOffDate.is_active.is_(True))
        .order_by(CutOffDate.id.desc())
        .first()
    )
    if not row:
        return True, "No cut-off configured — submission allowed."
    if now < row.starts_at:
        return False, f"{row.label} opens at {row.starts_at.isoformat()}."
    if now > row.ends_at:
        return False, f"{row.label} closed at {row.ends_at.isoformat()}."
    return True, f"{row.label} is open."
