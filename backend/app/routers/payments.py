"""
Payment receipt upload and accounting verification.
"""
import os
import uuid
from datetime import datetime, timezone
from typing import Annotated, Optional

import aiofiles
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.deps import require_roles
from app.models import EnrollmentForm, Payment, Student, User
from app.schemas import PaymentOut
from app.services.notifications import notify_user

router = APIRouter(prefix="/api/payments", tags=["payments"])
settings = get_settings()


def _ensure_upload_dir() -> str:
    path = os.path.abspath(settings.upload_dir)
    os.makedirs(path, exist_ok=True)
    return path


@router.post("/upload", response_model=PaymentOut)
async def upload_receipt(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles("Student"))],
    enrollment_form_id: int = Form(...),
    amount: Optional[str] = Form(None),
    file: UploadFile = File(...),
) -> Payment:
    student = db.query(Student).filter(Student.user_id == user.id).first()
    if not student:
        raise HTTPException(status_code=400, detail="Student profile not found")

    e = (
        db.query(EnrollmentForm)
        .filter(
            EnrollmentForm.id == enrollment_form_id,
            EnrollmentForm.student_id == student.id,
        )
        .first()
    )
    if not e:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    if e.phase2_assigned_role != "Accounting":
        raise HTTPException(status_code=400, detail="Payment upload applies to returning students only.")
    if e.phase2_status != "Pending":
        raise HTTPException(status_code=400, detail="Enrollment is not awaiting payment verification.")

    content = await file.read()
    max_bytes = settings.max_upload_mb * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(status_code=400, detail=f"File exceeds {settings.max_upload_mb} MB")

    ext = os.path.splitext(file.filename or "")[1].lower() or ".bin"
    if ext not in (".jpg", ".jpeg", ".png", ".pdf", ".webp"):
        raise HTTPException(status_code=400, detail="Allowed: jpg, png, webp, pdf")

    uid = uuid.uuid4().hex
    fname = f"rcp_{enrollment_form_id}_{uid}{ext}"
    base = _ensure_upload_dir()
    fpath = os.path.join(base, fname)
    async with aiofiles.open(fpath, "wb") as out:
        await out.write(content)

    from decimal import Decimal

    amt: Optional[Decimal] = None
    if amount:
        try:
            amt = Decimal(amount)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid amount")

    p = Payment(
        enrollment_form_id=e.id,
        amount=amt,
        receipt_file_path=fname,
        original_filename=file.filename,
        status="Pending",
    )
    db.add(p)
    db.commit()
    db.refresh(p)

    notify_user(
        db,
        user.id,
        "Payment receipt uploaded",
        "Your receipt was received and is pending Accounting verification.",
        notification_type="info",
        related_enrollment_id=e.id,
    )
    return p


@router.post("/{payment_id}/verify", response_model=PaymentOut)
def verify_payment(
    payment_id: int,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles("Accounting", "Admin"))],
    status_value: str = Form(..., description="Approved or Rejected"),
    notes: Optional[str] = Form(None),
) -> Payment:
    if status_value not in ("Approved", "Rejected"):
        raise HTTPException(status_code=400, detail="status must be Approved or Rejected")
    p = db.query(Payment).filter(Payment.id == payment_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Payment not found")
    e = db.query(EnrollmentForm).filter(EnrollmentForm.id == p.enrollment_form_id).first()
    if not e or e.phase2_assigned_role != "Accounting":
        raise HTTPException(status_code=400, detail="Invalid enrollment for this payment")

    now = datetime.now(timezone.utc)
    p.status = status_value
    p.verified_by_user_id = user.id
    p.verified_at = now
    p.notes = notes
    db.commit()
    db.refresh(p)

    student = db.query(Student).filter(Student.id == e.student_id).first()
    stu_user = db.query(User).filter(User.id == student.user_id).first() if student else None
    if stu_user:
        notify_user(
            db,
            stu_user.id,
            f"Payment {status_value}",
            notes or "Your payment receipt was reviewed.",
            notification_type="success" if status_value == "Approved" else "warning",
            related_enrollment_id=e.id,
        )
    return p


@router.get("/pending", response_model=list[PaymentOut])
def list_pending(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles("Accounting", "Admin"))],
) -> list[Payment]:
    """Receipts awaiting accounting verification."""
    return (
        db.query(Payment)
        .filter(Payment.status == "Pending")
        .order_by(Payment.uploaded_at.asc())
        .all()
    )


@router.get("/enrollment/{enrollment_id}", response_model=list[PaymentOut])
def list_for_enrollment(
    enrollment_id: int,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles("Student", "Accounting", "Admin"))],
) -> list[Payment]:
    e = db.query(EnrollmentForm).filter(EnrollmentForm.id == enrollment_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Not found")
    role = user.role.name if user.role else ""
    if role == "Student":
        st = db.query(Student).filter(Student.user_id == user.id).first()
        if not st or e.student_id != st.id:
            raise HTTPException(status_code=403, detail="Forbidden")
    return db.query(Payment).filter(Payment.enrollment_form_id == enrollment_id).all()
