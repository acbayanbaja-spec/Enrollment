"""
Pydantic request/response models — validation at API boundary.
"""
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    full_name: str
    role_name: str
    department_scope: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=255)
    role_name: str


class StudentSelfRegisterRequest(BaseModel):
    """Public student signup — new applicants and returning (2nd–4th year) students."""

    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=2, max_length=255)


class PersonalBlock(BaseModel):
    last_name: str = Field(..., min_length=1, max_length=128)
    first_name: str = Field(..., min_length=1, max_length=128)
    middle_name: Optional[str] = Field(None, max_length=128)
    extension: Optional[str] = Field(None, max_length=16)
    sex: str = Field(..., pattern="^(Male|Female|Other)$")
    date_of_birth: date
    birthplace: str = Field(..., min_length=1, max_length=255)
    civil_status: str = Field(..., min_length=1, max_length=32)
    citizenship: str = Field(..., min_length=1, max_length=64)
    contact_number: str = Field(..., min_length=5, max_length=64)
    email: EmailStr
    permanent_address: str = Field(..., min_length=5)
    current_address: str = Field(..., min_length=5)


class FamilyBlock(BaseModel):
    father_name: Optional[str] = None
    father_occupation: Optional[str] = None
    father_contact: Optional[str] = None
    mother_name: Optional[str] = None
    mother_occupation: Optional[str] = None
    mother_contact: Optional[str] = None
    spouse_name: Optional[str] = None
    spouse_occupation: Optional[str] = None
    spouse_contact: Optional[str] = None


class AcademicBlock(BaseModel):
    elem_school: str = Field(..., min_length=1)
    elem_year: Optional[str] = None
    jhs_school: str = Field(..., min_length=1)
    jhs_year: Optional[str] = None
    shs_school: str = Field(..., min_length=1)
    shs_strand: Optional[str] = None
    shs_year: Optional[str] = None


class TransferBlock(BaseModel):
    """Previous / current school information for transfer students."""

    current_school: str = Field(..., min_length=2, max_length=255)
    current_program: Optional[str] = Field(None, max_length=255)
    last_semester_attended: Optional[str] = Field(None, max_length=128)
    previous_course_code: Optional[str] = Field(None, max_length=64)
    units_completed: Optional[str] = Field(None, max_length=64)
    reason_for_transfer: Optional[str] = Field(None, max_length=2000)


class EmergencyBlock(BaseModel):
    name: str = Field(..., min_length=1)
    contact: str = Field(..., min_length=5)
    relationship: str = Field(..., min_length=1)
    address: str = Field(..., min_length=5)


class EnrollmentDraftCreate(BaseModel):
    """Create or update draft — all sections required before submit."""
    submit: bool = False
    enrollment_id: Optional[int] = None  # update existing draft when set
    course_id: int
    academic_year: str = Field(..., min_length=4, max_length=16)
    semester: str = Field(..., min_length=1, max_length=32)
    category: str = Field(..., pattern="^(New|2nd Year|3rd Year|4th Year|Transfer)$")
    personal: PersonalBlock
    family: FamilyBlock
    # Required only for new applicants; omitted for returning students (2nd–4th year)
    academic: Optional[AcademicBlock] = None
    transfer: Optional[TransferBlock] = None
    emergency: EmergencyBlock


class EnrollmentSubmitResponse(BaseModel):
    id: int
    message: str
    current_phase: int
    phase1_status: str
    phase2_status: str
    phase3_status: str


class EnrollmentDetailOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_id: int
    course_code: Optional[str] = None
    academic_year: str
    semester: str
    category: str
    current_phase: int
    phase1_status: str
    phase2_status: str
    phase3_status: str
    phase2_assigned_role: str
    submitted_at: Optional[datetime] = None
    personal: Optional[dict] = None
    family: Optional[dict] = None
    academic: Optional[dict] = None
    emergency: Optional[dict] = None


class PhaseDecision(BaseModel):
    status: str = Field(..., pattern="^(Approved|Rejected)$")
    notes: Optional[str] = Field(None, max_length=2000)


class AccountingPhaseApprove(BaseModel):
    """Verify selected receipt and approve phase 2 in one step (Accounting)."""

    payment_id: int
    notes: Optional[str] = Field(None, max_length=2000)


class PaymentUploadMeta(BaseModel):
    amount: Optional[Decimal] = None
    notes: Optional[str] = None


class PaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    enrollment_form_id: int
    amount: Optional[Decimal]
    status: str
    receipt_file_path: str
    original_filename: Optional[str]
    uploaded_at: datetime


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    body: Optional[str]
    notification_type: str
    is_read: bool
    created_at: datetime
    related_enrollment_id: Optional[int]


class AnnouncementCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=255)
    body: str = Field(..., min_length=5)
    priority: str = Field("normal", pattern="^(low|normal|high)$")
    expires_at: Optional[datetime] = None


class AnnouncementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    body: str
    priority: str
    created_at: datetime
    expires_at: Optional[datetime]


class CourseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    name: str
    department: Optional[str]


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)


class ChatResponse(BaseModel):
    reply: str


class IrregularCheckResponse(BaseModel):
    course_code: str
    missing_subjects: List[str]
    is_irregular: bool
    message: str


class ReportSummary(BaseModel):
    total_enrollments: int
    by_phase: dict
    by_status: dict
    by_department: List[dict] = []
    trend: List[dict] = []
    funnel: dict = {}
