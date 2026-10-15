"""
Re-extract candidate profiles from resume PDFs.
Updates work_experience (with descriptions + normalised dates), education, skills,
and years_of_experience in the DB.

Usage:
  python3 reextract.py                          # all candidates with a PDF on disk
  python3 reextract.py --candidate "Tyra Evans" # one candidate by name
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))

from src.db import SessionLocal, Candidate
from src.parsers.resume import parse_resume, ParsedResume
from src.parsers.resume_profile_extractor import extract_candidate_profile

TARGET = sys.argv[2] if len(sys.argv) > 2 and sys.argv[1] == '--candidate' else None

resume_dir = os.path.join(os.path.dirname(__file__), "test_resumes")
db = SessionLocal()

candidates = db.query(Candidate).order_by(Candidate.name).all()
done = 0
skipped = 0

for cand in candidates:
    if TARGET and TARGET.lower() not in (cand.name or "").lower():
        skipped += 1
        continue

    pdf_name = cand.resume_filename or f"{(cand.name or '').replace(' ', '_')}.pdf"
    pdf_path = os.path.join(resume_dir, pdf_name)

    if os.path.exists(pdf_path):
        raw_text = parse_resume(pdf_path).raw_text
    elif cand.raw_resume_text:
        raw_text = cand.raw_resume_text
    else:
        print(f"  [skip] {cand.name} \u2014 no PDF or stored text")
        skipped += 1
        continue

    print(f"  [{done+1}] {cand.name}...", end="", flush=True)
    try:
        profile = extract_candidate_profile(raw_text)

        # Update only profile-extraction fields; keep candidate preferences untouched
        cand.work_experience = profile.work_experience
        cand.education = profile.education
        cand.skills = profile.skills or cand.skills
        if profile.years_of_experience:
            cand.years_of_experience = profile.years_of_experience
        db.commit()

        roles = [e.get("title", "?") for e in (profile.work_experience or [])]
        print(f" ✓  {len(profile.work_experience)} roles: {', '.join(roles[:3])}")
        done += 1
    except Exception as e:
        db.rollback()
        print(f" ERROR: {e}")

db.close()
print(f"\nDone. Re-extracted {done}, skipped {skipped}.")
