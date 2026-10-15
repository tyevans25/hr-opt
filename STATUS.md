# HR-Opt — Status & Backlog

_Last updated: September 2026_

---

## What's Working ✅

- **Auth** — Signup/login for employer and candidate roles, JWT sessions, email verification flow (token generated, verify screen, banner prompt)
- **Job Posting (employer)** — Two paths:
  - Paste JD → LLM extracts fields → employer reviews/edits → save
  - Guided conversational builder (Q&A loop)
  - Education split into: Level (dropdown) + Field of Study (tag selector, 25 tags, 7 categories) + Notes (free text)
  - Skill weights editor, application deadline field
- **Candidate Profile** — Upload resume → LLM extracts profile → candidate reviews/edits → save; upserts on re-upload
- **Job Browser (candidate)** — Browse all open jobs, see standardized JD, apply with one tap
- **My Applications / Job Tracker (candidate)** — Applied jobs with score band, strengths, gaps, status
- **Applications (employer)** — Ranked applicant list per job with scores, recommendation labels, skill match breakdown, status management (new / reviewed / interview / rejected)
- **Candidate Profile detail (employer)** — Full profile + per-job scores, matched/missing skills
- **AI candidate search** — Natural language query → structured filters
- **Hiring Manager profile** — Public page with name, title, posted jobs
- **Interview Room** — Candidate answers curated questions; LLM summarizes
- **Vector search** — Qdrant semantic search narrows candidate pool before LLM scoring
- **Employer Dashboard** — Job list with applicant counts, navigate to candidates

---

## Known Bugs 🐛

| # | Bug | File | Status |
|---|---|---|---|
| 1 | `education_fields` tag column exists on Job + Candidate models but not compared during scoring | `src/scoring/resume_scorer.py` | Open |

> Previously reported bugs (missing Application import, education_requirement AttributeError, duplicate email crash) are all fixed in the current codebase.

---

## Backlog 📋

### High Priority

**Employer — Candidate Cards & Filtering**
- Surface `reasoning`, `strengths`, `gaps` on CandidateList cards (data is in the API response, just not shown)
- Sort by: score (default), name, recommendation label
- Filter by: status, recommendation
- Add fast local name search alongside AI search

**Candidate — Score Detail in JobTracker**
- Render `strengths` and `gaps` bullet lists (currently only shows the score band label)

**Email Sending**
- Verification token is generated but email is never sent — wire up Resend API (`RESEND_API_KEY` in `.env`)
- Domain badge: MX record check for institutional emails

### Medium Priority

**"Posted by" on Job Cards**
- HiringManagerProfile page exists; just needs a link from job cards in JobBrowser

**Education Tag Matching in Scoring**
- `education_fields` tags saved on both Job and Candidate — add overlap check in `resume_scorer.py` to boost education score when tags match

**Better API Error Messages**
- Errors hit the UI as "unknown error" — surface the `detail` field from backend JSON responses

### Lower Priority

- Score history (trend across re-applications)
- Employer analytics (average score per job, funnel conversion)
- "Jobs you might like" recommendations for candidates (vector similarity already there)
- Interview question customization per job (JobQuestion table exists, UI not built)

---

## Architecture Notes

- All scoring is LLM-based, not rule-based — switch providers in `.env` without touching code
- `education_requirement` column on Job kept for backward compat; `education_level` is the active field
- `jd_summary` and `jd_standardized` generated async (background thread) after job save for candidate-facing display
- Qdrant has two collections: one for jobs, one for candidates
