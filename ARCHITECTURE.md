# HR-Opt Architecture & Project Reference

> Portfolio project — AI-powered hiring platform. Built by Tyra Evans + collaborator.  
> Codebase: `/Users/Shared/projects/hr-opt`

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| Backend | FastAPI (Python 3.14) |
| Database | PostgreSQL (Docker, port 5432) via SQLAlchemy + psycopg2 |
| Vector DB | Qdrant (port 6333) — candidate & job embeddings |
| Embeddings | `all-MiniLM-L6-v2` (sentence-transformers, loaded at startup) |
| LLM | Configurable via `.env`: Ollama (`llama3.1:8b`) or Anthropic (`claude-sonnet-4-6`) |
| Auth | JWT (HS256), role-based: `employer` \| `candidate` |

---

## Directory Layout

```
hr-opt/
├── api/
│   ├── main.py          # FastAPI app factory, mounts /api prefix
│   ├── routes.py        # All API endpoints (~1150 lines)
│   └── auth.py          # JWT login/signup/verify endpoints
│
├── src/
│   ├── db.py            # SQLAlchemy models (all tables)
│   ├── services.py      # save_job, save_candidate, get_top_candidates
│   ├── embeddings.py    # Qdrant upsert/search helpers
│   ├── auth.py          # JWT encode/decode helpers
│   ├── llm/
│   │   ├── client.py    # get_llm_client() factory
│   │   └── providers/
│   │       ├── anthropic.py
│   │       └── ollama.py
│   ├── parsers/
│   │   ├── resume.py                    # PDF/DOCX → ParsedResume
│   │   └── resume_profile_extractor.py  # LLM: resume text → structured profile
│   ├── scoring/
│   │   ├── jd_extractor.py              # LLM: JD text → ExtractedJD dataclass
│   │   └── resume_scorer.py             # LLM: score resume vs JDRequirements
│   └── interview/
│       └── transcript_scorer.py         # LLM: interview Q&A → summary
│
├── hr-opt-frontend/src/
│   ├── App.tsx           # Router/shell, session state, role-gated screens
│   ├── api.ts            # All fetch calls to /api (typed)
│   ├── screens/          # One file per screen
│   ├── components/       # Shared UI components
│   ├── data/
│   │   └── fieldOfStudy.ts  # 25 field-of-study tags across 7 categories
│   └── hooks/
│       └── useBreakpoint.ts
│
├── ARCHITECTURE.md       # ← this file
├── STATUS.md             # bugs + backlog
├── .env                  # LLM_PROVIDER, DB creds, etc.
├── docker-compose.yml    # postgres + qdrant
└── seed_data.py          # Seeds question bank
```

---

## Database Models (`src/db.py`)

### Employer
`id, company_name, email, industry, created_at`

### Job
`id, employer_id, title, company, location, industry, salary_min, salary_max, required_skills (JSON), preferred_skills (JSON), min_experience_years, employment_type (enum), skill_weights (JSON), education_requirement (legacy string), education_level, education_field, education_notes, education_fields (JSON tag list), posted_by_user_id, raw_jd_text, jd_summary, jd_standardized, application_deadline, vector_id, created_at`

### Candidate
`id, email (unique), name, first_name, last_name, location, skills (JSON), work_experience (JSON), education (JSON), years_of_experience, desired_roles (JSON), salary_min, salary_max, work_preference (enum), open_to_relocation, raw_resume_text, resume_filename, vector_id, created_at`

### Application
`id, candidate_id → candidates, job_id → jobs, overall_score, skill_match_score, experience_score, relevant_experience_years, education_score, recommendation (enum: Strong Yes / Yes / Maybe / No), reasoning, strengths (JSON), gaps (JSON), matched_skills (JSON), missing_skills (JSON), score_details (JSON), status (enum: new / reviewed / interview / rejected), created_at`

### User
`id, email (unique), password_hash, role (employer | candidate), first_name, last_name, title, employer_id → employers, candidate_id → candidates, email_verified, email_verify_token, token_expiry, domain_verified, created_at`

### Question / JobQuestion / Interview / InterviewAnswer
Interview question bank + per-job customization + answer scoring.

---

## Frontend Screens

| Screen | Route Key | Role |
|---|---|---|
| Landing | `landing` | Public |
| AuthScreen | `employer-auth` / `candidate-auth` | Public |
| EmailVerification | `verify-email` | Both |
| EmployerDashboard | `dashboard` | Employer |
| CreateJobPosting | `create-job` | Employer |
| CandidateList | `candidates` | Employer |
| CandidateProfile | `candidate-profile` | Employer |
| JobBrowser | `job-browser` | Candidate |
| JobTracker | `job-tracker` | Candidate |
| ResumeUpload | `resume-upload` | Candidate |
| InterviewRoom | `interview-room` | Candidate |
| HiringManagerProfile | `hiring-manager-profile` | Candidate |

---

## Key API Endpoints

### Jobs
- `POST /api/jobs/extract` — LLM extracts structured fields from pasted JD text
- `POST /api/jobs/guided-extract` — Conversational JD builder (Q&A loop)
- `POST /api/jobs` — Save confirmed job posting
- `GET /api/jobs?employer_id=` — List employer's jobs
- `GET /api/jobs/public` — All jobs (candidate browse)
- `GET /api/jobs/{id}` — Single job detail
- `DELETE /api/jobs/{id}` — Delete job + all applications
- `GET /api/jobs/{id}/candidates` — Vector search + LLM score top candidates
- `GET /api/jobs/{id}/applications` — All applications for a job (ranked by score)

### Candidates
- `POST /api/candidates/extract` — Parse resume → structured profile
- `POST /api/candidates` — Save/update candidate (upsert by email)
- `GET /api/candidates/{id}?job_id=` — Candidate detail + optional per-job application data

### Applications
- `POST /api/applications` — Candidate applies; LLM scoring runs immediately
- `PATCH /api/applications/{id}/status` — Employer updates candidate status
- `GET /api/candidates/{id}/applications` — Candidate's application history
- `GET /api/employers/{id}/applications` — All applications across employer's jobs
- `POST /api/employers/{id}/candidates/search` — AI natural language candidate search

### Auth
- `POST /api/auth/signup` — Register (employer or candidate)
- `POST /api/auth/login` — Returns JWT
- `GET /api/auth/me` — Current user info
- `POST /api/auth/verify-email` — Token-based email verification
- `POST /api/auth/resend-verification`

---

## Core Flows

### JD Extraction
1. Employer pastes JD text → `POST /api/jobs/extract`
2. `extract_jd()` in `jd_extractor.py` sends to LLM, returns `ExtractedJD` with:
   - `education_level` (Bachelor's / Master's / PhD / etc.)
   - `education_field` (e.g. "quantitative field")
   - `education_notes` (e.g. "Master's a plus")
3. Employer reviews pre-filled form, picks field-of-study tags via `FieldOfStudySelector`
4. `POST /api/jobs` saves to Postgres + Qdrant

### Resume Scoring
1. Candidate uploads resume → `POST /api/candidates/extract` (PDF/DOCX parsed, LLM extracts profile)
2. Candidate reviews, fills gaps, saves → `POST /api/candidates` (upserts by email)
3. Candidate applies → `POST /api/applications`
4. `score_resume()` runs immediately: skill match (weighted) + experience + education = `overall_score` 0–100, `recommendation`, `strengths`, `gaps`

---

## Dev Setup

```bash
# Services
docker-compose up -d          # postgres (5432) + qdrant (6333)

# Backend
source .venv/bin/activate
uvicorn api.main:app --reload  # http://localhost:8000

# Frontend
cd hr-opt-frontend
npm run dev                    # http://localhost:5173
```

**`.env` keys:** `LLM_PROVIDER`, `OLLAMA_MODEL`, `OLLAMA_BASE_URL`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `POSTGRES_URL`

> Ollama must be running separately (`ollama serve`) when `LLM_PROVIDER=ollama`.  
> Switch to `LLM_PROVIDER=anthropic` to use Claude API instead.
