-- Seed data: roles, courses, curriculum samples, default admin
-- Password for seeded users: ChangeMe@2026 (bcrypt hash below is placeholder — backend seed will hash properly)

BEGIN;

INSERT INTO roles (name, description) VALUES
    ('Admin', 'System administration'),
    ('Student', 'Enrolled or applicant student'),
    ('Registrar', 'Handles new student enrollment approval'),
    ('Accounting', 'Payment verification for returning students'),
    ('Student Affairs Office', 'ID validation and student services'),
    ('Department', 'Department dashboard — enrolled students by program')
ON CONFLICT (name) DO NOTHING;

-- Course catalog (SEAIT-style programs — illustrative full list)
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

-- Sample cut-off (adjust dates in production)
INSERT INTO cut_off_dates (label, phase, starts_at, ends_at)
SELECT * FROM (VALUES
    ('Phase 1 — Enrollment Form', 1::smallint, NOW() - INTERVAL '30 days', NOW() + INTERVAL '60 days'),
    ('Phase 2 — Verification', 2::smallint, NOW() - INTERVAL '30 days', NOW() + INTERVAL '45 days'),
    ('Phase 3 — Student Affairs', 3::smallint, NOW() - INTERVAL '30 days', NOW() + INTERVAL '30 days')
) AS v(label, phase, starts_at, ends_at)
WHERE NOT EXISTS (SELECT 1 FROM cut_off_dates LIMIT 1);

COMMIT;
