# Entity Relationship Diagram (ERD)

Core relationships (PostgreSQL, normalized):

```mermaid
erDiagram
  roles ||--o{ users : has
  users ||--o| students : "optional profile"
  students ||--o{ enrollment_forms : submits
  courses ||--o{ enrollment_forms : program
  courses ||--o{ curriculum_subjects : defines
  students ||--o{ student_subject_progress : tracks
  enrollment_forms ||--|| enrollment_personal : "1:1"
  enrollment_forms ||--|| enrollment_family : "1:1"
  enrollment_forms ||--|| enrollment_academic : "1:1"
  enrollment_forms ||--|| enrollment_emergency : "1:1"
  enrollment_forms ||--o{ approvals : audit
  enrollment_forms ||--o{ payments : receipts
  users ||--o{ notifications : receives
  enrollment_forms ||--o{ notifications : "optional ref"
  users ||--o{ announcements : "creates optional"
```

**Status fields** on `enrollment_forms`: `phase1_status`, `phase2_status`, `phase3_status` each constrained to `Pending | Approved | Rejected`, plus `current_phase` (1–3) for UX progress.

See `database/schema.sql` for full column list, keys, and constraints.
