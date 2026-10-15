"""
Backfill script: generate jd_summary and jd_standardized for existing jobs.

Usage:
    python3 generate_jd_presentations.py            # all jobs missing presentation
    python3 generate_jd_presentations.py --force    # regenerate all jobs
    python3 generate_jd_presentations.py --job-id <id>
"""
import sys
import argparse
from src.db import SessionLocal, Job
from src.scoring.jd_extractor import generate_jd_presentation

def run(force=False, job_id=None):
    db = SessionLocal()
    try:
        q = db.query(Job)
        if job_id:
            q = q.filter(Job.id == job_id)
        elif not force:
            q = q.filter((Job.jd_summary == None) | (Job.jd_summary == ""))

        jobs = q.all()
        if not jobs:
            print("No jobs to process.")
            return

        print(f"Processing {len(jobs)} job(s)...")
        for i, job in enumerate(jobs, 1):
            print(f"[{i}/{len(jobs)}] {job.title} @ {job.company} ({job.id[:8]}...)", end=" ", flush=True)
            try:
                pres = generate_jd_presentation(
                    raw_text=job.raw_jd_text or "",
                    title=job.title,
                    company=job.company,
                    required_skills=job.required_skills or [],
                    preferred_skills=job.preferred_skills or [],
                    salary_min=job.salary_min or 0,
                    salary_max=job.salary_max or 0,
                    employment_type=str(job.employment_type.value) if job.employment_type else "",
                    location=job.location,
                    min_experience_years=job.min_experience_years or 0,
                )
                job.jd_summary = pres.get("summary", "")
                job.jd_standardized = pres.get("standardized", "")
                db.commit()
                print("✓")
            except Exception as e:
                print(f"✗ {e}")
                db.rollback()

        print("Done.")
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--force", action="store_true", help="Regenerate even if already present")
    parser.add_argument("--job-id", help="Process a single job by ID")
    args = parser.parse_args()
    run(force=args.force, job_id=args.job_id)
