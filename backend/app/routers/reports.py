"""
Basic analytics — admin dashboard.
"""
from calendar import month_abbr
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import extract, func
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_roles
from app.models import Course, EnrollmentForm, User
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

    # By department (via course)
    dept_rows = (
        db.query(Course.department, func.count(EnrollmentForm.id))
        .join(EnrollmentForm, EnrollmentForm.course_id == Course.id)
        .group_by(Course.department)
        .all()
    )
    by_department = [
        {"name": (d[0] or "Unassigned"), "count": int(d[1])}
        for d in sorted(dept_rows, key=lambda x: -x[1])
    ]

    # Last 6 months trend (by created_at month), ending current month
    now = datetime.now(timezone.utc)

    def prev_month(y: int, m: int, months_back: int) -> tuple[int, int]:
        mm = m - months_back
        yy = y
        while mm < 1:
            mm += 12
            yy -= 1
        return yy, mm

    trend: list[dict] = []
    for i in range(5, -1, -1):
        y, m = prev_month(now.year, now.month, i)
        cnt = (
            db.query(func.count(EnrollmentForm.id))
            .filter(
                extract("year", EnrollmentForm.created_at) == y,
                extract("month", EnrollmentForm.created_at) == m,
            )
            .scalar()
            or 0
        )
        label = f"{month_abbr[m]} {y}"
        trend.append({"label": label, "count": int(cnt)})

    submitted = (
        db.query(func.count(EnrollmentForm.id)).filter(EnrollmentForm.submitted_at.isnot(None)).scalar() or 0
    )
    fully = (
        db.query(func.count(EnrollmentForm.id))
        .filter(
            EnrollmentForm.phase1_status == "Approved",
            EnrollmentForm.phase2_status == "Approved",
            EnrollmentForm.phase3_status == "Approved",
        )
        .scalar()
        or 0
    )
    funnel = {
        "applications_submitted": int(submitted),
        "phase2_cleared": int(by_status["phase2_approved"]),
        "fully_enrolled": int(fully),
    }

    return ReportSummary(
        total_enrollments=int(total),
        by_phase=by_phase,
        by_status=by_status,
        by_department=by_department,
        trend=trend,
        funnel=funnel,
    )
