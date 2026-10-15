import json
from dataclasses import dataclass
from typing import Optional
from src.llm.client import get_llm_client
from src.parsers.resume import ParsedResume

@dataclass
class JDRequirements:
    title: str
    company: str
    location: str
    required_skills: list[str]
    preferred_skills: list[str]
    min_experience_years: int
    education_requirement: str
    raw_text: str
    skill_weights: dict = None  # {skill_name: 1-5}

@dataclass
class ResumeScore:
    overall_score: int
    skill_match_score: int
    experience_score: int
    education_score: int
    reasoning: str
    strengths: list[str]
    gaps: list[str]
    recommendation: str
    matched_skills: list[str] = None
    missing_skills: list[str] = None
    score_details: dict = None  # per-score explanations for employer
    relevant_experience_years: Optional[float] = None  # LLM-estimated years directly relevant to THIS role

    def __post_init__(self):
        if self.matched_skills is None:
            self.matched_skills = []
        if self.missing_skills is None:
            self.missing_skills = []
        if self.score_details is None:
            self.score_details = {}

def extract_jd_requirements(jd_text: str) -> JDRequirements:
    llm = get_llm_client()

    result = llm.complete_json(
        system="""You are an expert HR analyst. Extract structured information from job descriptions.
Always return valid JSON with exactly these keys:
- title (string)
- company (string, empty string if not found)
- location (string, empty string if not found)
- required_skills (array of strings)
- preferred_skills (array of strings)
- min_experience_years (integer, 0 if not specified)
- education_requirement (string, e.g. "Bachelor's degree in quantitative field")""",
        user=f"Extract the structured requirements from this job description:\n\n{jd_text}",
        max_tokens=1000
    )

    return JDRequirements(
        title=result.get("title", ""),
        company=result.get("company", ""),
        location=result.get("location", ""),
        required_skills=result.get("required_skills", []),
        preferred_skills=result.get("preferred_skills", []),
        min_experience_years=result.get("min_experience_years", 0),
        education_requirement=result.get("education_requirement", ""),
        raw_text=jd_text
    )

def _check_skills(resume_text: str, required_skills: list[str]) -> tuple[list[str], list[str]]:
    """Separate focused call: for each required skill, decide matched vs missing by citation."""
    if not required_skills:
        return [], []
    llm = get_llm_client()
    skills_list = "\n".join(f"- {s}" for s in required_skills)
    result = llm.complete_json(
        system="""You are checking whether a resume explicitly mentions specific skills.
For each skill in the list, return a JSON object where the key is the EXACT skill string provided
and the value is true (resume explicitly names it or a direct unambiguous synonym/abbreviation)
or false (not explicitly present).

Rules:
- true only if the word or a direct synonym appears in the resume text
- Abbreviations count (e.g. "ML" = "Machine Learning", "NLP" = "Natural Language Processing")
- Related-but-different skills do NOT count: "Experimental design" does NOT imply "A/B testing"
- When in doubt, return false
- Return every skill exactly as given""",
        user=f"Required skills to check:\n{skills_list}\n\nResume text:\n{resume_text[:6000]}",
        max_tokens=800,
    )
    matched, missing = [], []
    for skill in required_skills:
        if result.get(skill) is True:
            matched.append(skill)
        else:
            missing.append(skill)
    return matched, missing


def score_resume(resume: ParsedResume, jd: JDRequirements) -> ResumeScore:
    llm = get_llm_client()

    # Run skill check FIRST so the main call can be anchored to verified data
    matched, missing = _check_skills(resume.raw_text, jd.required_skills)
    n_required = len(jd.required_skills)
    n_matched = len(matched)
    skill_pct = round(100 * n_matched / n_required) if n_required > 0 else 100

    # Build skill weights section
    weights_text = ""
    if jd.skill_weights:
        weight_labels = {1: "low", 2: "low-medium", 3: "medium", 4: "high", 5: "critical"}
        weighted = [f"{skill} (importance: {weight_labels.get(w, 'medium')})"
                   for skill, w in jd.skill_weights.items()]
        weights_text = f"Skill Importance Weights:\n{chr(10).join(weighted)}\n"

    prompt = f"""
Job Title: {jd.title}
Company: {jd.company}
Location: {jd.location}
Required Skills: {', '.join(jd.required_skills)}
Preferred Skills: {', '.join(jd.preferred_skills)}
{weights_text}Minimum Experience: {jd.min_experience_years} years
Education Requirement: {jd.education_requirement}

VERIFIED SKILL DATA (from independent check — use this to anchor skill_match_score):
- {n_matched} of {n_required} required skills confirmed in resume: {', '.join(matched) if matched else 'none'}
- Missing required skills: {', '.join(missing) if missing else 'none'}

RESUME:
{resume.raw_text}
"""

    result = llm.complete_json(
        system=f"""You are an expert HR analyst scoring resumes against job requirements.
Return valid JSON with exactly these keys:

SCORING RUBRICS — follow these carefully:

skill_match_score (integer 0-100):
Anchor this score to the verified skill data provided above.
- 90-100: All or nearly all required skills confirmed, plus several preferred skills
- 75-89: Most required skills present (70%+), solid demonstrated coverage
- 55-74: Roughly half of required skills present
- 35-54: Less than half of required skills
- Below 35: Very few required skills
If skill_weights are provided, give heavier weight to "critical" and "high" skills.
Add up to 10 bonus points for strong preferred skill coverage.

experience_score (integer 0-100):
Evaluate based on evidence in the resume — look at what the candidate actually built, owned, analyzed, or managed in each role, not just job titles.
A role with a different title can be highly relevant if the work directly required the same skills and responsibilities.
- 90-100: Exceeds the minimum years requirement AND prior roles directly parallel this role's core responsibilities
- 75-89: Meets or nearly meets minimum years, work history is clearly relevant
- 55-74: Somewhat relevant experience; meets years requirement but work is tangentially related
- 35-54: Below minimum years or most experience is in a different domain
- Below 35: Significantly underqualified or no relevant experience
Do NOT mention or factor in whether the candidate has prior experience at {jd.company}.
That is not a requirement for this role.

education_score (integer 0-100):
- 90-100: Degree level exceeds requirement AND field is directly relevant
- 75-89: Degree level meets requirement, field is relevant or adjacent
- 60-74: Degree level meets requirement but field is unrelated
- 40-59: Degree level one level below requirement
- Below 40: Significantly below education requirement

overall_score (integer 0-100):
Weighted combination: skill_match_score (40%) + experience_score (40%) + education_score (20%).
Round to the nearest integer.

Also return:
- overall_score_detail (string, 1-2 sentences: biggest positive and biggest risk for this candidate)
- skill_score_detail (string, 1-2 sentences: which required skills are strongest, which are missing — be specific by name)
- experience_score_detail (string, 2-3 sentences: describe the relevance of their work history concretely — reference specific roles, what they did in those roles, how those responsibilities map to this job. Focus on skills used and work performed, not just titles.)
- education_score_detail (string, 1 sentence: degree, field, institution, and whether it meets the requirement)
- reasoning (string, 4-6 sentences: overall fit narrative covering strengths, any genuine gaps, and a clear hiring recommendation)
- strengths (array of 4-5 strings, each citing specific evidence: role title, company, metric, or project)
- gaps (array of strings, only for genuine gaps — things NOT demonstrated anywhere in the resume that ARE required for this role; omit anything that IS present; empty array if no real gaps)
- recommendation (one of: "Strong Yes", "Yes", "Maybe", "No")
- relevant_experience_years (float, rounded to nearest 0.5):
  Count only the time spent in roles where the core work directly exercised the key required skills or responsibilities of this position.
  Partial credit for roles with partial overlap (e.g., a role that is 50% relevant counts as half its duration).
  This value MUST be less than or equal to the candidate's total years of professional experience.
  This measures depth of directly applicable experience, independent of the experience_score quality rating.
  Example: a candidate with 8 total years but only 2 years in directly relevant roles → 2.0""",
        user=f"Score this resume against the job description:\n{prompt}",
        max_tokens=1500
    )

    score_details = {
        "overall": result.get("overall_score_detail", ""),
        "skills": result.get("skill_score_detail", ""),
        "experience": result.get("experience_score_detail", ""),
        "education": result.get("education_score_detail", ""),
    }

    raw_rel = result.get("relevant_experience_years")
    # Cap relevant years at total years_of_experience if both are present
    total_yrs = result.get("years_of_experience") or result.get("total_years")
    if raw_rel is not None and total_yrs and raw_rel > total_yrs:
        raw_rel = float(total_yrs)

    return ResumeScore(
        overall_score=result.get("overall_score", 0),
        skill_match_score=result.get("skill_match_score", 0),
        experience_score=result.get("experience_score", 0),
        education_score=result.get("education_score", 0),
        relevant_experience_years=raw_rel,
        reasoning=result.get("reasoning", ""),
        strengths=result.get("strengths", []),
        gaps=result.get("gaps", []),
        recommendation=result.get("recommendation", "Maybe"),
        matched_skills=matched,
        missing_skills=missing,
        score_details=score_details,
    )
