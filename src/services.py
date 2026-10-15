import uuid
from sqlalchemy.orm import Session
from src.db import Job, Candidate, Application, SessionLocal
from src.embeddings import upsert_job, upsert_candidate, find_matching_candidates, find_matching_jobs
from src.scoring.jd_extractor import ExtractedJD
from src.scoring.resume_scorer import score_resume, JDRequirements
from src.parsers.resume import ParsedResume


# --- Job Services ---

def save_job(jd: ExtractedJD, employer_id: str, skill_weights: dict = None, posted_by_user_id: str = None, application_deadline=None, education_fields: list = None) -> dict:
    """Save a completed JD to Postgres and embed in Qdrant."""
    db: Session = SessionLocal()
    try:
        job_id = str(uuid.uuid4())

        # Build dict for embedding
        job_dict = {
            "title": jd.title,
            "company": jd.company,
            "location": jd.location,
            "industry": jd.industry,
            "salary_min": jd.salary_min,
            "salary_max": jd.salary_max,
            "required_skills": jd.required_skills,
            "preferred_skills": jd.preferred_skills,
            "min_experience_years": jd.min_experience_years,
            "education_requirement": jd.education_level,  # backward compat
            "education_level": jd.education_level,
            "education_field": jd.education_field,
            "education_fields": education_fields or [],
            "education_notes": jd.education_notes,
            "employment_type": jd.employment_type,
            "skill_weights": skill_weights or {},
        }

        # Normalize employment_type to lowercase
        if job_dict.get("employment_type"):
            job_dict["employment_type"] = job_dict["employment_type"].lower()

        # Embed in Qdrant
        vector_id = upsert_job(job_id, job_dict)

        # Save to Postgres
        job = Job(
            id=job_id,
            employer_id=employer_id,
            vector_id=vector_id,
            raw_jd_text=jd.raw_text,
            posted_by_user_id=posted_by_user_id,
            application_deadline=application_deadline,
            **job_dict
        )
        db.add(job)
        db.commit()
        db.refresh(job)

        return {"job_id": job_id, "vector_id": vector_id}
    finally:
        db.close()


def get_job(job_id: str) -> dict | None:
    """Retrieve a job by ID."""
    db: Session = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            return None
        return {
            "job_id": job.id,
            "title": job.title,
            "company": job.company,
            "location": job.location,
            "industry": job.industry,
            "salary_min": job.salary_min,
            "salary_max": job.salary_max,
            "required_skills": job.required_skills,
            "preferred_skills": job.preferred_skills,
            "min_experience_years": job.min_experience_years,
            "education_requirement": job.education_requirement,
            "employment_type": job.employment_type,
            "created_at": str(job.created_at)
        }
    finally:
        db.close()


# --- Candidate Services ---

def save_candidate(
    parsed: ParsedResume,
    extracted: dict,
    email: str,
) -> dict:
    """Save or update a candidate profile in Postgres and Qdrant."""
    db: Session = SessionLocal()
    try:
        # Check if candidate already exists
        existing = db.query(Candidate).filter(Candidate.email == email).first()
        if existing:
            candidate_id = existing.id
        else:
            candidate_id = str(uuid.uuid4())

        candidate_dict = {
            "name": extracted.get("name", ""),
            "first_name": extracted.get("first_name"),
            "last_name": extracted.get("last_name"),
            "location": extracted.get("location", ""),
            "skills": extracted.get("skills", []),
            "work_experience": extracted.get("work_experience", []),
            "education": extracted.get("education", []),
            "years_of_experience": extracted.get("years_of_experience", 0),
            "desired_roles": extracted.get("desired_roles", []),
            "salary_min": extracted.get("salary_min"),
            "salary_max": extracted.get("salary_max"),
            "work_preference": extracted.get("work_preference"),
            "open_to_relocation": extracted.get("open_to_relocation", False),
        }

        # Embed in Qdrant
        vector_id = upsert_candidate(candidate_id, candidate_dict)

        # Save or update Postgres
        existing = db.query(Candidate).filter(Candidate.email == email).first()
        if existing:
            for key, value in candidate_dict.items():
                setattr(existing, key, value)
            existing.vector_id = vector_id
            existing.raw_resume_text = parsed.raw_text
            existing.resume_filename = parsed.filename
            db.commit()
            db.refresh(existing)
        else:
            candidate = Candidate(
                id=candidate_id,
                email=email,
                vector_id=vector_id,
                raw_resume_text=parsed.raw_text,
                resume_filename=parsed.filename,
                **candidate_dict
            )
            db.add(candidate)
            db.commit()

        return {"candidate_id": candidate_id, "vector_id": vector_id}
    finally:
        db.close()


def get_candidate(candidate_id: str) -> dict | None:
    """Retrieve a candidate by ID."""
    db: Session = SessionLocal()
    try:
        c = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        if not c:
            return None
        return {
            "candidate_id": c.id,
            "name": c.name,
            "email": c.email,
            "location": c.location,
            "skills": c.skills,
            "work_experience": c.work_experience,
            "education": c.education,
            "years_of_experience": c.years_of_experience,
            "desired_roles": c.desired_roles,
            "salary_min": c.salary_min,
            "salary_max": c.salary_max,
            "work_preference": c.work_preference,
            "open_to_relocation": c.open_to_relocation,
            "resume_filename": c.resume_filename,
            "created_at": str(c.created_at)
        }
    finally:
        db.close()


# --- Matching + Scoring Services ---

def get_top_candidates_for_job(job_id: str, top_k: int = 10) -> list[dict]:
    """
    Vector search to find top candidates for a job,
    then LLM score each one.
    """
    db: Session = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            return []

        job_dict = {
            "title": job.title,
            "company": job.company,
            "location": job.location,
            "industry": job.industry,
            "required_skills": job.required_skills,
            "preferred_skills": job.preferred_skills,
            "min_experience_years": job.min_experience_years,
            "education_requirement": job.education_requirement,
        }

        # Step 1 — vector search narrows the pool
        matches = find_matching_candidates(job_dict, top_k=top_k)

        # Step 2 — LLM scores each match
        jd_req = JDRequirements(
            title=job.title,
            company=job.company,
            location=job.location,
            required_skills=job.required_skills,
            preferred_skills=job.preferred_skills,
            min_experience_years=job.min_experience_years,
            education_requirement=job.education_requirement,
            raw_text=job.raw_jd_text or ""
        )

        results = []
        for match in matches:
            candidate_id = match["candidate_id"]
            candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
            if not candidate:
                continue

            parsed = ParsedResume(
                raw_text=candidate.raw_resume_text or "",
                filename=candidate.resume_filename or "",
                file_type="",
                char_count=len(candidate.raw_resume_text or ""),
                word_count=len((candidate.raw_resume_text or "").split())
            )

            score = score_resume(parsed, jd_req)

            results.append({
                "candidate_id": candidate_id,
                "name": candidate.name,
                "vector_similarity": match["similarity_score"],
                "overall_score": score.overall_score,
                "skill_match": score.skill_match_score,
                "experience": score.experience_score,
                "education": score.education_score,
                "recommendation": score.recommendation,
                "reasoning": score.reasoning,
                "strengths": score.strengths,
                "gaps": score.gaps,
            })

        # Sort by overall LLM score
        results.sort(key=lambda x: x["overall_score"], reverse=True)
        return results

    finally:
        db.close()
