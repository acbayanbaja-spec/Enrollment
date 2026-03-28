"""
Course catalog (programs) — public list for enrollment form.
"""
from typing import Annotated, List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Course
from app.schemas import CourseOut

router = APIRouter(prefix="/api/courses", tags=["courses"])


@router.get("/", response_model=List[CourseOut])
def list_courses(
    db: Annotated[Session, Depends(get_db)],
) -> List[Course]:
    return db.query(Course).filter(Course.is_active.is_(True)).order_by(Course.code).all()
