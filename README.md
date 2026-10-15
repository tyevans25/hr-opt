# HR-Opt

An AI-powered hiring platform that automates resume screening, candidate scoring, and job matching. Employers post jobs by pasting a job description — an LLM extracts structured requirements automatically. Candidates upload a resume — the platform parses it, embeds it, and scores it against open roles in real time.

Built as a portfolio project by Tyra Evans and a collaborator.

---

## What it does

**For employers**
- Paste any job description → LLM extracts skills, experience requirements, education, salary range
- Review and post the job in under a minute
- See every applicant ranked by overall match score (0–100) with strengths and gaps called out
- Filter and search candidates with natural language ("show me candidates with 3+ years of Python")
- Track applicant status (New → Reviewed → Interview → Rejected)

**For candidates**
- Upload a resume (PDF or DOCX) → profile extracted automatically
- Browse open roles and apply with one click
- See your match score immediately after applying
- Track all your applications and their statuses
- Complete AI-guided video interviews for roles that reach the interview stage

**Under the hood**
- Sentence-transformer embeddings + Qdrant vector search surface the most relevant candidates before LLM scoring
- LLM scoring evaluates skill match (weighted), years of experience, education fit, and role relevance
- Scoring returns a structured result: `overall_score`, `recommendation` (Strong Yes / Yes / Maybe / No), `strengths`, `gaps`, `matched_skills`, `missing_skills`
- Video interview transcripts are scored by LLM and summarized with strengths, notable answers, and flags

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite + TypeScript |
| Backend | FastAPI (Python 3.11+) |
| Database | PostgreSQL 16 (Docker) |
| Vector DB | Qdrant (Docker) |
| Embeddings | `all-MiniLM-L6-v2` via sentence-transformers |
| LLM | Configurable: Ollama (local), Anthropic Claude, or GSU hosted |
| Auth | JWT (HS256), role-based: `employer` \| `candidate` |

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (running)
- Python 3.11+ with a virtual environment
- Node.js 18+ and npm
- [Ollama](https://ollama.com) — only if using a local LLM (`LLM_PROVIDER=ollama`)

---

## Getting started

### 1. Clone the repo

```bash
git clone <repo-url>
cd hr-opt
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your values. At minimum you need one LLM provider configured and the database URLs (the Docker defaults work out of the box).

| Key | Description |
|---|---|
| `LLM_PROVIDER` | `ollama`, `anthropic`, or `gsu` |
| `OLLAMA_MODEL` | e.g. `llama3.1:8b` (if using Ollama) |
| `OLLAMA_BASE_URL` | e.g. `http://localhost:11434` |
| `ANTHROPIC_API_KEY` | Your Anthropic key (if using Claude) |
| `ANTHROPIC_MODEL` | e.g. `claude-sonnet-4-6` |
| `GSU_BASE_URL` | GSU hosted model base URL (if using GSU) |
| `GSU_MODEL` | GSU model name |
| `GSU_API_KEY` | GSU API key |
| `POSTGRES_URL` | `postgresql://hropt:hropt123@localhost:5432/hropt` |
| `QDRANT_URL` | `http://localhost:6333` |
| `JWT_SECRET` | Any long random string — change this in production |
| `RESEND_API_KEY` | For email verification (optional, not yet wired up) |

### 3. Start the databases

```bash
docker compose up -d
```

This starts Postgres (port 5432) and Qdrant (port 6333). Data persists in Docker volumes across restarts.

### 4. Set up the Python environment

```bash
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 5. Seed the database

This creates the tables and seeds the interview question bank:

```bash
python seed_data.py
python seed_questions.py
```

### 6. Start the backend

```bash
uvicorn api.main:app --reload
```

API runs at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

### 7. Start the frontend

```bash
cd hr-opt-frontend
npm install
npm run dev
```

UI runs at `http://localhost:5173`.

### 8. (Optional) Pull a local LLM

If `LLM_PROVIDER=ollama` in your `.env`:

```bash
ollama pull llama3.1:8b
ollama serve
```

---

## Project structure

```
hr-opt/
├── api/
│   ├── main.py          # FastAPI app, CORS, router mounting
│   ├── routes.py        # All API endpoints
│   └── auth.py          # JWT signup / login / verify
│
├── src/
│   ├── db.py            # SQLAlchemy models + enums
│   ├── services.py      # save_job, save_candidate, get_top_candidates
│   ├── embeddings.py    # Qdrant upsert / search
│   ├── auth.py          # JWT encode / decode
│   ├── interview/
│   │   └── transcript_scorer.py  # LLM: score + summarize interview transcripts
│   ├── llm/
│   │   ├── client.py            # get_llm_client() — picks provider from env
│   │   └── providers/
│   │       ├── anthropic.py
│   │       ├── ollama.py
│   │       └── gsu.py
│   ├── parsers/
│   │   ├── resume.py                    # PDF/DOCX → raw text
│   │   └── resume_profile_extractor.py  # LLM: raw text → structured profile
│   └── scoring/
│       ├── jd_extractor.py     # LLM: JD text → ExtractedJD
│       └── resume_scorer.py    # LLM: score resume vs job requirements
│
├── hr-opt-frontend/
│   └── src/
│       ├── App.tsx          # Shell, session state, screen routing
│       ├── api.ts           # All typed fetch calls to the backend
│       ├── screens/         # One file per screen
│       ├── components/      # Shared UI (Card, Sidebar, etc.)
│       └── hooks/
│
├── docker-compose.yml   # Postgres + Qdrant
├── seed_data.py         # Seeds tables and sample data
├── seed_questions.py    # Seeds the interview question bank (run after seed_data.py)
├── .env.example         # Copy to .env and fill in your values
└── .gitignore
```

---

## How the core flows work

### Job posting
1. Employer pastes a job description into the UI
2. `POST /api/jobs/extract` — LLM parses it into structured fields (skills, experience, education, salary)
3. Employer reviews and edits, then confirms
4. `POST /api/jobs` — saved to Postgres; job embedding stored in Qdrant

### Candidate application
1. Candidate uploads a resume (PDF or DOCX)
2. `POST /api/candidates/extract` — text extracted, LLM builds structured profile
3. Candidate reviews their profile, fills any gaps, saves
4. Candidate clicks Apply on a job → `POST /api/applications`
5. Scoring runs immediately: vector search narrows candidates, then LLM scores on skill match, experience, and education
6. Result: `overall_score` (0–100), `recommendation`, `strengths`, `gaps`, `matched_skills`, `missing_skills`

### Video interview
1. When an employer moves a candidate to "Interview" status, a "Start Video Interview" button appears in the candidate's job tracker
2. Candidate is shown questions one at a time, each with a 90-second timer and up to 2 takes
3. Webcam video is recorded in-browser; speech-to-text captures a live transcript
4. On submit, video files and transcripts are posted to `POST /api/interviews/video`
5. Backend calls `summarize_interview()` — LLM returns a summary, strengths, notable answers, and any flags
6. Candidate sees their results; videos are saved to `interview_videos/{interview_id}/`

### Employer review
- `GET /api/jobs/{id}/applications` — returns all applicants ranked by score
- `PATCH /api/applications/{id}/status` — move candidate through the pipeline

---

## Stopping and resetting

```bash
# Stop everything, keep all data
docker compose down

# ⚠️ Stop and wipe ALL data (jobs, candidates, applications, embeddings)
docker compose down -v
```

---

## Contributing

1. Branch off `main` — name it `feature/your-thing` or `fix/your-thing`
2. Backend changes: add routes to `api/routes.py`, models to `src/db.py`, logic to `src/`
3. Frontend changes: screens live in `hr-opt-frontend/src/screens/`, one file each; shared components in `components/`
4. The app uses `useState<Screen>` for navigation — no React Router. To add a screen, add its key to the `Screen` type in `App.tsx` and a case in `renderScreen()`
5. Test LLM flows locally with Ollama before switching to Anthropic — saves API costs
6. Open a PR with a short description of what changed and why

---

## Known gaps / backlog

- Email verification sending not wired up (needs `RESEND_API_KEY` + Resend integration)
- Education field tags saved on job and candidate profiles but not yet compared in scoring
- Webcam preview during video interview recording needs a fix (feed not showing)
- Interview question customization per job (DB table exists, UI not built)
- Employer analytics (average score per job, funnel metrics)
