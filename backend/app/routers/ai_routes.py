"""
AI chatbot, smart assistant hints, irregular student check.
"""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import AiChatLog, Course, Student, User
from app.schemas import ChatRequest, ChatResponse, IrregularCheckResponse
from app.services.chatbot import get_reply
from app.services.irregular import analyze_irregular, seed_demo_progress_for_student

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/chat", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> ChatResponse:
    reply = await get_reply(body.message)
    log = AiChatLog(user_id=user.id, role=user.role.name if user.role else None, message=body.message, response=reply)
    db.add(log)
    db.commit()
    return ChatResponse(reply=reply)


@router.get("/assistant-steps")
def assistant_steps(
    user: Annotated[User, Depends(get_current_user)],
) -> dict:
    """Structured steps for the Smart Enrollment Assistant (frontend wizard)."""
    return {
        "steps": [
            {"id": 1, "title": "Personal information", "hint": "Use legal name as in birth certificate."},
            {"id": 2, "title": "Family background", "hint": "Provide at least one parent/guardian contact."},
            {"id": 3, "title": "Academic history", "hint": "Include SHS strand for K–12 graduates."},
            {"id": 4, "title": "Emergency contact", "hint": "Must be reachable during school hours."},
            {"id": 5, "title": "Review & submit", "hint": "New students go to Registrar; 2nd–4th year to Accounting for payment."},
        ]
    }


@router.get("/irregular-check", response_model=IrregularCheckResponse)
def irregular_check(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
    course_id: int,
    seed_demo: bool = False,
) -> IrregularCheckResponse:
    st = db.query(Student).filter(Student.user_id == user.id).first()
    if not st:
        raise HTTPException(status_code=400, detail="Student record required")
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if seed_demo:
        seed_demo_progress_for_student(db, st, course)
        db.commit()
    missing, is_irregular = analyze_irregular(db, st.id, course_id)
    msg = (
        f"You have {len(missing)} subject(s) not recorded as completed vs curriculum baseline."
        if missing
        else "No missing subjects detected vs simulated progress."
    )
    return IrregularCheckResponse(
        course_code=course.code,
        missing_subjects=missing,
        is_irregular=is_irregular,
        message=msg,
    )
