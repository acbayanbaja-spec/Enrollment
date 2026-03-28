"""
Initialize database roles, admin user, course curriculum (run once).
Usage (from backend/):  set INIT_DB=true && python seed.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from app.config import get_settings
from app.database import Base, SessionLocal, engine
from app.models import Course, CurriculumSubject, CutOffDate, Role, Student, User
from app.security import hash_password

settings = get_settings()

# Full program catalog (aligned with database/seed.sql)
COURSES_DATA = [
    ("BSIT", "Bachelor of Science in Information Technology", "Computing", "BS"),
    ("BSCS", "Bachelor of Science in Computer Science", "Computing", "BS"),
    ("BSCE", "Bachelor of Science in Civil Engineering", "Engineering", "BS"),
    ("BSEE", "Bachelor of Science in Electrical Engineering", "Engineering", "BS"),
    ("BSME", "Bachelor of Science in Mechanical Engineering", "Engineering", "BS"),
    ("BSIE", "Bachelor of Science in Industrial Engineering", "Engineering", "BS"),
    ("BSHM", "Bachelor of Science in Hospitality Management", "Business", "BS"),
    ("BSTM", "Bachelor of Science in Tourism Management", "Business", "BS"),
    ("BSBA-MM", "Bachelor of Science in Business Administration — Marketing", "Business", "BS"),
    ("BSBA-FM", "Bachelor of Science in Business Administration — Financial Management", "Business", "BS"),
    ("BSED-ENG", "Bachelor of Secondary Education — English", "Education", "BS"),
    ("BSED-MATH", "Bachelor of Secondary Education — Mathematics", "Education", "BS"),
    ("BEED", "Bachelor of Elementary Education", "Education", "BS"),
    ("BSN", "Bachelor of Science in Nursing", "Allied Health", "BS"),
    ("BSPSY", "Bachelor of Science in Psychology", "Social Sciences", "BS"),
    ("BSOA", "Bachelor of Science in Office Administration", "Business", "BS"),
    ("BSCrim", "Bachelor of Science in Criminology", "Criminal Justice", "BS"),
    ("BSAcc", "Bachelor of Science in Accountancy", "Business", "BS"),
    ("BSHRM", "Bachelor of Science in Hotel and Restaurant Management", "Business", "BS"),
    ("BSDevCom", "Bachelor of Science in Development Communication", "Arts & Sciences", "BS"),
]

BSIT_SUBJECTS = [
    ("IT101", "Introduction to Computing", 1, "1st"),
    ("IT102", "Computer Programming 1", 1, "1st"),
    ("IT103", "Discrete Mathematics", 1, "1st"),
    ("IT201", "Data Structures", 2, "1st"),
    ("IT202", "Database Systems", 2, "2nd"),
    ("IT301", "Web Systems", 3, "1st"),
    ("IT302", "Networks", 3, "2nd"),
    ("IT401", "Capstone Project", 4, "1st"),
]


def run() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        roles_data = [
            ("Admin", "System administration"),
            ("Student", "Enrolled or applicant student"),
            ("Registrar", "New student enrollment"),
            ("Accounting", "Payment verification"),
            ("Student Affairs Office", "ID validation"),
        ]
        for name, desc in roles_data:
            if not db.query(Role).filter(Role.name == name).first():
                db.add(Role(name=name, description=desc))
        db.commit()

        for code, name, dept, deg in COURSES_DATA:
            if not db.query(Course).filter(Course.code == code).first():
                db.add(Course(code=code, name=name, department=dept, degree=deg))
        db.commit()

        if not db.query(CutOffDate).first():
            from datetime import datetime, timedelta, timezone

            now = datetime.now(timezone.utc)
            db.add_all(
                [
                    CutOffDate(
                        label="Phase 1 — Enrollment Form",
                        phase=1,
                        starts_at=now - timedelta(days=30),
                        ends_at=now + timedelta(days=60),
                    ),
                    CutOffDate(
                        label="Phase 2 — Verification",
                        phase=2,
                        starts_at=now - timedelta(days=30),
                        ends_at=now + timedelta(days=45),
                    ),
                    CutOffDate(
                        label="Phase 3 — Student Affairs",
                        phase=3,
                        starts_at=now - timedelta(days=30),
                        ends_at=now + timedelta(days=30),
                    ),
                ]
            )
            db.commit()

        course = db.query(Course).filter(Course.code == "BSIT").first()
        assert course is not None, "BSIT course must exist after COURSES_DATA seed"

        for code, title, yr, sem in BSIT_SUBJECTS:
            exists = (
                db.query(CurriculumSubject)
                .filter(CurriculumSubject.course_id == course.id, CurriculumSubject.code == code)
                .first()
            )
            if not exists:
                db.add(
                    CurriculumSubject(
                        course_id=course.id,
                        code=code,
                        title=title,
                        year_level=yr,
                        semester_offered=sem,
                    )
                )
        db.commit()

        admin_role = db.query(Role).filter(Role.name == "Admin").first()
        if admin_role and not db.query(User).filter(User.email == "admin@seait.edu.ph").first():
            u = User(
                email="admin@seait.edu.ph",
                password_hash=hash_password("Admin@2026!"),
                full_name="System Administrator",
                role_id=admin_role.id,
            )
            db.add(u)
            db.commit()
            print("Created admin@seait.edu.ph / Admin@2026!")

        student_role = db.query(Role).filter(Role.name == "Student").first()
        if student_role and not db.query(User).filter(User.email == "student@seait.edu.ph").first():
            u = User(
                email="student@seait.edu.ph",
                password_hash=hash_password("Student@2026!"),
                full_name="Juan Dela Cruz",
                role_id=student_role.id,
            )
            db.add(u)
            db.flush()
            db.add(Student(user_id=u.id, student_number="2026-00001"))
            db.commit()
            print("Created student@seait.edu.ph / Student@2026!")

        for email, name, rname in [
            ("registrar@seait.edu.ph", "Maria Registrar", "Registrar"),
            ("accounting@seait.edu.ph", "Pedro Accounting", "Accounting"),
            ("sao@seait.edu.ph", "Ana SAO", "Student Affairs Office"),
        ]:
            role = db.query(Role).filter(Role.name == rname).first()
            if role and not db.query(User).filter(User.email == email).first():
                db.add(
                    User(
                        email=email,
                        password_hash=hash_password("Staff@2026!"),
                        full_name=name,
                        role_id=role.id,
                    )
                )
                db.commit()
                print(f"Created {email} / Staff@2026!")
    finally:
        db.close()


if __name__ == "__main__":
    run()
    print("Seed complete.")
