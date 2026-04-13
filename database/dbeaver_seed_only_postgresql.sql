-- =============================================================================
-- SEAIT Enrollment — SEED DATA ONLY (PostgreSQL)
-- Run AFTER database/schema.sql (or the combined dbeaver_full_setup_postgresql.sql).
-- Safe to re-run: uses ON CONFLICT / NOT EXISTS where possible; resets demo passwords.
-- Bcrypt rounds=12 (matches backend seed.py).
-- =============================================================================

BEGIN;

-- Roles (includes Department for department dashboard)
INSERT INTO roles (name, description) VALUES
    ('Admin', 'System administration'),
    ('Student', 'Enrolled or applicant student'),
    ('Registrar', 'Handles new student enrollment approval'),
    ('Accounting', 'Payment verification for returning students'),
    ('Student Affairs Office', 'ID validation and student services'),
    ('Department', 'Department dashboard — enrolled students by program')
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
INSERT INTO cut_off_dates (label, phase, starts_at, ends_at)
SELECT * FROM (VALUES
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
INSERT INTO users (email, password_hash, full_name, department_scope, role_id)
SELECT 'admin@seait.edu.ph',
       '$2b$12$Ih0sW37PTnnRwn7HzT9by.kzJ3C/xM9Q8TRguoKy3/IF5nakEj07S',
       'System Administrator', NULL, r.id FROM roles r WHERE r.name = 'Admin'
ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    role_id = EXCLUDED.role_id,
    department_scope = EXCLUDED.department_scope;

INSERT INTO users (email, password_hash, full_name, department_scope, role_id)
SELECT 'student@seait.edu.ph',
       '$2b$12$v/loOaSA42LWABp572EhOuxQkIY1eM0.pu7WumxWQEjU/ZFiLb.5W',
       'Juan Dela Cruz', NULL, r.id FROM roles r WHERE r.name = 'Student'
ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    role_id = EXCLUDED.role_id,
    department_scope = EXCLUDED.department_scope;

INSERT INTO users (email, password_hash, full_name, department_scope, role_id)
SELECT 'registrar@seait.edu.ph',
       '$2b$12$C4K65LeqfzB8aT.lIOQ29ux6B4r8oOr1RHRBWQk6R8Q6OZ6Noxx36',
       'Maria Registrar', NULL, r.id FROM roles r WHERE r.name = 'Registrar'
ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    role_id = EXCLUDED.role_id,
    department_scope = EXCLUDED.department_scope;

INSERT INTO users (email, password_hash, full_name, department_scope, role_id)
SELECT 'accounting@seait.edu.ph',
       '$2b$12$C4K65LeqfzB8aT.lIOQ29ux6B4r8oOr1RHRBWQk6R8Q6OZ6Noxx36',
       'Pedro Accounting', NULL, r.id FROM roles r WHERE r.name = 'Accounting'
ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    role_id = EXCLUDED.role_id,
    department_scope = EXCLUDED.department_scope;

INSERT INTO users (email, password_hash, full_name, department_scope, role_id)
SELECT 'sao@seait.edu.ph',
       '$2b$12$C4K65LeqfzB8aT.lIOQ29ux6B4r8oOr1RHRBWQk6R8Q6OZ6Noxx36',
       'Ana SAO', NULL, r.id FROM roles r WHERE r.name = 'Student Affairs Office'
ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    role_id = EXCLUDED.role_id,
    department_scope = EXCLUDED.department_scope;

INSERT INTO users (email, password_hash, full_name, department_scope, role_id)
SELECT 'dept.computing@seait.edu.ph',
       '$2b$12$C4K65LeqfzB8aT.lIOQ29ux6B4r8oOr1RHRBWQk6R8Q6OZ6Noxx36',
       'Carlos Dept Chair', 'Computing', r.id FROM roles r WHERE r.name = 'Department'
ON CONFLICT (email) DO UPDATE SET
    password_hash = EXCLUDED.password_hash,
    full_name = EXCLUDED.full_name,
    role_id = EXCLUDED.role_id,
    department_scope = EXCLUDED.department_scope;

-- Student profile row for demo student
INSERT INTO students (user_id, student_number)
SELECT u.id, '2026-00001' FROM users u WHERE u.email = 'student@seait.edu.ph'
ON CONFLICT (user_id) DO UPDATE SET student_number = EXCLUDED.student_number;

COMMIT;
