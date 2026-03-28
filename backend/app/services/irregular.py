"""
Simulated irregular student detection — compares curriculum vs recorded progress.
"""
from sqlalchemy.orm import Session

from app.models import Course, CurriculumSubject, Student, StudentSubjectProgress


def analyze_irregular(db: Session, student_id: int, course_id: int) -> tuple[list[str], bool]:
    """
    Return (missing_subject_codes, is_irregular).
    Curriculum subjects for course minus subjects marked 'taken' for student.
    """
    required = (
        db.query(CurriculumSubject)
        .filter(CurriculumSubject.course_id == course_id)
        .all()
    )
    if not required:
        return [], False

    taken = (
        db.query(StudentSubjectProgress.subject_code)
        .filter(
            StudentSubjectProgress.student_id == student_id,
            StudentSubjectProgress.status == "taken",
        )
        .all()
    )
    taken_set = {t[0] for t in taken}
    missing = [s.code for s in required if s.code not in taken_set]
    return missing, len(missing) > 0


def seed_demo_progress_for_student(db: Session, student: Student, course: Course) -> None:
    """Optional: mark first N subjects as taken for demo irregular detection."""
    subs = (
        db.query(CurriculumSubject)
        .filter(CurriculumSubject.course_id == course.id)
        .order_by(CurriculumSubject.year_level, CurriculumSubject.code)
        .limit(8)
        .all()
    )
    for s in subs:
        existing = (
            db.query(StudentSubjectProgress)
            .filter(
                StudentSubjectProgress.student_id == student.id,
                StudentSubjectProgress.subject_code == s.code,
            )
            .first()
        )
        if not existing:
            db.add(
                StudentSubjectProgress(
                    student_id=student.id,
                    subject_code=s.code,
                    status="taken",
                )
            )
