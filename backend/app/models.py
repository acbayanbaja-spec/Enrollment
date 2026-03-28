"""
SQLAlchemy ORM models — aligned with database/schema.sql
"""
from datetime import date, datetime
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    users: Mapped[list["User"]] = relationship(back_populates="role")


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role_id: Mapped[int] = mapped_column(ForeignKey("roles.id"), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    role: Mapped["Role"] = relationship(back_populates="users")
    student: Mapped[Optional["Student"]] = relationship(back_populates="user", uselist=False)


class Student(Base):
    __tablename__ = "students"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    student_number: Mapped[Optional[str]] = mapped_column(String(32), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="student")
    enrollments: Mapped[list["EnrollmentForm"]] = relationship(back_populates="student")


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    department: Mapped[Optional[str]] = mapped_column(String(128))
    degree: Mapped[Optional[str]] = mapped_column(String(128))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class CutOffDate(Base):
    __tablename__ = "cut_off_dates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    label: Mapped[str] = mapped_column(String(128), nullable=False)
    phase: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class EnrollmentForm(Base):
    __tablename__ = "enrollment_forms"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"))
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id"))
    academic_year: Mapped[str] = mapped_column(String(16), nullable=False)
    semester: Mapped[str] = mapped_column(String(32), nullable=False)
    category: Mapped[str] = mapped_column(String(16), nullable=False)
    current_phase: Mapped[int] = mapped_column(SmallInteger, default=1)
    phase1_status: Mapped[str] = mapped_column(String(16), default="Pending")
    phase2_status: Mapped[str] = mapped_column(String(16), default="Pending")
    phase3_status: Mapped[str] = mapped_column(String(16), default="Pending")
    phase2_assigned_role: Mapped[str] = mapped_column(String(32), nullable=False)
    submitted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    student: Mapped["Student"] = relationship(back_populates="enrollments")
    course: Mapped["Course"] = relationship()
    personal: Mapped[Optional["EnrollmentPersonal"]] = relationship(
        back_populates="enrollment", uselist=False
    )
    family: Mapped[Optional["EnrollmentFamily"]] = relationship(
        back_populates="enrollment", uselist=False
    )
    academic: Mapped[Optional["EnrollmentAcademic"]] = relationship(
        back_populates="enrollment", uselist=False
    )
    emergency: Mapped[Optional["EnrollmentEmergency"]] = relationship(
        back_populates="enrollment", uselist=False
    )
    payments: Mapped[list["Payment"]] = relationship(back_populates="enrollment")


class EnrollmentPersonal(Base):
    __tablename__ = "enrollment_personal"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    enrollment_form_id: Mapped[int] = mapped_column(
        ForeignKey("enrollment_forms.id", ondelete="CASCADE"), unique=True
    )
    last_name: Mapped[str] = mapped_column(String(128), nullable=False)
    first_name: Mapped[str] = mapped_column(String(128), nullable=False)
    middle_name: Mapped[Optional[str]] = mapped_column(String(128))
    extension: Mapped[Optional[str]] = mapped_column(String(16))
    sex: Mapped[str] = mapped_column(String(16), nullable=False)
    date_of_birth: Mapped[date] = mapped_column(Date, nullable=False)
    birthplace: Mapped[str] = mapped_column(String(255), nullable=False)
    civil_status: Mapped[str] = mapped_column(String(32), nullable=False)
    citizenship: Mapped[str] = mapped_column(String(64), nullable=False)
    contact_number: Mapped[str] = mapped_column(String(64), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    permanent_address: Mapped[str] = mapped_column(Text, nullable=False)
    current_address: Mapped[str] = mapped_column(Text, nullable=False)

    enrollment: Mapped["EnrollmentForm"] = relationship(back_populates="personal")


class EnrollmentFamily(Base):
    __tablename__ = "enrollment_family"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    enrollment_form_id: Mapped[int] = mapped_column(
        ForeignKey("enrollment_forms.id", ondelete="CASCADE"), unique=True
    )
    father_name: Mapped[Optional[str]] = mapped_column(String(255))
    father_occupation: Mapped[Optional[str]] = mapped_column(String(128))
    father_contact: Mapped[Optional[str]] = mapped_column(String(64))
    mother_name: Mapped[Optional[str]] = mapped_column(String(255))
    mother_occupation: Mapped[Optional[str]] = mapped_column(String(128))
    mother_contact: Mapped[Optional[str]] = mapped_column(String(64))
    spouse_name: Mapped[Optional[str]] = mapped_column(String(255))
    spouse_occupation: Mapped[Optional[str]] = mapped_column(String(128))
    spouse_contact: Mapped[Optional[str]] = mapped_column(String(64))

    enrollment: Mapped["EnrollmentForm"] = relationship(back_populates="family")


class EnrollmentAcademic(Base):
    __tablename__ = "enrollment_academic"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    enrollment_form_id: Mapped[int] = mapped_column(
        ForeignKey("enrollment_forms.id", ondelete="CASCADE"), unique=True
    )
    elem_school: Mapped[str] = mapped_column(String(255), nullable=False)
    elem_year: Mapped[Optional[str]] = mapped_column(String(32))
    jhs_school: Mapped[str] = mapped_column(String(255), nullable=False)
    jhs_year: Mapped[Optional[str]] = mapped_column(String(32))
    shs_school: Mapped[str] = mapped_column(String(255), nullable=False)
    shs_strand: Mapped[Optional[str]] = mapped_column(String(128))
    shs_year: Mapped[Optional[str]] = mapped_column(String(32))

    enrollment: Mapped["EnrollmentForm"] = relationship(back_populates="academic")


class EnrollmentEmergency(Base):
    __tablename__ = "enrollment_emergency"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    enrollment_form_id: Mapped[int] = mapped_column(
        ForeignKey("enrollment_forms.id", ondelete="CASCADE"), unique=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    contact: Mapped[str] = mapped_column(String(64), nullable=False)
    relationship: Mapped[str] = mapped_column(String(64), nullable=False)
    address: Mapped[str] = mapped_column(Text, nullable=False)

    enrollment: Mapped["EnrollmentForm"] = relationship(back_populates="emergency")


class Approval(Base):
    __tablename__ = "approvals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    enrollment_form_id: Mapped[int] = mapped_column(ForeignKey("enrollment_forms.id", ondelete="CASCADE"))
    phase: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    actor_role: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[str] = mapped_column(String(16), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    decided_by_user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    decided_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    enrollment_form_id: Mapped[int] = mapped_column(ForeignKey("enrollment_forms.id", ondelete="CASCADE"))
    amount: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2))
    currency: Mapped[str] = mapped_column(String(8), default="PHP")
    receipt_file_path: Mapped[str] = mapped_column(String(512), nullable=False)
    original_filename: Mapped[Optional[str]] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(16), default="Pending")
    verified_by_user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    verified_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    notes: Mapped[Optional[str]] = mapped_column(Text)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    enrollment: Mapped["EnrollmentForm"] = relationship(back_populates="payments")


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[Optional[str]] = mapped_column(Text)
    notification_type: Mapped[str] = mapped_column(String(32), default="info")
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    related_enrollment_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("enrollment_forms.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class Announcement(Base):
    __tablename__ = "announcements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    priority: Mapped[str] = mapped_column(String(16), default="normal")
    created_by_user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class CurriculumSubject(Base):
    __tablename__ = "curriculum_subjects"
    __table_args__ = (UniqueConstraint("course_id", "code", name="uq_course_subject_code"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"))
    code: Mapped[str] = mapped_column(String(32), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    year_level: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    semester_offered: Mapped[str] = mapped_column(String(16), nullable=False)


class StudentSubjectProgress(Base):
    __tablename__ = "student_subject_progress"
    __table_args__ = (UniqueConstraint("student_id", "subject_code", name="uq_student_subject"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("students.id", ondelete="CASCADE"))
    subject_code: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="taken")


class AiChatLog(Base):
    __tablename__ = "ai_chat_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    role: Mapped[Optional[str]] = mapped_column(String(32))
    message: Mapped[str] = mapped_column(Text, nullable=False)
    response: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
