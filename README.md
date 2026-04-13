# SEAIT-Inspired Online Enrollment System

Production-style, phase-based enrollment portal with **FastAPI**, **PostgreSQL**, and a **dashboard UI** (HTML5, CSS3, vanilla JavaScript). Optional **PHP router** for Apache-style hosting lives under `frontend/public/router.php`. The API serves the SPA from `/app/` when deployed with Uvicorn.

## System description

- **Roles:** Admin, Student, Registrar, Accounting, Student Affairs Office (SAO).
- **Authentication:** JWT bearer tokens (`Authorization: Bearer <token>`), issued on login; RBAC enforced per endpoint.
- **Phase workflow:**
  1. **Phase 1** — Student completes the enrollment form (draft save or submit). Submit is blocked outside configured **cut-off** windows.
  2. **Phase 2** — **New** students → **Registrar** approval. **2nd–4th year** → **Accounting** path: upload payment receipt; Accounting verifies the receipt, then approves phase 2.
  3. **Phase 3** — **Student Affairs** ID validation after phase 2 is approved.
- **Features:** Progress tracker, payment uploads, in-app notifications, announcements (admin), enrollment history (list for students), cut-off dates, basic admin analytics, AI chatbot (rule-based; optional OpenAI), smart step hints, irregular-student simulation vs curriculum.

Detailed diagrams:

- [Functional Decomposition (FDD)](docs/FDD.md)
- [Entity Relationship (ERD)](docs/ERD.md)

## Repository layout

```
Enrollment/
├── backend/           # FastAPI app (app.main:app)
├── database/          # schema.sql; DBeaver: dbeaver_full_setup_postgresql.sql
├── frontend/public/   # Static UI + optional PHP router
├── docs/              # FDD, ERD
├── render.yaml        # Render blueprint (optional)
└── README.md
```

## Prerequisites

- Python 3.11+ (3.12 recommended)
- PostgreSQL 14+
- `pip` / virtualenv

## Local setup

1. **Create database and apply schema**

   **Option A — DBeaver (paste everything):** create an empty database, open **`database/dbeaver_full_setup_postgresql.sql`** in a SQL editor, paste into DBeaver, and execute. That file bundles **`schema.sql`**, **`migration_002_department_transfer_charts.sql`**, and seed data (roles, courses, cutoffs, BSIT curriculum, demo users with correct bcrypt hashes).

   **Option B — psql:**

   ```bash
   createdb enrollment_db
   psql -d enrollment_db -f database/schema.sql
   psql -d enrollment_db -f database/migration_002_department_transfer_charts.sql
   psql -d enrollment_db -f database/dbeaver_seed_only_postgresql.sql
   ```

   Alternatively, after the API has created tables once, run **`python seed.py`** for demo users (same accounts as the SQL seed).

2. **Backend environment**

   ```bash
   cd backend
   cp .env.example .env
   # Edit .env: DATABASE_URL, SECRET_KEY, CORS_ORIGINS
   ```

   Use a `postgresql+psycopg://` or `postgresql://` URL; the app rewrites `postgresql://` to `postgresql+psycopg://` for SQLAlchemy.

3. **Install dependencies**

   ```bash
   pip install -r requirements.txt
   ```

4. **Create demo users (tables are created when you start the API)**

   Start `uvicorn` once so the app runs `create_all` + PostgreSQL patches, then:

   ```bash
   python seed.py
   ```

   Demo accounts (change after first login):

   | Email                     | Password     | Role        |
   |--------------------------|--------------|-------------|
   | admin@seait.edu.ph       | Admin@2026!  | Admin       |
   | student@seait.edu.ph     | Student@2026!| Student     |
   | registrar@seait.edu.ph   | Staff@2026!  | Registrar   |
   | accounting@seait.edu.ph  | Staff@2026!  | Accounting  |
   | sao@seait.edu.ph         | Staff@2026!  | Student Affairs Office |
   | dept.computing@seait.edu.ph | Staff@2026! | Department (scope: Computing) |

5. **Run API + static UI**

   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

   - API docs: `http://127.0.0.1:8000/docs`
   - Landing: `http://127.0.0.1:8000/app/index.html`
   - Login: `http://127.0.0.1:8000/app/login.html`

   Receipt files are stored under `backend/uploads/` and exposed read-only at `/media/<filename>` (harden for production).

## DBeaver / empty Postgres (restore users and catalog)

If **`DATABASE_URL`** is correct but login fails because the database has no tables or users, connect in **DBeaver** and run **`database/dbeaver_full_setup_postgresql.sql`** (one paste, full schema + seed). To refresh only data on an existing schema, run **`database/dbeaver_seed_only_postgresql.sql`**.

## Deployment on Render

1. Create a **PostgreSQL** instance on Render; note the **Internal Database URL**.
2. Create a **Web Service** and choose **one** layout:

   **A — Repo root (recommended)**  
   - **Root directory:** *(leave empty)*  
   - **Build command:** `pip install -r requirements.txt`  
   - **Start command:** `uvicorn asgi:app --host 0.0.0.0 --port $PORT`  
   Use the root **`asgi.py`** shim (not `uvicorn app.main:app`). Running `app.main` from the repo root causes `ModuleNotFoundError: No module named 'app'` because the package lives under `backend/`.

   **B — Backend only**  
   - **Root directory:** `backend`  
   - **Build command:** `pip install -r requirements.txt`  
   - **Start command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

3. Set environment variables:
   - `DATABASE_URL` — paste the PostgreSQL URL (the app accepts `postgresql://` from Render).
   - `SECRET_KEY` — long random string.
   - `CORS_ORIGINS` — your public web URL (e.g. `https://your-service.onrender.com`).
   - `SKIP_AUTO_DB_SETUP` — leave unset or `false`. The app runs **`create_all` + PostgreSQL patches** on every boot so tables and columns (e.g. `users.department_scope`) stay in sync without DBeaver. Set `true` only if you manage DDL externally.
   - `STRICT_DB_STARTUP` — default **`false`**. If the database is unreachable or **`DATABASE_URL` is rejected** (wrong password), the service still **starts in degraded mode** so Render binds a port and `/health` returns 200; fix `/api/health` and login by pasting the correct **Internal Database URL**. Set **`true`** if you want the deploy to **fail** when the DB is not available.
4. After deploy, if you need demo users: run **`database/dbeaver_full_setup_postgresql.sql`** or **`database/dbeaver_seed_only_postgresql.sql`** in DBeaver against your Postgres, or run `python seed.py` from a **Render shell** (or local with `DATABASE_URL`), or use `/api/auth/register` as **Admin** to create accounts.

You can also connect this repo to Render using `render.yaml` (adjust `rootDir` and env as needed).

### Render: `password authentication failed for user "…"`

The **Web Service** `DATABASE_URL` does not match the **current** PostgreSQL credentials. The app cannot fix this in code.

1. In Render, open your **PostgreSQL** → **Connect** (or **Info**).
2. Copy **Internal Database URL** (preferred for the API and DB in the same region/account).
3. On your **Web Service** → **Environment** → set **`DATABASE_URL`** to that value (replace any old value completely).
4. **Redeploy** the web service.

If you **reset the database password**, **restored a backup**, or **recreated** the Postgres instance, you must paste the **new** URL again. Passwords with characters like `@`, `#`, `%`, `+` must be **URL-encoded** inside the URL (e.g. `@` → `%40`).

## Security notes (thesis / production)

- Change all default passwords; rotate `SECRET_KEY`.
- The service applies **automatic schema setup** on startup (PostgreSQL + SQLAlchemy models). Use `SKIP_AUTO_DB_SETUP=true` only if you prefer external migrations only.
- Protect `/media` with signed URLs or authenticated download routes.
- Enable HTTPS only; set strict `CORS_ORIGINS`.

## API highlights

| Area            | Endpoints (prefix `/api`) |
|----------------|---------------------------|
| Auth           | `POST /auth/login`, `GET /auth/me`, `POST /auth/register` (Admin) |
| Enrollment     | `POST /enrollment/save`, `GET /enrollment/mine`, queues per role, `POST /enrollment/{id}/phase2|phase3/decision` |
| Payments       | `POST /payments/upload`, `GET /payments/pending`, `POST /payments/{id}/verify` (multipart form) |
| Notifications  | `GET /notifications/`, `PATCH /notifications/{id}/read` |
| Announcements  | `GET /announcements/`, `POST /announcements/` (Admin) |
| Courses        | `GET /courses/` (public catalog) |
| Reports        | `GET /reports/summary` (Admin) |
| AI             | `POST /ai/chat`, `GET /ai/assistant-steps`, `GET /ai/irregular-check` |

## License

Thesis / educational demonstration — adapt as needed for your institution’s policies.
