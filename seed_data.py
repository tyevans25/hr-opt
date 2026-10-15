"""
Seed script: creates jobs and processes test resumes into candidates + applications.
Run from project root with venv active:
  python3 seed_data.py
"""
import uuid
import os
import sys
import re
from dataclasses import asdict
import re
from dataclasses import asdict

# ── env setup ──────────────────────────────────────────────────────────────
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault("PYTHONPATH", os.path.dirname(__file__))

from src.db import SessionLocal, Job, Candidate, Application, Employer
from src.scoring.jd_extractor import ExtractedJD
from src.scoring.resume_scorer import JDRequirements, score_resume
from src.parsers.resume import parse_resume
from src.parsers.resume_profile_extractor import extract_candidate_profile
from src.services import save_job, save_candidate
from src.embeddings import upsert_candidate, upsert_job

# ── Employer IDs from DB ────────────────────────────────────────────────────
FANDUEL_EMPLOYER_ID   = "9aefc6ff-0648-4d57-bed8-0c6cb1c9470b"
GSU_EMPLOYER_ID       = "60c2a385-5c4c-4628-8ed0-8426889877fa"

# ── Existing job IDs (don't re-create) ──────────────────────────────────────
FANDUEL_DS_JOB_ID     = "b28296ad-..."   # Data Scientist, Experimentation — already seeded
GSU_SYSADMIN_JOB_ID   = "d9139a05-..."   # Systems Administrator, Lead

# ── Jobs to create ──────────────────────────────────────────────────────────
NEW_JOBS = [
    # ── FanDuel ─────────────────────────────────────────────────────────────
    {
        "employer_id": FANDUEL_EMPLOYER_ID,
        "jd": ExtractedJD(
            title="Senior Backend Engineer",
            company="FanDuel",
            location="New York, NY (Hybrid)",
            industry="Sports Betting",
            salary_min=150_000,
            salary_max=200_000,
            required_skills=["Python", "Go", "PostgreSQL", "Redis", "Kafka", "AWS", "REST APIs", "System Design", "Microservices"],
            preferred_skills=["Terraform", "gRPC", "Kubernetes", "Docker", "Distributed Systems"],
            min_experience_years=5,
            education_level="Bachelor's",
            education_field="Computer Science,Engineering",
            employment_type="hybrid",
            is_complete=True,
            raw_text="Senior Backend Engineer at FanDuel. Build and scale the platform handling millions of sports bets. "
                     "We need engineers with deep expertise in distributed systems, high-throughput APIs, and event-driven architecture. "
                     "5+ years backend experience required. Python or Go, PostgreSQL, Redis, Kafka, AWS. "
                     "Salary: $150,000 – $200,000. Hybrid, New York.",
        ),
        "skill_weights": {
            "Python": 5, "Go": 4, "PostgreSQL": 5, "Redis": 4,
            "Kafka": 4, "AWS": 4, "System Design": 5, "Microservices": 4,
        },
    },
    {
        "employer_id": FANDUEL_EMPLOYER_ID,
        "jd": ExtractedJD(
            title="Senior Product Manager – Sportsbook",
            company="FanDuel",
            location="New York, NY",
            industry="Sports Betting",
            salary_min=130_000,
            salary_max=175_000,
            required_skills=["Product Strategy", "Roadmapping", "A/B Testing", "SQL", "User Research", "Agile", "OKRs", "Stakeholder Management"],
            preferred_skills=["JIRA", "Figma", "Go-to-Market", "Data Analysis", "Sports Industry Knowledge"],
            min_experience_years=4,
            education_level="Bachelor's",
            education_field="Business,Computer Science,Engineering",
            employment_type="onsite",
            is_complete=True,
            raw_text="Senior Product Manager at FanDuel Sportsbook. Own product areas driving user engagement and revenue. "
                     "Partner with engineering, design, and data science. 4+ years PM experience. "
                     "Strong SQL skills and data-driven mindset required. Salary: $130,000 – $175,000. New York.",
        ),
        "skill_weights": {
            "Product Strategy": 5, "A/B Testing": 5, "SQL": 4,
            "User Research": 4, "Roadmapping": 4, "Agile": 3,
        },
    },

    # ── Georgia State University ─────────────────────────────────────────────
    {
        "employer_id": GSU_EMPLOYER_ID,
        "jd": ExtractedJD(
            title="Data Engineer",
            company="Georgia State University",
            location="Atlanta, GA",
            industry="Education",
            salary_min=75_000,
            salary_max=100_000,
            required_skills=["Python", "SQL", "ETL Pipelines", "Data Warehousing", "PostgreSQL", "AWS", "Apache Airflow"],
            preferred_skills=["Spark", "dbt", "Snowflake", "Tableau", "Power BI", "Docker"],
            min_experience_years=3,
            education_level="Bachelor's",
            education_field="Computer Science,Information Systems,Data Science",
            employment_type="hybrid",
            is_complete=True,
            raw_text="Data Engineer at Georgia State University. Build and maintain data pipelines supporting institutional "
                     "research and student analytics. 3+ years experience with Python, SQL, ETL, and cloud platforms. "
                     "Salary: $75,000 – $100,000. Hybrid, Atlanta, GA.",
        ),
        "skill_weights": {
            "Python": 5, "SQL": 5, "ETL Pipelines": 5,
            "PostgreSQL": 4, "AWS": 4, "Apache Airflow": 4,
        },
    },
    {
        "employer_id": GSU_EMPLOYER_ID,
        "jd": ExtractedJD(
            title="HR Generalist",
            company="Georgia State University",
            location="Atlanta, GA",
            industry="Education",
            salary_min=55_000,
            salary_max=75_000,
            required_skills=["Employee Relations", "Recruiting", "HRIS", "Onboarding", "Benefits Administration", "Performance Management", "Labor Law"],
            preferred_skills=["Workday", "ATS Systems", "DEI Programs", "Compensation", "FMLA", "ADA"],
            min_experience_years=3,
            education_level="Bachelor's",
            education_field="Human Resources,Business,Psychology",
            employment_type="onsite",
            is_complete=True,
            raw_text="HR Generalist at Georgia State University. Support faculty and staff HR needs across recruiting, "
                     "employee relations, benefits, and compliance. 3+ years HR experience required. "
                     "Workday and ATS experience a plus. Salary: $55,000 – $75,000. Atlanta, GA.",
        ),
        "skill_weights": {
            "Employee Relations": 5, "Recruiting": 4, "HRIS": 4,
            "Performance Management": 4, "Labor Law": 3, "Onboarding": 3,
        },
    },
    {
        "employer_id": GSU_EMPLOYER_ID,
        "jd": ExtractedJD(
            title="Mathematics Instructor",
            company="Georgia State University",
            location="Atlanta, GA",
            industry="Education",
            salary_min=55_000,
            salary_max=78_000,
            required_skills=["Curriculum Development", "Mathematics", "Undergraduate Teaching", "Student Assessment", "Canvas LMS", "Differentiated Instruction"],
            preferred_skills=["AP Curriculum", "STEM Education", "Data-Driven Instruction", "Google Classroom", "Tutoring", "Calculus", "Statistics"],
            min_experience_years=3,
            education_level="Master's",
            education_field="Mathematics,Education,STEM",
            employment_type="onsite",
            is_complete=True,
            raw_text="Mathematics Instructor at Georgia State University. Teach undergraduate math courses including "
                     "calculus, statistics, and algebra. Develop curriculum aligned to learning objectives. "
                     "Master's required. 3+ years teaching experience preferred. Salary: $55,000 – $78,000. Atlanta, GA.",
        ),
        "skill_weights": {
            "Curriculum Development": 5, "Mathematics": 5, "Undergraduate Teaching": 5,
            "Student Assessment": 4, "Canvas LMS": 3, "STEM Education": 4,
        },
    },
]

# ── Candidate → Job assignments ─────────────────────────────────────────────
# Each tuple: (pdf_filename, known_email, [list of job_title strings to apply to])
# Known email lets us skip LLM extraction when the candidate already exists.
ASSIGNMENTS = [
    ("Jordan_Mitchell.pdf",  "jordan.mitchell@email.com",  ["Data Scientist, Experimentation", "Data Engineer"]),
    ("Kevin_Park.pdf",       "kevin.park@email.com",       ["Data Scientist, Experimentation"]),
    ("Emily_Rodriguez.pdf",  "emily.rodriguez@email.com",  ["Data Scientist, Experimentation", "Data Engineer"]),
    ("James_Okonkwo.pdf",    "james.okonkwo@email.com",    ["Data Scientist, Experimentation", "Data Engineer"]),
    ("Lena_Fischer.pdf",     "lena.fischer@email.com",     ["Senior Backend Engineer"]),
    ("Marcus_Johnson.pdf",   "marcus.johnson@email.com",   ["Senior Backend Engineer", "Systems Administrator, Lead"]),
    ("Tyler_Brooks.pdf",     "tyler.brooks@email.com",     ["Systems Administrator, Lead"]),
    ("Simone_Barrett.pdf",   "simone.barrett@email.com",   ["HR Generalist"]),
    ("Daniel_Novak.pdf",     "daniel.novak@email.com",     ["HR Generalist"]),
    ("Hassan_Ali.pdf",       "hassan.ali@email.com",       ["Senior Product Manager – Sportsbook"]),
    ("Sarah_Chen.pdf",       "sarah.chen@email.com",       ["Senior Product Manager – Sportsbook"]),
    ("Keisha_Robinson.pdf",  "keisha.robinson@email.com",  ["Mathematics Instructor"]),
    ("Andre_Washington.pdf", "andre.washington@email.com", ["Systems Administrator, Lead"]),
]


def get_job_by_title(db, title: str) -> Job | None:
    return db.query(Job).filter(Job.title == title).first()


def candidate_already_exists(db, email: str) -> Candidate | None:
    return db.query(Candidate).filter(Candidate.email == email).first()


def application_exists(db, candidate_id: str, job_id: str) -> bool:
    return db.query(Application).filter(
        Application.candidate_id == candidate_id,
        Application.job_id == job_id,
    ).first() is not None


def main():
    db = SessionLocal()

    # ── Step 1: create new jobs ──────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("STEP 1: Creating jobs")
    print("=" * 60)

    job_title_to_id: dict[str, str] = {}

    # Collect existing jobs
    for job in db.query(Job).all():
        job_title_to_id[job.title] = job.id
        print(f"  [existing] {job.title}")

    for spec in NEW_JOBS:
        title = spec["jd"].title
        if get_job_by_title(db, title):
            print(f"  [skip]     {title} (already exists)")
            continue
        try:
            result = save_job(
                spec["jd"],
                employer_id=spec["employer_id"],
                skill_weights=spec["skill_weights"],
            )
            job_title_to_id[title] = result["job_id"]
            print(f"  [created]  {title} → {result['job_id'][:8]}...")
        except Exception as e:
            print(f"  [error]    {title}: {e}")

    db.close()
    db = SessionLocal()

    # Refresh mapping after inserts
    for job in db.query(Job).all():
        job_title_to_id[job.title] = job.id

    # ── Step 2: process resumes + create applications ────────────────────────
    print("\n" + "=" * 60)
    print("STEP 2: Processing resumes → candidates → applications")
    print("=" * 60)

    resume_dir = os.path.join(os.path.dirname(__file__), "test_resumes")
    llm = None  # lazy init

    for pdf_name, known_email, job_titles in ASSIGNMENTS:
        pdf_path = os.path.join(resume_dir, pdf_name)
        if not os.path.exists(pdf_path):
            print(f"\n[missing] {pdf_name} not found, skipping")
            continue

        print(f"\n── {pdf_name} ──")

        # Fast path: if we already have this candidate by email, skip LLM extraction
        db.close()
        db = SessionLocal()
        existing_by_email = candidate_already_exists(db, known_email) if known_email else None

        if existing_by_email:
            candidate_id = existing_by_email.id
            name = existing_by_email.name or pdf_name.replace(".pdf", "").replace("_", " ")
            print(f"  [existing candidate] {name} ({candidate_id[:8]}...)")
            # Still need parsed resume for scoring
            try:
                parsed = parse_resume(pdf_path)
            except Exception as e:
                print(f"  [error] parse: {e}")
                continue
        else:
            # Parse PDF
            try:
                parsed = parse_resume(pdf_path)
            except Exception as e:
                print(f"  [error] parse: {e}")
                continue

            # Extract profile via LLM (only needed for new candidates)
            try:
                profile = extract_candidate_profile(parsed.raw_text)
            except Exception as e:
                print(f"  [error] extract profile: {e}")
                continue

            email_match = re.search(r'[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}', parsed.raw_text)
            email = email_match.group(0).lower().strip() if email_match else known_email
            name  = profile.name or pdf_name.replace(".pdf", "").replace("_", " ")

            # Convert dataclass to dict for save_candidate
            profile_dict = {
                "name": profile.name,
                "location": profile.location,
                "skills": profile.skills,
                "work_experience": profile.work_experience,
                "education": profile.education,
                "years_of_experience": profile.years_of_experience,
                "desired_roles": profile.desired_roles,
                "salary_min": profile.salary_min,
                "salary_max": profile.salary_max,
                "work_preference": profile.work_preference,
                "open_to_relocation": profile.open_to_relocation,
                "first_name": (profile.name or "").split()[0] if profile.name else None,
                "last_name": " ".join((profile.name or "").split()[1:]) if profile.name else None,
            }

            # Save candidate
            try:
                result = save_candidate(
                    parsed=parsed,
                    extracted=profile_dict,
                    email=email,
                )
                candidate_id = result["candidate_id"]
                print(f"  [created candidate] {name} ({candidate_id[:8]}...)")
            except Exception as e:
                print(f"  [error] save candidate: {e}")
                continue

        db.close()
        db = SessionLocal()

        # Score + apply to each assigned job
        for job_title in job_titles:
            job_id = job_title_to_id.get(job_title)
            if not job_id:
                print(f"  [skip] job '{job_title}' not found in DB")
                continue

            if application_exists(db, candidate_id, job_id):
                print(f"  [existing] already applied to '{job_title}'")
                continue

            # Load job
            job = db.query(Job).filter(Job.id == job_id).first()
            if not job:
                print(f"  [skip] job '{job_title}' not in DB")
                continue

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

            print(f"  [scoring] '{job_title}'...", end="", flush=True)
            try:
                score = score_resume(parsed, jd_req)
            except Exception as e:
                print(f" ERROR: {e}")
                continue

            # Save application
            app = Application(
                id=str(uuid.uuid4()),
                candidate_id=candidate_id,
                job_id=job_id,
                overall_score=score.overall_score,
                skill_match_score=score.skill_match_score,
                experience_score=score.experience_score,
                education_score=score.education_score,
                reasoning=score.reasoning,
                strengths=score.strengths,
                gaps=score.gaps,
                recommendation=score.recommendation,
                matched_skills=score.matched_skills,
                missing_skills=score.missing_skills,
                score_details=score.score_details,
                status="new",
            )
            db.add(app)
            db.commit()
            print(f" ✓ score={score.overall_score} rec={score.recommendation}")

    db.close()
    print("\n" + "=" * 60)
    print("Seeding complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()
