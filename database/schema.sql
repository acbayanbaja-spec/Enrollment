-- SEAIT-Inspired Online Enrollment System
-- PostgreSQL schema — normalized, production-oriented
-- Run after: CREATE DATABASE enrollment_db;

BEGIN;

-- Roles for RBAC
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(64) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Application users (all personas)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    department_scope VARCHAR(128),
    role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_role ON users(role_id);

-- Student profile (1:1 with users where role = student)
CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    student_number VARCHAR(32) UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Academic programs / courses (catalog)
CREATE TABLE IF NOT EXISTS courses (
    id SERIAL PRIMARY KEY,
    code VARCHAR(32) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    department VARCHAR(128),
    degree VARCHAR(128),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Cut-off windows per phase / period
CREATE TABLE IF NOT EXISTS cut_off_dates (
    id SERIAL PRIMARY KEY,
    label VARCHAR(128) NOT NULL,
    phase SMALLINT NOT NULL CHECK (phase BETWEEN 1 AND 3),
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Main enrollment application header
CREATE TABLE IF NOT EXISTS enrollment_forms (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
    academic_year VARCHAR(16) NOT NULL,
    semester VARCHAR(32) NOT NULL,
    category VARCHAR(16) NOT NULL CHECK (category IN ('New', '2nd Year', '3rd Year', '4th Year', 'Transfer')),
    current_phase SMALLINT NOT NULL DEFAULT 1 CHECK (current_phase BETWEEN 1 AND 3),
    -- Aggregate workflow: blocks progression
    phase1_status VARCHAR(16) NOT NULL DEFAULT 'Pending'
        CHECK (phase1_status IN ('Pending', 'Approved', 'Rejected')),
    phase2_status VARCHAR(16) NOT NULL DEFAULT 'Pending'
        CHECK (phase2_status IN ('Pending', 'Approved', 'Rejected')),
    phase3_status VARCHAR(16) NOT NULL DEFAULT 'Pending'
        CHECK (phase3_status IN ('Pending', 'Approved', 'Rejected')),
    -- Who owns phase 2 in workflow
    phase2_assigned_role VARCHAR(32) NOT NULL CHECK (phase2_assigned_role IN ('Registrar', 'Accounting')),
    submitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_enrollment_student ON enrollment_forms(student_id);
CREATE INDEX idx_enrollment_year ON enrollment_forms(academic_year, semester);

-- Personal block (1:1)
CREATE TABLE IF NOT EXISTS enrollment_personal (
    id SERIAL PRIMARY KEY,
    enrollment_form_id INTEGER NOT NULL UNIQUE REFERENCES enrollment_forms(id) ON DELETE CASCADE,
    last_name VARCHAR(128) NOT NULL,
    first_name VARCHAR(128) NOT NULL,
    middle_name VARCHAR(128),
    extension VARCHAR(16),
    sex VARCHAR(16) NOT NULL,
    date_of_birth DATE NOT NULL,
    birthplace VARCHAR(255) NOT NULL,
    civil_status VARCHAR(32) NOT NULL,
    citizenship VARCHAR(64) NOT NULL,
    contact_number VARCHAR(64) NOT NULL,
    email VARCHAR(255) NOT NULL,
    permanent_address TEXT NOT NULL,
    current_address TEXT NOT NULL
);

-- Family block (1:1)
CREATE TABLE IF NOT EXISTS enrollment_family (
    id SERIAL PRIMARY KEY,
    enrollment_form_id INTEGER NOT NULL UNIQUE REFERENCES enrollment_forms(id) ON DELETE CASCADE,
    father_name VARCHAR(255),
    father_occupation VARCHAR(128),
    father_contact VARCHAR(64),
    mother_name VARCHAR(255),
    mother_occupation VARCHAR(128),
    mother_contact VARCHAR(64),
    spouse_name VARCHAR(255),
    spouse_occupation VARCHAR(128),
    spouse_contact VARCHAR(64)
);

-- Academic background (1:1)
CREATE TABLE IF NOT EXISTS enrollment_academic (
    id SERIAL PRIMARY KEY,
    enrollment_form_id INTEGER NOT NULL UNIQUE REFERENCES enrollment_forms(id) ON DELETE CASCADE,
    elem_school VARCHAR(255) NOT NULL,
    elem_year VARCHAR(32),
    jhs_school VARCHAR(255) NOT NULL,
    jhs_year VARCHAR(32),
    shs_school VARCHAR(255) NOT NULL,
    shs_strand VARCHAR(128),
    shs_year VARCHAR(32)
);

-- Transfer student (1:1, optional — only when category = Transfer)
CREATE TABLE IF NOT EXISTS enrollment_transfer (
    id SERIAL PRIMARY KEY,
    enrollment_form_id INTEGER NOT NULL UNIQUE REFERENCES enrollment_forms(id) ON DELETE CASCADE,
    current_school VARCHAR(255) NOT NULL,
    current_program VARCHAR(255),
    last_semester_attended VARCHAR(128),
    previous_course_code VARCHAR(64),
    units_completed VARCHAR(64),
    reason_for_transfer TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enrollment_transfer_form ON enrollment_transfer(enrollment_form_id);

-- Emergency contact (1:1)
CREATE TABLE IF NOT EXISTS enrollment_emergency (
    id SERIAL PRIMARY KEY,
    enrollment_form_id INTEGER NOT NULL UNIQUE REFERENCES enrollment_forms(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    contact VARCHAR(64) NOT NULL,
    relationship VARCHAR(64) NOT NULL,
    address TEXT NOT NULL
);

-- Approvals audit trail (per actor / phase)
CREATE TABLE IF NOT EXISTS approvals (
    id SERIAL PRIMARY KEY,
    enrollment_form_id INTEGER NOT NULL REFERENCES enrollment_forms(id) ON DELETE CASCADE,
    phase SMALLINT NOT NULL CHECK (phase BETWEEN 1 AND 3),
    actor_role VARCHAR(32) NOT NULL,
    status VARCHAR(16) NOT NULL CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    notes TEXT,
    decided_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    decided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_approvals_form ON approvals(enrollment_form_id);

-- Payment receipts (old students / accounting path)
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    enrollment_form_id INTEGER NOT NULL REFERENCES enrollment_forms(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2),
    currency VARCHAR(8) NOT NULL DEFAULT 'PHP',
    receipt_file_path VARCHAR(512) NOT NULL,
    original_filename VARCHAR(255),
    status VARCHAR(16) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    verified_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    notes TEXT,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_form ON payments(enrollment_form_id);

-- In-app notifications
CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    notification_type VARCHAR(32) NOT NULL DEFAULT 'info',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    related_enrollment_id INTEGER REFERENCES enrollment_forms(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- Announcements (admin)
CREATE TABLE IF NOT EXISTS announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    priority VARCHAR(16) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
    created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Curriculum subjects (for irregular / missing subject simulation)
CREATE TABLE IF NOT EXISTS curriculum_subjects (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    code VARCHAR(32) NOT NULL,
    title VARCHAR(255) NOT NULL,
    year_level SMALLINT NOT NULL CHECK (year_level BETWEEN 1 AND 4),
    semester_offered VARCHAR(16) NOT NULL,
    UNIQUE (course_id, code)
);

-- Mock student progress vs curriculum (simulated)
CREATE TABLE IF NOT EXISTS student_subject_progress (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject_code VARCHAR(32) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'taken' CHECK (status IN ('taken', 'enrolled', 'missing')),
    UNIQUE (student_id, subject_code)
);

-- AI / assistant conversation logs (optional audit)
CREATE TABLE IF NOT EXISTS ai_chat_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    role VARCHAR(32),
    message TEXT NOT NULL,
    response TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
