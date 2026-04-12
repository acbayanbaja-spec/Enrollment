"""
Enrollment forms, phase workflow, and staff queues.
"""
from datetime import datetime, timezone
from typing import Annotated, Any, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.deps import get_current_user, require_roles
from app.models import (
    Approval,
    Course,
    EnrollmentAcademic,
    EnrollmentEmergency,
    EnrollmentFamily,
    EnrollmentForm,
    EnrollmentPersonal,
    EnrollmentTransfer,
    Payment,
    Student,
    User,
)
from app.schemas import (
    AccountingPhaseApprove,
    EnrollmentDraftCreate,
    EnrollmentSubmitResponse,
    PhaseDecision,
)
from app.services.cutoff import is_phase_open
from app.services.notifications import notify_role_users, notify_user

router = APIRouter(prefix="/api/enrollment", tags=["enrollment"])


def _phase2_role_for_category(category: str) -> str:
    return "Registrar" if category in ("New", "Transfer") else "Accounting"


def _serialize_enrollment(e: EnrollmentForm) -> dict[str, Any]:
    c = e.course
    out: dict[str, Any] = {
        "id": e.id,
        "course_id": e.course_id,
        "course_code": c.code if c else None,
        "course_department": c.department if c else None,
        "academic_year": e.academic_year,
        "semester": e.semester,
        "category": e.category,
        "current_phase": e.current_phase,
        "phase1_status": e.phase1_status,
        "phase2_status": e.phase2_status,
        "phase3_status": e.phase3_status,
        "phase2_assigned_role": e.phase2_assigned_role,
        "submitted_at": e.submitted_at,
    }
    if e.personal:
        p = e.personal
        out["personal"] = {
            "last_name": p.last_name,
            "first_name": p.first_name,
            "middle_name": p.middle_name,
            "extension": p.extension,
            "sex": p.sex,
            "date_of_birth": p.date_of_birth.isoformat(),
            "birthplace": p.birthplace,
            "civil_status": p.civil_status,
            "citizenship": p.citizenship,
            "contact_number": p.contact_number,
            "email": p.email,
            "permanent_address": p.permanent_address,
            "current_address": p.current_address,
        }
    if e.family:
        f = e.family
        out["family"] = {
            "father_name": f.father_name,
            "father_occupation": f.father_occupation,
            "father_contact": f.father_contact,
            "mother_name": f.mother_name,
            "mother_occupation": f.mother_occupation,
            "mother_contact": f.mother_contact,
            "spouse_name": f.spouse_name,
            "spouse_occupation": f.spouse_occupation,
            "spouse_contact": f.spouse_contact,
        }
    if e.transfer and e.category == "Transfer":
        t = e.transfer
        out["transfer"] = {
            "current_school": t.current_school,
            "current_program": t.current_program,
            "last_semester_attended": t.last_semester_attended,
            "previous_course_code": t.previous_course_code,
            "units_completed": t.units_completed,
            "reason_for_transfer": t.reason_for_transfer,
        }
    if e.academic and e.category == "New":
        a = e.academic
        out["academic"] = {
            "elem_school": a.elem_school,
            "elem_year": a.elem_year,
            "jhs_school": a.jhs_school,
            "jhs_year": a.jhs_year,
            "shs_school": a.shs_school,
            "shs_strand": a.shs_strand,
            "shs_year": a.shs_year,
        }
    if e.emergency:
        x = e.emergency
        out["emergency"] = {
            "name": x.name,
            "contact": x.contact,
            "relationship": x.relationship,
            "address": x.address,
        }
    return out


def _get_student(db: Session, user: User) -> Student:
    st = db.query(Student).filter(Student.user_id == user.id).first()
    if not st:
        raise HTTPException(status_code=400, detail="Student profile not found. Contact admin.")
    return st


def _apply_personal(e: EnrollmentForm, body: EnrollmentDraftCreate, db: Session) -> None:
    p = body.personal
    row = db.query(EnrollmentPersonal).filter(EnrollmentPersonal.enrollment_form_id == e.id).first()
    if not row:
        row = EnrollmentPersonal(enrollment_form_id=e.id)
        db.add(row)
    row.last_name = p.last_name
    row.first_name = p.first_name
    row.middle_name = p.middle_name
    row.extension = p.extension
    row.sex = p.sex
    row.date_of_birth = p.date_of_birth
    row.birthplace = p.birthplace
    row.civil_status = p.civil_status
    row.citizenship = p.citizenship
    row.contact_number = p.contact_number
    row.email = str(p.email)
    row.permanent_address = p.permanent_address
    row.current_address = p.current_address


def _apply_family(e: EnrollmentForm, body: EnrollmentDraftCreate, db: Session) -> None:
    f = body.family
    row = db.query(EnrollmentFamily).filter(EnrollmentFamily.enrollment_form_id == e.id).first()
    if not row:
        row = EnrollmentFamily(enrollment_form_id=e.id)
        db.add(row)
    row.father_name = f.father_name
    row.father_occupation = f.father_occupation
    row.father_contact = f.father_contact
    row.mother_name = f.mother_name
    row.mother_occupation = f.mother_occupation
    row.mother_contact = f.mother_contact
    row.spouse_name = f.spouse_name
    row.spouse_occupation = f.spouse_occupation
    row.spouse_contact = f.spouse_contact


def _apply_academic(e: EnrollmentForm, body: EnrollmentDraftCreate, db: Session) -> None:
    """New students store K–12 background; returning and transfer students have no academic row."""
    row = db.query(EnrollmentAcademic).filter(EnrollmentAcademic.enrollment_form_id == e.id).first()
    if body.category != "New":
        if row:
            db.delete(row)
        return
    if not body.academic:
        return  # draft: allow saving before academic section is filled
    a = body.academic
    if not row:
        row = EnrollmentAcademic(enrollment_form_id=e.id)
        db.add(row)
    row.elem_school = a.elem_school
    row.elem_year = a.elem_year
    row.jhs_school = a.jhs_school
    row.jhs_year = a.jhs_year
    row.shs_school = a.shs_school
    row.shs_strand = a.shs_strand
    row.shs_year = a.shs_year


def _apply_transfer(e: EnrollmentForm, body: EnrollmentDraftCreate, db: Session) -> None:
    row = db.query(EnrollmentTransfer).filter(EnrollmentTransfer.enrollment_form_id == e.id).first()
    if body.category != "Transfer":
        if row:
            db.delete(row)
        return
    if not body.transfer:
        return
    t = body.transfer
    if not row:
        row = EnrollmentTransfer(enrollment_form_id=e.id)
        db.add(row)
    row.current_school = t.current_school
    row.current_program = t.current_program
    row.last_semester_attended = t.last_semester_attended
    row.previous_course_code = t.previous_course_code
    row.units_completed = t.units_completed
    row.reason_for_transfer = t.reason_for_transfer


def _apply_emergency(e: EnrollmentForm, body: EnrollmentDraftCreate, db: Session) -> None:
    x = body.emergency
    row = db.query(EnrollmentEmergency).filter(EnrollmentEmergency.enrollment_form_id == e.id).first()
    if not row:
        row = EnrollmentEmergency(enrollment_form_id=e.id)
        db.add(row)
    row.name = x.name
    row.contact = x.contact
    row.relationship = x.relationship
    row.address = x.address


@router.post("/save", response_model=EnrollmentSubmitResponse)
def save_enrollment(
    body: EnrollmentDraftCreate,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles("Student"))],
) -> EnrollmentSubmitResponse:
    """Save draft or submit enrollment form (phase 1)."""
    student = _get_student(db, user)
    course = db.query(Course).filter(Course.id == body.course_id, Course.is_active.is_(True)).first()
    if not course:
        raise HTTPException(status_code=400, detail="Invalid course")

    e: EnrollmentForm | None = None
    if body.enrollment_id:
        e = (
            db.query(EnrollmentForm)
            .filter(EnrollmentForm.id == body.enrollment_id, EnrollmentForm.student_id == student.id)
            .first()
        )
        if not e:
            raise HTTPException(status_code=404, detail="Enrollment not found")

    if e is None:
        e = EnrollmentForm(
            student_id=student.id,
            course_id=body.course_id,
            academic_year=body.academic_year.strip(),
            semester=body.semester.strip(),
            category=body.category,
            current_phase=1,
            phase1_status="Pending",
            phase2_status="Pending",
            phase3_status="Pending",
            phase2_assigned_role=_phase2_role_for_category(body.category),
        )
        db.add(e)
        db.flush()

    e.course_id = body.course_id
    e.academic_year = body.academic_year.strip()
    e.semester = body.semester.strip()
    e.category = body.category
    e.phase2_assigned_role = _phase2_role_for_category(body.category)

    _apply_personal(e, body, db)
    _apply_family(e, body, db)
    _apply_academic(e, body, db)
    _apply_transfer(e, body, db)
    _apply_emergency(e, body, db)

    if body.submit:
        if body.category == "New" and not body.academic:
            raise HTTPException(
                status_code=400,
                detail="Academic background is required before submitting as a new student.",
            )
        if body.category == "Transfer" and not body.transfer:
            raise HTTPException(
                status_code=400,
                detail="Transfer information (current school, previous program) is required before submitting.",
            )
        ok, msg = is_phase_open(db, 1)
        if not ok:
            raise HTTPException(status_code=400, detail=msg)
        now = datetime.now(timezone.utc)
        e.submitted_at = now
        e.phase1_status = "Approved"
        e.current_phase = 2
        e.phase2_status = "Pending"
        e.updated_at = now

        db.add(
            Approval(
                enrollment_form_id=e.id,
                phase=1,
                actor_role="System",
                status="Approved",
                notes="Enrollment form submitted",
                decided_at=now,
            )
        )

        role_target = e.phase2_assigned_role
        notify_role_users(
            db,
            role_target,
            "New enrollment pending verification",
            f"Student application #{e.id} awaits {role_target} action.",
            related_enrollment_id=e.id,
        )
        stu_user = db.query(User).filter(User.id == student.user_id).first()
        if stu_user:
            notify_user(
                db,
                stu_user.id,
                "Enrollment submitted",
                "Your enrollment form was submitted. Await phase 2 verification.",
                notification_type="success",
                related_enrollment_id=e.id,
            )
    else:
        e.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(e)
    return EnrollmentSubmitResponse(
        id=e.id,
        message="Submitted successfully." if body.submit else "Draft saved.",
        current_phase=e.current_phase,
        phase1_status=e.phase1_status,
        phase2_status=e.phase2_status,
        phase3_status=e.phase3_status,
    )


@router.get("/mine", response_model=List[dict])
def list_mine(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles("Student"))],
) -> List[dict]:
    student = _get_student(db, user)
    rows = (
        db.query(EnrollmentForm)
        .options(
            joinedload(EnrollmentForm.course),
            joinedload(EnrollmentForm.personal),
            joinedload(EnrollmentForm.family),
            joinedload(EnrollmentForm.academic),
            joinedload(EnrollmentForm.transfer),
            joinedload(EnrollmentForm.emergency),
        )
        .filter(EnrollmentForm.student_id == student.id)
        .order_by(EnrollmentForm.id.desc())
        .all()
    )
    return [_serialize_enrollment(r) for r in rows]


@router.get("/{enrollment_id}", response_model=dict)
def get_one(
    enrollment_id: int,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    e = (
        db.query(EnrollmentForm)
        .options(
            joinedload(EnrollmentForm.course),
            joinedload(EnrollmentForm.personal),
            joinedload(EnrollmentForm.family),
            joinedload(EnrollmentForm.academic),
            joinedload(EnrollmentForm.transfer),
            joinedload(EnrollmentForm.emergency),
        )
        .filter(EnrollmentForm.id == enrollment_id)
        .first()
    )
    if not e:
        raise HTTPException(status_code=404, detail="Not found")
    role = user.role.name if user.role else ""
    if role == "Student":
        st = _get_student(db, user)
        if e.student_id != st.id:
            raise HTTPException(status_code=403, detail="Forbidden")
    elif role == "Department":
        scope = getattr(user, "department_scope", None) or ""
        if not scope or not e.course or (e.course.department or "") != scope:
            raise HTTPException(status_code=403, detail="Forbidden")
    elif role not in (
        "Admin",
        "Registrar",
        "Accounting",
        "Student Affairs Office",
    ):
        raise HTTPException(status_code=403, detail="Forbidden")
    return _serialize_enrollment(e)


@router.get("/queue/registrar", response_model=List[dict])
def queue_registrar(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles("Registrar", "Admin"))],
) -> List[dict]:
    rows = (
        db.query(EnrollmentForm)
        .options(joinedload(EnrollmentForm.course), joinedload(EnrollmentForm.personal))
        .filter(
            EnrollmentForm.phase2_assigned_role == "Registrar",
            EnrollmentForm.submitted_at.isnot(None),
            EnrollmentForm.phase2_status == "Pending",
        )
        .order_by(EnrollmentForm.submitted_at.asc())
        .all()
    )
    return [_serialize_enrollment(r) for r in rows]


@router.get("/queue/accounting", response_model=List[dict])
def queue_accounting(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles("Accounting", "Admin"))],
) -> List[dict]:
    rows = (
        db.query(EnrollmentForm)
        .options(joinedload(EnrollmentForm.course), joinedload(EnrollmentForm.personal))
        .filter(
            EnrollmentForm.phase2_assigned_role == "Accounting",
            EnrollmentForm.submitted_at.isnot(None),
            EnrollmentForm.phase2_status == "Pending",
        )
        .order_by(EnrollmentForm.submitted_at.asc())
        .all()
    )
    return [_serialize_enrollment(r) for r in rows]


@router.get("/department/enrolled", response_model=List[dict])
def department_enrolled(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles("Department", "Admin"))],
) -> List[dict]:
    """Fully enrolled students (all phases approved), scoped by course department."""
    role = user.role.name if user.role else ""
    scope: str | None = None
    if role == "Department":
        scope = getattr(user, "department_scope", None) or ""
        if not scope:
            raise HTTPException(status_code=400, detail="Department scope is not set for this account.")

    q = (
        db.query(EnrollmentForm)
        .options(joinedload(EnrollmentForm.course), joinedload(EnrollmentForm.personal))
        .filter(
            EnrollmentForm.phase1_status == "Approved",
            EnrollmentForm.phase2_status == "Approved",
            EnrollmentForm.phase3_status == "Approved",
        )
        .order_by(EnrollmentForm.updated_at.desc())
    )
    rows = q.all()
    if scope:
        rows = [r for r in rows if r.course and (r.course.department or "") == scope]
    return [_serialize_enrollment(r) for r in rows]


@router.get("/queue/sao", response_model=List[dict])
def queue_sao(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles("Student Affairs Office", "Admin"))],
) -> List[dict]:
    rows = (
        db.query(EnrollmentForm)
        .options(joinedload(EnrollmentForm.course), joinedload(EnrollmentForm.personal))
        .filter(
            EnrollmentForm.phase2_status == "Approved",
            EnrollmentForm.phase3_status == "Pending",
        )
        .order_by(EnrollmentForm.updated_at.asc())
        .all()
    )
    return [_serialize_enrollment(r) for r in rows]


@router.post("/{enrollment_id}/phase2/accounting-verify-and-approve", response_model=dict)
def accounting_verify_and_approve(
    enrollment_id: int,
    body: AccountingPhaseApprove,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles("Accounting", "Admin"))],
) -> dict:
    """Mark receipt approved and approve phase 2 in one transaction (Accounting queue UX)."""
    role = user.role.name if user.role else ""
    e = db.query(EnrollmentForm).filter(EnrollmentForm.id == enrollment_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Not found")
    if e.phase2_assigned_role != "Accounting" or role not in ("Accounting", "Admin"):
        raise HTTPException(status_code=403, detail="Accounting only")
    if e.current_phase < 2 or e.phase2_status != "Pending":
        raise HTTPException(status_code=400, detail="Invalid state for phase 2 decision")

    p = (
        db.query(Payment)
        .filter(Payment.id == body.payment_id, Payment.enrollment_form_id == e.id)
        .first()
    )
    if not p:
        raise HTTPException(status_code=404, detail="Payment not found")
    if p.status != "Pending":
        raise HTTPException(status_code=400, detail="Receipt is not pending verification")

    now = datetime.now(timezone.utc)
    p.status = "Approved"
    p.verified_by_user_id = user.id
    p.verified_at = now
    if body.notes:
        p.notes = body.notes

    e.phase2_status = "Approved"
    e.updated_at = now
    e.current_phase = 3
    db.add(
        Approval(
            enrollment_form_id=e.id,
            phase=2,
            actor_role="Accounting",
            status="Approved",
            notes=body.notes,
            decided_by_user_id=user.id,
            decided_at=now,
        )
    )
    student = db.query(Student).filter(Student.id == e.student_id).first()
    stu_user = db.query(User).filter(User.id == student.user_id).first() if student else None
    if stu_user:
        notify_user(
            db,
            stu_user.id,
            "Payment verified — Phase 2 approved",
            body.notes or "Accounting verified your receipt. Student Affairs may contact you for Phase 3.",
            notification_type="success",
            related_enrollment_id=e.id,
        )
    notify_role_users(
        db,
        "Student Affairs Office",
        "ID validation pending",
        f"Enrollment #{e.id} ready for SAO (Phase 3).",
        related_enrollment_id=e.id,
    )
    db.commit()
    db.refresh(e)
    return _serialize_enrollment(
        db.query(EnrollmentForm)
        .options(
            joinedload(EnrollmentForm.course),
            joinedload(EnrollmentForm.personal),
            joinedload(EnrollmentForm.transfer),
        )
        .filter(EnrollmentForm.id == e.id)
        .first()
    )


@router.post("/{enrollment_id}/phase2/decision", response_model=dict)
def phase2_decision(
    enrollment_id: int,
    body: PhaseDecision,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    role = user.role.name if user.role else ""
    e = db.query(EnrollmentForm).filter(EnrollmentForm.id == enrollment_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Not found")
    if e.phase2_assigned_role == "Registrar" and role not in ("Registrar", "Admin"):
        raise HTTPException(status_code=403, detail="Registrar only")
    if e.phase2_assigned_role == "Accounting" and role not in ("Accounting", "Admin"):
        raise HTTPException(status_code=403, detail="Accounting only")
    if e.current_phase < 2 or e.phase2_status != "Pending":
        raise HTTPException(status_code=400, detail="Invalid state for phase 2 decision")

    if e.phase2_assigned_role == "Accounting":
        from app.models import Payment

        paid = (
            db.query(Payment)
            .filter(
                Payment.enrollment_form_id == e.id,
                Payment.status == "Approved",
            )
            .first()
        )
        if not paid:
            raise HTTPException(
                status_code=400,
                detail="Accounting cannot approve until a payment receipt is verified as approved.",
            )

    now = datetime.now(timezone.utc)
    e.phase2_status = body.status
    e.updated_at = now
    if body.status == "Approved":
        e.current_phase = 3
    db.add(
        Approval(
            enrollment_form_id=e.id,
            phase=2,
            actor_role=e.phase2_assigned_role,
            status=body.status,
            notes=body.notes,
            decided_by_user_id=user.id,
            decided_at=now,
        )
    )
    student = db.query(Student).filter(Student.id == e.student_id).first()
    stu_user = db.query(User).filter(User.id == student.user_id).first() if student else None
    if stu_user:
        notify_user(
            db,
            stu_user.id,
            f"Phase 2 {body.status}",
            body.notes or "Your phase 2 verification was updated.",
            notification_type="success" if body.status == "Approved" else "warning",
            related_enrollment_id=e.id,
        )
    if body.status == "Approved":
        notify_role_users(
            db,
            "Student Affairs Office",
            "ID validation pending",
            f"Enrollment #{e.id} ready for SAO (Phase 3).",
            related_enrollment_id=e.id,
        )
    db.commit()
    db.refresh(e)
    return _serialize_enrollment(e)


@router.post("/{enrollment_id}/phase3/decision", response_model=dict)
def phase3_decision(
    enrollment_id: int,
    body: PhaseDecision,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_roles("Student Affairs Office", "Admin"))],
) -> dict:
    e = db.query(EnrollmentForm).filter(EnrollmentForm.id == enrollment_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Not found")
    if e.phase2_status != "Approved" or e.phase3_status != "Pending":
        raise HTTPException(status_code=400, detail="Phase 3 not available yet")

    now = datetime.now(timezone.utc)
    e.phase3_status = body.status
    e.updated_at = now
    if body.status == "Approved":
        e.current_phase = 3
    db.add(
        Approval(
            enrollment_form_id=e.id,
            phase=3,
            actor_role="Student Affairs Office",
            status=body.status,
            notes=body.notes,
            decided_by_user_id=user.id,
            decided_at=now,
        )
    )
    student = db.query(Student).filter(Student.id == e.student_id).first()
    stu_user = db.query(User).filter(User.id == student.user_id).first() if student else None
    if stu_user:
        notify_user(
            db,
            stu_user.id,
            f"Phase 3 {body.status}",
            body.notes or "Student Affairs completed validation.",
            notification_type="success" if body.status == "Approved" else "warning",
            related_enrollment_id=e.id,
        )
    db.commit()
    db.refresh(e)
    return _serialize_enrollment(e)
