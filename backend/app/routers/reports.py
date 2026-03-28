"""
Basic analytics — admin dashboard.
"""
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_roles
from app.models import EnrollmentForm, User
from app.schemas import ReportSummary

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("/summary", response_model=ReportSummary)
def summary(
    db: Annotated[Session, Depends(get_db)],
    _: Annotated[User, Depends(require_roles("Admin"))],
) -> ReportSummary:
    total = db.query(func.count(EnrollmentForm.id)).scalar() or 0
    by_phase: dict = {}
    for ph in (1, 2, 3):
        c = db.query(func.count(EnrollmentForm.id)).filter(EnrollmentForm.current_phase == ph).scalar() or 0
        by_phase[str(ph)] = c
    by_status = {
        "phase1_approved": db.query(func.count(EnrollmentForm.id))
        .filter(EnrollmentForm.phase1_status == "Approved")
        .scalar()
        or 0,
        "phase2_approved": db.query(func.count(EnrollmentForm.id))
        .filter(EnrollmentForm.phase2_status == "Approved")
        .scalar()
        or 0,
        "phase3_approved": db.query(func.count(EnrollmentForm.id))
        .filter(EnrollmentForm.phase3_status == "Approved")
        .scalar()
        or 0,
        "rejected_any": db.query(func.count(EnrollmentForm.id))
        .filter(
            (EnrollmentForm.phase2_status == "Rejected")
            | (EnrollmentForm.phase3_status == "Rejected")
        )
        .scalar()
        or 0,
    }
    return ReportSummary(total_enrollments=int(total), by_phase=by_phase, by_status=by_status)
