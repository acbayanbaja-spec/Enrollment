# Functional Decomposition Diagram (FDD)

The system decomposes into **presentation**, **API**, **domain services**, and **data** layers.

```mermaid
flowchart TB
  subgraph Presentation["Presentation (HTML/CSS/JS + optional PHP router)"]
    P1[Landing / Login]
    P2[Role dashboards]
    P3[Enrollment form & tracker]
    P4[AI assistant UI]
  end

  subgraph API["FastAPI REST"]
    A1[Auth / JWT]
    A2[Enrollment & workflow]
    A3[Payments & files]
    A4[Notifications & announcements]
    A5[Reports & analytics]
    A6[AI chat & irregular check]
  end

  subgraph Services["Services"]
    S1[Cut-off enforcement]
    S2[Phase routing: Registrar vs Accounting]
    S3[Notification fan-out]
    S4[Rule-based / optional LLM chat]
    S5[Curriculum vs progress — irregular]
  end

  subgraph Data["PostgreSQL"]
    D1[(Users / Roles)]
    D2[(Enrollments & details)]
    D3[(Payments / Approvals)]
    D4[(Announcements / Notifications)]
  end

  Presentation --> API
  API --> Services
  Services --> Data
```

**Major functions**

1. **Authenticate & authorize** — JWT bearer; RBAC by role name.
2. **Capture enrollment** — Validated multi-section form; draft vs submit; cut-off gate on submit.
3. **Route phase 2** — Category “New” → Registrar; “2nd–4th Year” → Accounting (payment path).
4. **Verify payment** — File upload; Accounting approves receipt before phase 2 completion for returning students.
5. **Complete phase 3** — SAO validates ID; statuses block progression.
6. **Notify** — In-app alerts on key transitions.
7. **Report** — Admin counts by phase and status.
8. **AI** — Chatbot + step hints + irregular subject simulation.
