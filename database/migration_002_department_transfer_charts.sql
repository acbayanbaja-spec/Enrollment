-- Run once against existing DB: psql or pgAdmin
-- Adds Department role support, transfer students, user department scope

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
