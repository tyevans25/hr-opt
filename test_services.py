from src.scoring.jd_extractor import extract_jd
from src.parsers.resume import parse_resume
from src.services import save_job, save_candidate, get_top_candidates_for_job
from src.db import SessionLocal, Employer

# Seed test employer if not exists
db = SessionLocal()
if not db.query(Employer).filter(Employer.id == "employer-001").first():
    db.add(Employer(
        id="employer-001",
        company_name="FanDuel",
        email="hr@fanduel.com",
        industry="Sports Betting"
    ))
    db.commit()
    print("Test employer seeded.")
db.close()

# --- Save a job ---
print("Saving job...")
with open("sample_jd.txt", "r") as f:
    jd_text = f.read()

jd = extract_jd(jd_text)
job_result = save_job(jd, employer_id="employer-001")
print(f"Job saved: {job_result}")

# --- Save a candidate ---
print("\nSaving candidate...")
parsed = parse_resume("Resume_Tyra_Evans_Data_Scientist_2026-07-2.pdf")

# Manual profile for now (extractor comes next)
candidate_profile = {
    "name": "Tyra Evans",
    "location": "Atlanta, GA",
    "skills": ["Python", "PySpark", "SQL", "Bayesian modeling", "causal inference", "machine learning", "Databricks", "Snowflake", "A/B testing"],
    "work_experience": [
        {"title": "Graduate Research Assistant", "company": "Georgia State University / FanDuel"},
        {"title": "Actuarial Analyst", "company": "AIG"}
    ],
    "education": [
        {"degree": "MS Data Science and Analytics", "school": "Georgia State University"},
        {"degree": "BBA Actuarial Science", "school": "Georgia State University"}
    ],
    "years_of_experience": 3,
    "desired_roles": ["Data Scientist", "ML Engineer", "Analytics Engineer"],
    "salary_min": 95000,
    "salary_max": 130000,
    "work_preference": "hybrid",
    "open_to_relocation": True
}

candidate_result = save_candidate(parsed, candidate_profile, email="tyra.dawn.evans@gmail.com")
print(f"Candidate saved: {candidate_result}")

# --- Match candidates to job ---
print("\nFinding and scoring top candidates for job...")
top = get_top_candidates_for_job(job_result["job_id"], top_k=5)
for t in top:
    print(f"\n  {t['name']}")
    print(f"  Vector Similarity: {t['vector_similarity']}%")
    print(f"  Overall Score:     {t['overall_score']}/100")
    print(f"  Recommendation:    {t['recommendation']}")
