import os
import uuid
import tempfile
import threading
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse, Response
from src.parsers.resume import parse_resume
from src.scoring.jd_extractor import extract_jd, apply_employer_overrides
from src.parsers.resume_profile_extractor import extract_candidate_profile, apply_candidate_overrides
from src.scoring.resume_scorer import score_resume, JDRequirements
from src.services import save_job, save_candidate, get_top_candidates_for_job
from src.interview.transcript_scorer import summarize_interview
from src.db import SessionLocal, Question, Job, Candidate, Interview, InterviewAnswer, Employer, Application, RecommendationLabel
from src.llm.client import get_llm_client
import json

router = APIRouter()


# --- Health ---

@router.get("/health")
def health():
    return {"status": "ok"}


# --- Employer ---

@router.post("/employers")
async def create_employer(
    company_name: str = Form(...),
    email: str = Form(...),
    industry: str = Form(...)
):
    db = SessionLocal()
    try:
        existing = db.query(Employer).filter(Employer.email == email).first()
        if existing:
            return JSONResponse(content={"employer_id": existing.id, "already_exists": True})

        employer = Employer(
            id=str(uuid.uuid4()),
            company_name=company_name,
            email=email,
            industry=industry
        )
        db.add(employer)
        db.commit()
        return JSONResponse(content={"employer_id": employer.id})
    finally:
        db.close()


# --- Jobs ---

@router.post("/jobs/extract")
async def extract_job(jd_file: UploadFile = File(None), jd_text: str = Form(None)):
    """
    Step 1: Extract structured info from a JD.
    Returns extracted fields + any missing required fields.
    Employer reviews and fills gaps before saving.
    """
    if jd_file:
        ext = os.path.splitext(jd_file.filename)[1].lower()
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            tmp.write(await jd_file.read())
            tmp_path = tmp.name
        try:
            from src.parsers.resume import _parse_pdf, _parse_docx
            if ext == ".pdf":
                text = _parse_pdf(tmp_path)
            else:
                text = _parse_docx(tmp_path)
        finally:
            os.unlink(tmp_path)
    elif jd_text:
        text = jd_text
    else:
        raise HTTPException(status_code=400, detail="Provide jd_file or jd_text")

    jd = extract_jd(text)

    return JSONResponse(content={
        "extracted": {
            "title": jd.title,
            "company": jd.company,
            "location": jd.location,
            "industry": jd.industry,
            "salary_min": jd.salary_min,
            "salary_max": jd.salary_max,
            "required_skills": jd.required_skills,
            "preferred_skills": jd.preferred_skills,
            "min_experience_years": jd.min_experience_years,
            "education_level": jd.education_level,
            "education_field": jd.education_field,
            "education_notes": jd.education_notes,
            "employment_type": jd.employment_type,
        },
        "missing_required": jd.missing_required,
        "is_complete": jd.is_complete,
        "raw_text": text    })


@router.post("/jobs/guided-extract")
async def guided_extract_job(description: str = Form(...), qa: str = Form("[]")):
    """
    AI-guided job posting creation.
    LLM only does extraction from the full conversation — Python decides what's still missing.
    This prevents the LLM from repeating questions or losing track of state.
    """
    llm = get_llm_client()
    qa_list = json.loads(qa)

    # Build conversation context
    context_parts = [f"Initial description: {description}"]
    for item in qa_list:
        context_parts.append(f"Q: {item['q']}\nA: {item['a']}")
    context = "\n\n".join(context_parts)

    # --- LLM call: extraction only (short, focused, reliable) ---
    extract_system = """Extract job posting details from this conversation. Return JSON with exactly these keys:
{
  "title": "job title or null",
  "company": "company/org name or null",
  "location": "city and state, or Remote, or null",
  "industry": "industry sector (e.g. Education, Finance, Healthcare) or null",
  "salary_min": integer or null,
  "salary_max": integer or null,
  "min_experience_years": integer or null,
  "education_level": "one of: High School, Associate's, Bachelor's, Master's, PhD — or null",
  "education_notes": "field of study or specialization or null",
  "employment_type": "one of: remote, hybrid, onsite — or null",
  "required_skills": ["skill1", "skill2", ...] or null,
  "preferred_skills": []
}
Parsing rules:
- salary: "$120k-140k" or "120k-140k USD" → salary_min=120000, salary_max=140000
- employment: "fulltime and onsite" → "onsite"; "fulltime" alone → null (not an employment type)
- min_experience_years: "1-3 years" → 1 (use minimum); "3+ years" → 3
- education: "PhD in Computer Science" → education_level="PhD", education_notes="Computer Science or equivalent"
- title: extract from the initial description if mentioned (e.g. "Assistant Clinical Professor - ..." → "Assistant Clinical Professor")
- Use null (not empty string, not 0) for any field not yet provided.
Return ONLY valid JSON."""

    try:
        extracted = llm.complete_json(extract_system, context, max_tokens=400)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")

    # --- Python routing: deterministic, no LLM involvement ---
    # Ordered list of required fields with their hardcoded questions
    REQUIRED = [
        ("title",               "What is the job title?"),
        ("company",             "What is the company or organization name?"),
        ("location",            "Where is this position located? (e.g. Atlanta, GA — or Remote)"),
        ("industry",            "What industry does this role fall under? (e.g. Education, Finance, Healthcare)"),
        ("_salary",             "What is the salary range? (e.g. $120k–$150k)"),
        ("min_experience_years","How many years of experience are required?"),
        ("education_level",     "What education level is required? (Bachelor's, Master's, or PhD, etc.)"),
        ("employment_type",     "Is this role remote, hybrid, or onsite?"),
        ("required_skills",     "What are the required skills for this role? (list the key technical and professional skills)"),
    ]

    def _missing(field: str) -> bool:
        if field == "_salary":
            return not extracted.get("salary_min") or not extracted.get("salary_max")
        val = extracted.get(field)
        if val is None or val == "": return True
        if isinstance(val, list) and len(val) == 0: return True
        return False

    for field, question in REQUIRED:
        if _missing(field):
            return JSONResponse(content={
                "status": "needs_info",
                "question": question,
                "partial": extracted,
            })

    # All required fields collected — generate a proper JD prose draft, then return complete
    skills_str = ", ".join(extracted.get("required_skills") or [])
    salary_str = f"${extracted.get('salary_min', 0):,}–${extracted.get('salary_max', 0):,}"
    edu_str = extracted.get("education_level", "")
    if extracted.get("education_notes"):
        edu_str += f" in {extracted['education_notes']}"

    draft_context = (
        f"{extracted.get('title')} at {extracted.get('company')}, {extracted.get('location')}.\n"
        f"Industry: {extracted.get('industry')}. Salary: {salary_str}. "
        f"Employment: {extracted.get('employment_type')}. "
        f"Min experience: {extracted.get('min_experience_years')} year(s).\n"
        f"Education: {edu_str}.\n"
        f"Required skills: {skills_str}"
    )
    draft_system = (
        "Write a professional job description from these details. "
        "Start with 2-3 sentences about the role and what the person will do. "
        "Then list 4-5 key responsibilities as bullet points (•). "
        "End with a requirements section covering experience, education, and the listed skills. "
        "Professional tone. No intro phrases like 'Here is the job description'."
    )
    try:
        raw_text = llm.complete(draft_system, draft_context, max_tokens=500).content.strip()
    except Exception:
        raw_text = draft_context  # fallback to structured summary

    return JSONResponse(content={
        "status": "complete",
        "extracted": extracted,
        "raw_text": raw_text,
        "missing_required": [],
    })


@router.post("/jobs")
async def create_job(
    employer_id: str = Form(...),
    raw_text: str = Form(...),
    title: str = Form(...),
    company: str = Form(...),
    location: str = Form(...),
    industry: str = Form(...),
    salary_min: int = Form(...),
    salary_max: int = Form(...),
    required_skills: str = Form(...),   # JSON string
    min_experience_years: int = Form(...),
    education_requirement: str = Form(None),
    education_level: str = Form(None),
    education_field: str = Form(None),
    education_fields: str = Form("[]"),  # JSON array of field-of-study tags
    education_notes: str = Form(None),
    preferred_skills: str = Form("[]"),  # JSON string
    employment_type: str = Form(None),
    skill_weights: str = Form("{}"),  # JSON string {skill: weight}
    posted_by_user_id: str = Form(None),
    application_deadline: str = Form(None),
):
    """
    Step 2: Save a confirmed JD after employer has filled in any missing fields.
    """
    from src.scoring.jd_extractor import ExtractedJD

    jd = ExtractedJD(
        title=title,
        company=company,
        location=location,
        industry=industry,
        salary_min=salary_min,
        salary_max=salary_max,
        required_skills=json.loads(required_skills),
        preferred_skills=json.loads(preferred_skills),
        min_experience_years=min_experience_years,
        education_level=education_level or education_requirement,
        education_field=education_field,
        education_notes=education_notes,
        employment_type=employment_type,
        raw_text=raw_text,
        is_complete=True
    )

    from datetime import date
    deadline = None
    if application_deadline:
        try:
            deadline = date.fromisoformat(application_deadline)
        except ValueError:
            pass
    result = save_job(jd, employer_id=employer_id, skill_weights=json.loads(skill_weights),
                      posted_by_user_id=posted_by_user_id, application_deadline=deadline,
                      education_fields=json.loads(education_fields))

    # Kick off background generation of candidate-facing summary + standardized JD
    job_id = result["job_id"]
    def _gen_presentation():
        try:
            from src.scoring.jd_extractor import generate_jd_presentation
            pres = generate_jd_presentation(
                raw_text=raw_text, title=title, company=company,
                required_skills=json.loads(required_skills),
                preferred_skills=json.loads(preferred_skills),
                salary_min=salary_min, salary_max=salary_max,
                employment_type=employment_type or "", location=location,
                min_experience_years=min_experience_years,
            )
            _db = SessionLocal()
            try:
                _job = _db.query(Job).filter(Job.id == job_id).first()
                if _job:
                    _job.jd_summary = pres.get("summary", "")
                    _job.jd_standardized = pres.get("standardized", "")
                    _db.commit()
            finally:
                _db.close()
        except Exception as e:
            print(f"[JD presentation generation failed] {e}")

    threading.Thread(target=_gen_presentation, daemon=True).start()

    return JSONResponse(content=result)


@router.get("/jobs")
def list_jobs(employer_id: str):
    db = SessionLocal()
    try:
        jobs = db.query(Job).filter(Job.employer_id == employer_id).all()
        return JSONResponse(content={
            "jobs": [
                {
                    "job_id": j.id,
                    "title": j.title,
                    "company": j.company,
                    "location": j.location,
                    "industry": j.industry,
                    "salary_min": j.salary_min,
                    "salary_max": j.salary_max,
                    "required_skills": j.required_skills,
                    "preferred_skills": j.preferred_skills,
                    "employment_type": j.employment_type,
                    "raw_jd_text": j.raw_jd_text,
                    "jd_summary": j.jd_summary,
                    "jd_standardized": j.jd_standardized,
                    "min_experience_years": j.min_experience_years,
                    "application_deadline": str(j.application_deadline) if j.application_deadline else None,
                    "created_at": str(j.created_at)
                }
                for j in jobs
            ]
        })
    finally:
        db.close()


@router.get("/jobs/public")
def list_public_jobs():
    """Public endpoint — candidates browse all active jobs."""
    db = SessionLocal()
    try:
        from src.db import User as UserModel
        jobs = db.query(Job).all()

        def _poster(j):
            if not j.posted_by_user_id:
                return None
            u = db.query(UserModel).filter(UserModel.id == j.posted_by_user_id).first()
            if not u:
                return None
            return {
                "user_id": u.id,
                "name": f"{u.first_name or ''} {u.last_name or ''}".strip(),
                "title": u.title,
            }

        return JSONResponse(content={
            "jobs": [
                {
                    "job_id": j.id,
                    "title": j.title,
                    "company": j.company,
                    "location": j.location,
                    "industry": j.industry,
                    "salary_min": j.salary_min,
                    "salary_max": j.salary_max,
                    "required_skills": j.required_skills,
                    "preferred_skills": j.preferred_skills,
                    "employment_type": j.employment_type,
                    "raw_jd_text": j.raw_jd_text,
                    "jd_summary": j.jd_summary,
                    "jd_standardized": j.jd_standardized,
                    "posted_by": _poster(j),
                    "created_at": str(j.created_at)
                }
                for j in jobs
            ]
        })
    finally:
        db.close()


@router.get("/jobs/{job_id}")
def get_job(job_id: str):
    db = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        poster = None
        if job.posted_by_user_id:
            from src.db import User as UserModel
            u = db.query(UserModel).filter(UserModel.id == job.posted_by_user_id).first()
            if u:
                poster = {
                    "user_id": u.id,
                    "name": f"{u.first_name or ''} {u.last_name or ''}".strip(),
                    "title": u.title,
                }

        return JSONResponse(content={
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
            "posted_by": poster,
            "created_at": str(job.created_at)
        })
    finally:
        db.close()


@router.delete("/jobs/{job_id}")
def delete_job(job_id: str):
    db = SessionLocal()
    try:
        # Delete related records first
        db.query(Application).filter(Application.job_id == job_id).delete()
        db.query(Interview).filter(Interview.job_id == job_id).delete()
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        db.delete(job)
        db.commit()
        return JSONResponse(content={"deleted": True, "job_id": job_id})
    finally:
        db.close()


@router.get("/jobs/{job_id}/candidates")
def get_candidates_for_job(job_id: str, top_k: int = 10):
    """Get top ranked candidates for a job via vector search + LLM scoring."""
    results = get_top_candidates_for_job(job_id, top_k=top_k)
    if not results:
        return JSONResponse(content={"candidates": []})
    return JSONResponse(content={"candidates": results})


# --- Candidates ---

@router.post("/candidates/extract")
async def extract_candidate(resume: UploadFile = File(...)):
    """
    Step 1: Parse resume and extract candidate profile.
    Returns extracted fields + missing required fields.
    Candidate reviews and fills gaps before saving.
    """
    ext = os.path.splitext(resume.filename)[1].lower()
    if ext not in [".pdf", ".docx", ".doc"]:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        tmp.write(await resume.read())
        tmp_path = tmp.name

    try:
        parsed = parse_resume(tmp_path)
        profile = extract_candidate_profile(parsed.raw_text)

        return JSONResponse(content={
            "extracted": {
                "name": profile.name,
                "location": profile.location,
                "skills": profile.skills,
                "work_experience": profile.work_experience,
                "education": profile.education,
                "years_of_experience": profile.years_of_experience,
            },
            "missing_required": profile.missing_required,
            "is_complete": profile.is_complete,
            "raw_text": parsed.raw_text,
            "filename": parsed.filename
        })
    finally:
        os.unlink(tmp_path)


@router.post("/candidates")
async def create_candidate(
    email: str = Form(...),
    raw_text: str = Form(...),
    filename: str = Form(...),
    name: str = Form(...),
    first_name: str = Form(None),
    last_name: str = Form(None),
    location: str = Form(...),
    skills: str = Form(...),              # JSON string
    work_experience: str = Form("[]"),    # JSON string
    education: str = Form("[]"),          # JSON string
    years_of_experience: int = Form(0),
    desired_roles: str = Form("[]"),      # JSON string
    salary_min: int = Form(None),
    salary_max: int = Form(None),
    work_preference: str = Form(None),
    education_fields: str = Form("[]"),  # JSON array of field-of-study tags
    open_to_relocation: bool = Form(False),
):
    """
    Step 2: Save confirmed candidate profile after they fill in missing fields.
    """
    from src.parsers.resume import ParsedResume

    # Derive first/last name from full name if not provided
    parts = name.strip().split()
    fn = first_name or (parts[0] if parts else name)
    ln = last_name or (' '.join(parts[1:]) if len(parts) > 1 else '')

    parsed = ParsedResume(
        raw_text=raw_text,
        filename=filename,
        file_type=os.path.splitext(filename)[1].lower(),
        char_count=len(raw_text),
        word_count=len(raw_text.split())
    )

    extracted = {
        "name": name,
        "first_name": fn,
        "last_name": ln,
        "location": location,
        "skills": json.loads(skills),
        "work_experience": json.loads(work_experience),
        "education": json.loads(education),
        "years_of_experience": years_of_experience,
        "desired_roles": json.loads(desired_roles),
        "salary_min": salary_min,
        "salary_max": salary_max,
        "work_preference": work_preference,
        "education_fields": json.loads(education_fields),
        "open_to_relocation": open_to_relocation,
    }

    result = save_candidate(parsed, extracted, email=email)

    # Link candidate profile to user account if user exists
    db2 = SessionLocal()
    try:
        from src.db import User
        user = db2.query(User).filter(User.email == email).first()
        if user:
            user.candidate_id = result["candidate_id"]
            db2.commit()
    finally:
        db2.close()

    return JSONResponse(content=result)


@router.get("/candidates/{candidate_id}")
def get_candidate(candidate_id: str, job_id: str = None):
    db = SessionLocal()
    try:
        c = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        if not c:
            raise HTTPException(status_code=404, detail="Candidate not found")

        result: dict = {
            "candidate_id": c.id,
            "name": c.name,
            "first_name": c.first_name,
            "last_name": c.last_name,
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

        # If a job_id is provided, include application scoring data for that job
        if job_id:
            app = db.query(Application).filter(
                Application.candidate_id == candidate_id,
                Application.job_id == job_id
            ).first()
            if app:
                job = db.query(Job).filter(Job.id == job_id).first()
                # Use LLM-assessed skill lists if stored, else fall back to mechanical comparison
                if app.matched_skills is not None or app.missing_skills is not None:
                    matched = app.matched_skills or []
                    missing = app.missing_skills or []
                else:
                    candidate_skills_lower = {s.lower() for s in (c.skills or [])}
                    required_skills = job.required_skills if job else []
                    matched = [s for s in required_skills if s.lower() in candidate_skills_lower]
                    missing = [s for s in required_skills if s.lower() not in candidate_skills_lower]
                result["application"] = {
                    "application_id": app.id,
                    "overall_score": app.overall_score,
                    "skill_match_score": app.skill_match_score,
                    "experience_score": app.experience_score,
                    "relevant_experience_years": app.relevant_experience_years,
                    "education_score": app.education_score,
                    "recommendation": app.recommendation,
                    "reasoning": app.reasoning,
                    "strengths": app.strengths,
                    "gaps": app.gaps,
                    "status": app.status,
                    "matched_skills": matched,
                    "missing_skills": missing,
                    "score_details": app.score_details,
                }

        return JSONResponse(content=result)
    finally:
        db.close()


@router.get("/candidates/{candidate_id}/resume")
def download_resume(candidate_id: str):
    """Return the candidate's raw resume text as a downloadable file."""
    db = SessionLocal()
    try:
        c = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        if not c:
            raise HTTPException(status_code=404, detail="Candidate not found")
        if not c.raw_resume_text:
            raise HTTPException(status_code=404, detail="Resume not available")
        filename = c.resume_filename or "resume.txt"
        # Serve as plain text download
        return Response(
            content=c.raw_resume_text,
            media_type="text/plain",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    finally:
        db.close()


# --- Hiring Manager Profile ---

@router.get("/users/{user_id}/profile")
def get_user_profile(user_id: str):
    """Public profile for a hiring manager — name, title, company, job postings."""
    db = SessionLocal()
    try:
        from src.db import User as UserModel
        user = db.query(UserModel).filter(UserModel.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        employer_name = None
        if user.employer_id:
            emp = db.query(Employer).filter(Employer.id == user.employer_id).first()
            if emp:
                employer_name = emp.company_name

        jobs = db.query(Job).filter(Job.posted_by_user_id == user_id).order_by(Job.created_at.desc()).all()

        return JSONResponse(content={
            "user_id": user.id,
            "name": f"{user.first_name or ''} {user.last_name or ''}".strip(),
            "first_name": user.first_name,
            "last_name": user.last_name,
            "title": user.title,
            "company": employer_name,
            "email": user.email,
            "posted_jobs": [
                {
                    "job_id": j.id,
                    "title": j.title,
                    "location": j.location,
                    "employment_type": j.employment_type,
                    "created_at": str(j.created_at),
                }
                for j in jobs
            ],
        })
    finally:
        db.close()


# --- Question Bank ---

@router.get("/questions")
def get_questions(category: str = None):
    """Return question bank, optionally filtered by category."""
    db = SessionLocal()
    try:
        query = db.query(Question)
        if category:
            query = query.filter(Question.category == category)
        questions = query.all()

        return JSONResponse(content={
            "questions": [
                {
                    "id": q.id,
                    "category": q.category,
                    "template": q.template,
                    "has_blank": q.has_blank,
                    "blank_hint": q.blank_hint,
                    "is_fixed": q.is_fixed,
                    "intent_text": q.intent_text
                }
                for q in questions
            ]
        })
    finally:
        db.close()


# --- Applications ---

@router.post("/applications")
async def apply_to_job(
    candidate_id: str = Form(...),
    job_id: str = Form(...),
):
    """Candidate applies to a job — scores run immediately."""
    db = SessionLocal()
    try:
        # Check if already applied
        existing = db.query(Application).filter(
            Application.candidate_id == candidate_id,
            Application.job_id == job_id
        ).first()
        if existing:
            return JSONResponse(content={
                "application_id": existing.id,
                "already_applied": True,
                "overall_score": existing.overall_score,
                "recommendation": existing.recommendation
            })

        # Get job and candidate
        job = db.query(Job).filter(Job.id == job_id).first()
        candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        if not job or not candidate:
            raise HTTPException(status_code=404, detail="Job or candidate not found")

        # Score the resume against the job
        from src.scoring.resume_scorer import score_resume, JDRequirements
        from src.parsers.resume import ParsedResume

        jd_req = JDRequirements(
            title=job.title,
            company=job.company,
            location=job.location,
            required_skills=job.required_skills,
            preferred_skills=job.preferred_skills or [],
            min_experience_years=job.min_experience_years,
            education_requirement=job.education_requirement,
            raw_text=job.raw_jd_text or "",
            skill_weights=job.skill_weights or {}
        )

        parsed = ParsedResume(
            raw_text=candidate.raw_resume_text or "",
            filename=candidate.resume_filename or "",
            file_type="",
            char_count=len(candidate.raw_resume_text or ""),
            word_count=len((candidate.raw_resume_text or "").split())
        )

        score = score_resume(parsed, jd_req)

        # Save application with scores
        application_id = str(uuid.uuid4())
        application = Application(
            id=application_id,
            candidate_id=candidate_id,
            job_id=job_id,
            overall_score=score.overall_score,
            skill_match_score=score.skill_match_score,
            experience_score=score.experience_score,
            relevant_experience_years=score.relevant_experience_years,
            education_score=score.education_score,
            recommendation=score.recommendation,
            reasoning=score.reasoning,
            strengths=score.strengths,
            gaps=score.gaps,
            matched_skills=score.matched_skills,
            missing_skills=score.missing_skills,
            score_details=score.score_details,
            status="new"
        )
        db.add(application)
        db.commit()

        return JSONResponse(content={
            "application_id": application_id,
            "already_applied": False,
            "overall_score": score.overall_score,
            "skill_match_score": score.skill_match_score,
            "experience_score": score.experience_score,
            "relevant_experience_years": score.relevant_experience_years,
            "education_score": score.education_score,
            "recommendation": score.recommendation,
            "reasoning": score.reasoning,
            "strengths": score.strengths,
            "gaps": score.gaps,
            "matched_skills": score.matched_skills,
            "missing_skills": score.missing_skills,
            "score_details": score.score_details,
        })
    finally:
        db.close()


@router.get("/jobs/{job_id}/applications")
def get_job_applications(job_id: str):
    """Get all applications for a job, ranked by score."""
    db = SessionLocal()
    try:
        applications = (
            db.query(Application, Candidate)
            .join(Candidate, Application.candidate_id == Candidate.id)
            .filter(Application.job_id == job_id)
            .order_by(Application.overall_score.desc())
            .all()
        )

        job = db.query(Job).filter(Job.id == job_id).first()
        required_skills = job.required_skills if job else []

        def _skill_match(cand_skills, app):
            # Use LLM-assessed lists if stored; mechanical comparison as fallback
            if app.matched_skills is not None or app.missing_skills is not None:
                return app.matched_skills or [], app.missing_skills or []
            cand_lower = {s.lower() for s in (cand_skills or [])}
            matched = [s for s in required_skills if s.lower() in cand_lower]
            missing = [s for s in required_skills if s.lower() not in cand_lower]
            return matched, missing

        def _build_job_app_row(app, cand):
            matched, missing = _skill_match(cand.skills, app)
            return {
                "application_id": app.id,
                "candidate_id": cand.id,
                "name": cand.name,
                "first_name": cand.first_name,
                "last_name": cand.last_name,
                "email": cand.email,
                "location": cand.location,
                "skills": cand.skills,
                "years_of_experience": cand.years_of_experience,
                "overall_score": app.overall_score,
                "skill_match_score": app.skill_match_score,
                "experience_score": app.experience_score,
                "relevant_experience_years": app.relevant_experience_years,
                "education_score": app.education_score,
                "recommendation": app.recommendation,
                "reasoning": app.reasoning,
                "strengths": app.strengths,
                "gaps": app.gaps,
                "status": app.status,
                "matched_skills": matched,
                "missing_skills": missing,
                "score_details": app.score_details,
                "created_at": str(app.created_at)
            }

        return JSONResponse(content={
            "applications": [_build_job_app_row(app, cand) for app, cand in applications]
        })
    finally:
        db.close()


@router.get("/candidates/{candidate_id}/applications")
def get_candidate_applications(candidate_id: str):
    """Get all jobs a candidate has applied to."""
    db = SessionLocal()
    try:
        applications = (
            db.query(Application, Job)
            .join(Job, Application.job_id == Job.id)
            .filter(Application.candidate_id == candidate_id)
            .order_by(Application.created_at.desc())
            .all()
        )

        def _score_band(score):
            if score is None:
                return None
            if score >= 85:
                return "Strong Match (85+)"
            if score >= 70:
                return "Good Match (70–84)"
            if score >= 55:
                return "Moderate Match (55–69)"
            return "Below Threshold (<55)"

        return JSONResponse(content={
            "applications": [
                {
                    "application_id": app.id,
                    "job_id": job.id,
                    "job_title": job.title,
                    "company": job.company,
                    "location": job.location,
                    "salary_min": job.salary_min,
                    "salary_max": job.salary_max,
                    "employment_type": job.employment_type,
                    "overall_score": app.overall_score,
                    "score_band": _score_band(app.overall_score),
                    "strengths": app.strengths,
                    "gaps": app.gaps,
                    "status": app.status,
                    "created_at": str(app.created_at)
                }
                for app, job in applications
            ]
        })
    finally:
        db.close()


@router.patch("/applications/{application_id}/status")
async def update_application_status(
    application_id: str,
    status: str = Form(...)
):
    """Employer updates candidate status — reviewed, interview, rejected."""
    db = SessionLocal()
    try:
        app = db.query(Application).filter(Application.id == application_id).first()
        if not app:
            raise HTTPException(status_code=404, detail="Application not found")
        app.status = status
        db.commit()
        return JSONResponse(content={"application_id": application_id, "status": status})
    finally:
        db.close()


@router.get("/employers/{employer_id}/applications")
def get_employer_applications(employer_id: str):
    """Return all applications across all jobs for an employer."""
    db = SessionLocal()
    try:
        rows = (
            db.query(Application, Candidate, Job)
            .join(Candidate, Application.candidate_id == Candidate.id)
            .join(Job, Application.job_id == Job.id)
            .filter(Job.employer_id == employer_id)
            .order_by(Application.overall_score.desc())
            .all()
        )

        def _skill_match(cand_skills, app, required_skills):
            if app.matched_skills is not None or app.missing_skills is not None:
                return app.matched_skills or [], app.missing_skills or []
            cand_lower = {s.lower() for s in (cand_skills or [])}
            matched = [s for s in required_skills if s.lower() in cand_lower]
            missing = [s for s in required_skills if s.lower() not in cand_lower]
            return matched, missing

        def _build_row(app, cand, job):
            matched, missing = _skill_match(cand.skills, app, job.required_skills or [])
            return {
                "application_id": app.id,
                "candidate_id": cand.id,
                "name": cand.name,
                "first_name": cand.first_name,
                "last_name": cand.last_name,
                "email": cand.email,
                "location": cand.location,
                "skills": cand.skills,
                "years_of_experience": cand.years_of_experience,
                "overall_score": app.overall_score,
                "skill_match_score": app.skill_match_score,
                "experience_score": app.experience_score,
                "relevant_experience_years": app.relevant_experience_years,
                "education_score": app.education_score,
                "recommendation": app.recommendation,
                "status": app.status,
                "job_id": job.id,
                "job_title": job.title,
                "matched_skills": matched,
                "missing_skills": missing,
                "score_details": app.score_details,
                "created_at": str(app.created_at),
                "job_skill_weights": job.skill_weights or {},
                "job_required_skills": job.required_skills or [],
            }

        return JSONResponse(content={
            "applications": [_build_row(app, cand, job) for app, cand, job in rows]
        })
    finally:
        db.close()


@router.post("/employers/{employer_id}/candidates/search")
async def ai_search_candidates(employer_id: str, query: str = Form(...)):
    """Natural language candidate search. LLM parses query into filters."""
    db = SessionLocal()
    try:
        # Load all candidates for this employer
        rows = (
            db.query(Application, Candidate, Job)
            .join(Candidate, Application.candidate_id == Candidate.id)
            .join(Job, Application.job_id == Job.id)
            .filter(Job.employer_id == employer_id)
            .order_by(Application.overall_score.desc())
            .all()
        )

        if not rows:
            return JSONResponse(content={"applications": [], "filter_summary": "No candidates found."})

        # Use LLM to parse the query into filter criteria
        llm = get_llm_client()
        system = (
            "You parse natural language candidate search queries into structured filter criteria. "
            "Return JSON with these optional keys: "
            "location_contains (string), skills_include (list of strings), "
            "min_years_experience (int), job_title_contains (string), name_contains (string). "
            "Only include keys where the query specifies a constraint. "
            "Example: 'candidates based in NYC with Snowflake' → "
            '{"location_contains":"NYC","skills_include":["Snowflake"]}'
        )
        filters = llm.complete_json(system, f"Query: {query}", max_tokens=200)

        def _matches(app, cand, job):
            loc = filters.get("location_contains", "")
            if loc and loc.lower() not in (cand.location or "").lower():
                return False
            name = filters.get("name_contains", "")
            if name and name.lower() not in (cand.name or "").lower():
                return False
            jt = filters.get("job_title_contains", "")
            if jt and jt.lower() not in (job.title or "").lower():
                return False
            min_exp = filters.get("min_years_experience")
            if min_exp and (cand.years_of_experience or 0) < min_exp:
                return False
            skills_needed = filters.get("skills_include", [])
            if skills_needed:
                all_candidate_skills = " ".join([s.lower() for s in (cand.skills or [])] + [s.lower() for s in (app.matched_skills or [])])
                for skill in skills_needed:
                    if skill.lower() not in all_candidate_skills:
                        return False
            return True

        def _skill_match(cand_skills, app, required_skills):
            if app.matched_skills is not None or app.missing_skills is not None:
                return app.matched_skills or [], app.missing_skills or []
            cand_lower = {s.lower() for s in (cand_skills or [])}
            matched = [s for s in required_skills if s.lower() in cand_lower]
            missing = [s for s in required_skills if s.lower() not in cand_lower]
            return matched, missing

        matched_rows = [r for r in rows if _matches(r[0], r[1], r[2])]

        filter_parts = []
        if filters.get("location_contains"): filter_parts.append(f"location: {filters['location_contains']}")
        if filters.get("skills_include"): filter_parts.append(f"skills: {', '.join(filters['skills_include'])}")
        if filters.get("min_years_experience"): filter_parts.append(f"min {filters['min_years_experience']} yrs exp")
        if filters.get("job_title_contains"): filter_parts.append(f"role: {filters['job_title_contains']}")
        if filters.get("name_contains"): filter_parts.append(f"name: {filters['name_contains']}")
        filter_summary = " · ".join(filter_parts) if filter_parts else query

        return JSONResponse(content={
            "applications": [
                {
                    "application_id": app.id,
                    "candidate_id": cand.id,
                    "name": cand.name,
                    "first_name": cand.first_name,
                    "last_name": cand.last_name,
                    "email": cand.email,
                    "location": cand.location,
                    "skills": cand.skills,
                    "years_of_experience": cand.years_of_experience,
                    "overall_score": app.overall_score,
                    "skill_match_score": app.skill_match_score,
                    "experience_score": app.experience_score,
                    "relevant_experience_years": app.relevant_experience_years,
                    "education_score": app.education_score,
                    "recommendation": app.recommendation,
                    "status": app.status,
                    "job_id": job.id,
                    "job_title": job.title,
                    "matched_skills": _skill_match(cand.skills, app, job.required_skills or [])[0],
                    "missing_skills": _skill_match(cand.skills, app, job.required_skills or [])[1],
                    "score_details": app.score_details,
                    "created_at": str(app.created_at),
                    "job_skill_weights": job.skill_weights or {},
                    "job_required_skills": job.required_skills or [],
                }
                for app, cand, job in matched_rows
            ],
            "filter_summary": filter_summary,
        })
    finally:
        db.close()


# --- Interviews ---

@router.post("/interviews")
async def create_interview(
    candidate_id: str = Form(...),
    job_id: str = Form(...),
    questions: str = Form(...),   # JSON string: [{question_id, question_text}]
    answers: str = Form(...),     # JSON string: {question_id: answer_text}
):
    """Submit interview answers and get a qualitative summary."""
    db = SessionLocal()
    try:
        questions_list = json.loads(questions)
        answers_dict = json.loads(answers)

        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")

        interview_id = str(uuid.uuid4())

        summary = summarize_interview(
            questions=questions_list,
            answers=answers_dict,
            job_title=job.title,
            company=job.company,
            interview_id=interview_id
        )

        # Save interview to Postgres
        interview = Interview(
            id=interview_id,
            candidate_id=candidate_id,
            job_id=job_id,
            summary=summary.summary,
            strengths=summary.strengths,
            gaps=summary.flags,
        )
        db.add(interview)
        db.commit()

        return JSONResponse(content={
            "interview_id": interview_id,
            "summary": summary.summary,
            "strengths": summary.strengths,
            "notable_answers": summary.notable_answers,
            "flags": summary.flags
        })
    finally:
        db.close()


@router.get("/interviews/{interview_id}")
def get_interview(interview_id: str):
    db = SessionLocal()
    try:
        interview = db.query(Interview).filter(Interview.id == interview_id).first()
        if not interview:
            raise HTTPException(status_code=404, detail="Interview not found")
        return JSONResponse(content={
            "interview_id": interview.id,
            "candidate_id": interview.candidate_id,
            "job_id": interview.job_id,
            "summary": interview.summary,
            "strengths": interview.strengths,
            "gaps": interview.gaps,
            "created_at": str(interview.created_at)
        })
    finally:
        db.close()
