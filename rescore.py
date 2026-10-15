"""
Re-score all existing applications with the updated scoring logic.
Run: python3 rescore.py
Optional: python3 rescore.py --candidate "Kevin Park"  (rescore one candidate)
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from src.db import SessionLocal, Application, Job, Candidate
from src.scoring.resume_scorer import score_resume, JDRequirements
from src.parsers.resume import parse_resume, ParsedResume

TARGET = sys.argv[2] if len(sys.argv) > 2 and sys.argv[1] == '--candidate' else None

db = SessionLocal()

rows = (
    db.query(Application, Candidate, Job)
    .join(Candidate, Application.candidate_id == Candidate.id)
    .join(Job, Application.job_id == Job.id)
    .order_by(Candidate.name)
    .all()
)

resume_dir = os.path.join(os.path.dirname(__file__), "test_resumes")

scored = 0
skipped = 0

for app, cand, job in rows:
    if TARGET and TARGET.lower() not in (cand.name or "").lower():
        skipped += 1
        continue

    pdf_name = cand.resume_filename or f"{(cand.name or '').replace(' ', '_')}.pdf"
    pdf_path = os.path.join(resume_dir, pdf_name)

    if os.path.exists(pdf_path):
        parsed = parse_resume(pdf_path)
    elif cand.raw_resume_text:
        parsed = ParsedResume(
            raw_text=cand.raw_resume_text,
            filename=pdf_name,
            file_type=".pdf",
            char_count=len(cand.raw_resume_text),
            word_count=len(cand.raw_resume_text.split()),
        )
    else:
        print(f"  [skip] {cand.name} — no PDF or stored text")
        skipped += 1
        continue

    print(f"  [{scored+1}] {cand.name} → {job.title}...", end="", flush=True)
    try:
        jd_req = JDRequirements(
            title=job.title,
            company=job.company,
            location=job.location,
            required_skills=job.required_skills or [],
            preferred_skills=job.preferred_skills or [],
            min_experience_years=job.min_experience_years or 0,
            education_requirement=job.education_level or "",
            raw_text=job.raw_jd_text or "",
            skill_weights=job.skill_weights or {},
        )
        score = score_resume(parsed, jd_req)

        app.overall_score = score.overall_score
        app.skill_match_score = score.skill_match_score
        app.experience_score = score.experience_score
        app.relevant_experience_years = score.relevant_experience_years
        app.education_score = score.education_score
        app.reasoning = score.reasoning
        app.strengths = score.strengths
        app.gaps = score.gaps
        app.recommendation = score.recommendation
        app.matched_skills = score.matched_skills
        app.missing_skills = score.missing_skills
        app.score_details = score.score_details
        db.commit()

        print(f" ✓ overall={score.overall_score} skills={score.skill_match_score} exp={score.experience_score} rec={score.recommendation}")
        scored += 1
    except Exception as e:
        db.rollback()
        print(f" ERROR: {e}")

db.close()
print(f"\nDone. Rescored {scored}, skipped {skipped}.")
