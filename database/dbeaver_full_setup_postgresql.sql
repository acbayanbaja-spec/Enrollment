-- =============================================================================
-- SEAIT Enrollment — FULL PostgreSQL setup for DBeaver
-- Paste this entire script into a SQL Editor connected to your database, then Execute (Ctrl+Enter / F5).
-- Creates all tables (IF NOT EXISTS), applies legacy compatibility steps, then seeds demo data.
-- Demo passwords: Admin@2026! | Staff@2026! | Student@2026!
-- You can also run schema.sql + dbeaver_seed_only_postgresql.sql separately if you prefer.
-- =============================================================================

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

CREATE INDEX IF NOT EXISTS idx_users_role ON users(role_id);

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

CREATE INDEX IF NOT EXISTS idx_enrollment_student ON enrollment_forms(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_year ON enrollment_forms(academic_year, semester);

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

CREATE INDEX IF NOT EXISTS idx_approvals_form ON approvals(enrollment_form_id);

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

CREATE INDEX IF NOT EXISTS idx_payments_form ON payments(enrollment_form_id);

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

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

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


-- Optional manual migration (psql / DBeaver). The app also applies this automatically
-- on startup for PostgreSQL via backend/app/schema_patches.py (unless SKIP_AUTO_DB_SETUP=1).

BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS department_scope VARCHAR(128);

-- Allow Transfer category
ALTER TABLE enrollment_forms DROP CONSTRAINT IF EXISTS enrollment_forms_category_check;
ALTER TABLE enrollment_forms ADD CONSTRAINT enrollment_forms_category_check
  CHECK (category IN ('New', '2nd Year', '3rd Year', '4th Year', 'Transfer'));

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

INSERT INTO roles (name, description)
SELECT 'Department', 'Department dashboard — enrolled students by program'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'Department');

COMMIT;


-- =============================================================================
-- SEAIT Enrollment — SEED DATA ONLY (PostgreSQL)
-- Run AFTER database/schema.sql (or the combined dbeaver_full_setup_postgresql.sql).
-- Safe to re-run: uses ON CONFLICT / NOT EXISTS where possible; resets demo passwords.
-- Bcrypt rounds=12 (matches backend seed.py).
-- =============================================================================

BEGIN;

-- Roles (includes Department for department dashboard)
INSERT INTO roles (name, description, created_at) VALUES
    ('Admin', 'System administration', NOW()),
    ('Student', 'Enrolled or applicant student', NOW()),
    ('Registrar', 'Handles new student enrollment approval', NOW()),
    ('Accounting', 'Payment verification for returning students', NOW()),
    ('Student Affairs Office', 'ID validation and student services', NOW()),
    ('Department', 'Department dashboard — enrolled students by program', NOW())
ON CONFLICT (name) DO NOTHING;

-- Program catalog (same list as backend/seed.py)
INSERT INTO courses (code, name, department, degree) VALUES
    ('BSIT', 'Bachelor of Science in Information Technology', 'Computing', 'BS'),
    ('BSCS', 'Bachelor of Science in Computer Science', 'Computing', 'BS'),
    ('BSCE', 'Bachelor of Science in Civil Engineering', 'Engineering', 'BS'),
    ('BSEE', 'Bachelor of Science in Electrical Engineering', 'Engineering', 'BS'),
    ('BSME', 'Bachelor of Science in Mechanical Engineering', 'Engineering', 'BS'),
    ('BSIE', 'Bachelor of Science in Industrial Engineering', 'Engineering', 'BS'),
    ('BSHM', 'Bachelor of Science in Hospitality Management', 'Business', 'BS'),
    ('BSTM', 'Bachelor of Science in Tourism Management', 'Business', 'BS'),
    ('BSBA-MM', 'Bachelor of Science in Business Administration — Marketing', 'Business', 'BS'),
    ('BSBA-FM', 'Bachelor of Science in Business Administration — Financial Management', 'Business', 'BS'),
    ('BSED-ENG', 'Bachelor of Secondary Education — English', 'Education', 'BS'),
    ('BSED-MATH', 'Bachelor of Secondary Education — Mathematics', 'Education', 'BS'),
    ('BEED', 'Bachelor of Elementary Education', 'Education', 'BS'),
    ('BSN', 'Bachelor of Science in Nursing', 'Allied Health', 'BS'),
    ('BSPSY', 'Bachelor of Science in Psychology', 'Social Sciences', 'BS'),
    ('BSOA', 'Bachelor of Science in Office Administration', 'Business', 'BS'),
    ('BSCrim', 'Bachelor of Science in Criminology', 'Criminal Justice', 'BS'),
    ('BSAcc', 'Bachelor of Science in Accountancy', 'Business', 'BS'),
    ('BSHRM', 'Bachelor of Science in Hotel and Restaurant Management', 'Business', 'BS'),
    ('BSDevCom', 'Bachelor of Science in Development Communication', 'Arts & Sciences', 'BS')
ON CONFLICT (code) DO NOTHING;

-- Cut-off windows (only if table is empty)
INSERT INTO cut_off_dates (label, phase, starts_at, ends_at, created_at)
SELECT label, phase, starts_at, ends_at, NOW() FROM (VALUES
    ('Phase 1 — Enrollment Form', 1::smallint, NOW() - INTERVAL '30 days', NOW() + INTERVAL '60 days'),
    ('Phase 2 — Verification', 2::smallint, NOW() - INTERVAL '30 days', NOW() + INTERVAL '45 days'),
    ('Phase 3 — Student Affairs', 3::smallint, NOW() - INTERVAL '30 days', NOW() + INTERVAL '30 days')
) AS v(label, phase, starts_at, ends_at)
WHERE NOT EXISTS (SELECT 1 FROM cut_off_dates LIMIT 1);

-- BSIT curriculum sample (backend/seed.py BSIT_SUBJECTS)
INSERT INTO curriculum_subjects (course_id, code, title, year_level, semester_offered)
SELECT c.id, v.code, v.title, v.yr::smallint, v.sem
FROM courses c
CROSS JOIN (VALUES
    ('IT101', 'Introduction to Computing', 1, '1st'),
    ('IT102', 'Computer Programming 1', 1, '1st'),
    ('IT103', 'Discrete Mathematics', 1, '1st'),
    ('IT201', 'Data Structures', 2, '1st'),
    ('IT202', 'Database Systems', 2, '2nd'),
    ('IT301', 'Web Systems', 3, '1st'),
    ('IT302', 'Networks', 3, '2nd'),
    ('IT401', 'Capstone Project', 4, '1st')
) AS v(code, title, yr, sem)
WHERE c.code = 'BSIT'
ON CONFLICT (course_id, code) DO NOTHING;

-- Demo users (passwords: Admin@2026! / Staff@2026! / Student@2026!)
INSERT INTO users (email, password_hash, full_name, department_scope, role_id, is_active, created_at, updated_at)
SELECT 'admin@seait.edu.ph',
       '$2b$12$Ih0sW37PTnnRwn7HzT9by.kzJ3C/xM9Q8TRguoKy3/IF5nakEj07S',
       'System Administrator', NULL, r.id, TRUE, NOW(), NOW() FROM roles r WHERE r.name = 'Admin'
ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    role_id = EXCLUDED.role_id,
    department_scope = EXCLUDED.department_scope,
    is_active = TRUE,
    updated_at = NOW();

INSERT INTO users (email, password_hash, full_name, department_scope, role_id, is_active, created_at, updated_at)
SELECT 'student@seait.edu.ph',
       '$2b$12$v/loOaSA42LWABp572EhOuxQkIY1eM0.pu7WumxWQEjU/ZFiLb.5W',
       'Juan Dela Cruz', NULL, r.id, TRUE, NOW(), NOW() FROM roles r WHERE r.name = 'Student'
ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    role_id = EXCLUDED.role_id,
    department_scope = EXCLUDED.department_scope,
    is_active = TRUE,
    updated_at = NOW();

INSERT INTO users (email, password_hash, full_name, department_scope, role_id, is_active, created_at, updated_at)
SELECT 'registrar@seait.edu.ph',
       '$2b$12$C4K65LeqfzB8aT.lIOQ29ux6B4r8oOr1RHRBWQk6R8Q6OZ6Noxx36',
       'Maria Registrar', NULL, r.id, TRUE, NOW(), NOW() FROM roles r WHERE r.name = 'Registrar'
ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    role_id = EXCLUDED.role_id,
    department_scope = EXCLUDED.department_scope,
    is_active = TRUE,
    updated_at = NOW();

INSERT INTO users (email, password_hash, full_name, department_scope, role_id, is_active, created_at, updated_at)
SELECT 'accounting@seait.edu.ph',
       '$2b$12$C4K65LeqfzB8aT.lIOQ29ux6B4r8oOr1RHRBWQk6R8Q6OZ6Noxx36',
       'Pedro Accounting', NULL, r.id, TRUE, NOW(), NOW() FROM roles r WHERE r.name = 'Accounting'
ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    role_id = EXCLUDED.role_id,
    department_scope = EXCLUDED.department_scope,
    is_active = TRUE,
    updated_at = NOW();

INSERT INTO users (email, password_hash, full_name, department_scope, role_id, is_active, created_at, updated_at)
SELECT 'sao@seait.edu.ph',
       '$2b$12$C4K65LeqfzB8aT.lIOQ29ux6B4r8oOr1RHRBWQk6R8Q6OZ6Noxx36',
       'Ana SAO', NULL, r.id, TRUE, NOW(), NOW() FROM roles r WHERE r.name = 'Student Affairs Office'
ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    role_id = EXCLUDED.role_id,
    department_scope = EXCLUDED.department_scope,
    is_active = TRUE,
    updated_at = NOW();

INSERT INTO users (email, password_hash, full_name, department_scope, role_id, is_active, created_at, updated_at)
SELECT 'dept.computing@seait.edu.ph',
       '$2b$12$C4K65LeqfzB8aT.lIOQ29ux6B4r8oOr1RHRBWQk6R8Q6OZ6Noxx36',
       'Carlos Dept Chair', 'Computing', r.id, TRUE, NOW(), NOW() FROM roles r WHERE r.name = 'Department'
ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    role_id = EXCLUDED.role_id,
    department_scope = EXCLUDED.department_scope,
    is_active = TRUE,
    updated_at = NOW();

-- Student profile row for demo student
INSERT INTO students (user_id, student_number, created_at)
SELECT u.id, '2026-00001', NOW() FROM users u WHERE u.email = 'student@seait.edu.ph'
ON CONFLICT (user_id) DO UPDATE SET student_number = EXCLUDED.student_number;

COMMIT;
