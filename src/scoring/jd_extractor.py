import json
from dataclasses import dataclass, field
from typing import Optional
from src.llm.client import get_llm_client

REQUIRED_FIELDS = [
    "title",
    "company",
    "location",
    "industry",
    "salary_min",
    "salary_max",
    "required_skills",
    "min_experience_years",
    "education_level",
]

OPTIONAL_FIELDS = [
    "preferred_skills",
    "employment_type",
]

@dataclass
class ExtractedJD:
    # Required
    title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    industry: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    required_skills: list[str] = field(default_factory=list)
    min_experience_years: Optional[int] = None
    education_level: Optional[str] = None
    education_field: Optional[str] = None
    education_notes: Optional[str] = None

    # Optional
    preferred_skills: list[str] = field(default_factory=list)
    employment_type: Optional[str] = None

    # Meta
    missing_required: list[str] = field(default_factory=list)
    is_complete: bool = False
    raw_text: str = ""


def extract_jd(jd_text: str) -> ExtractedJD:
    llm = get_llm_client()

    result = llm.complete_json(
        system="""You are an expert HR analyst extracting structured data from job descriptions.
Extract exactly these fields and return valid JSON:
- title (string): job title
- company (string): company name, empty string if not found
- location (string): city and state or remote, empty string if not found
- industry (string): industry or domain e.g. "Sports Betting", "Healthcare", "FinTech", empty string if not found
- salary_min (integer): minimum salary as a number with no symbols, 0 if not found
- salary_max (integer): maximum salary as a number with no symbols, 0 if not found
- required_skills (array of strings): extract ALL required skills and technologies as clean skill names. Convert phrases to skill names: "Experience with LINUX" → "Linux", "Scripting/coding knowledge" → "Scripting", "High-Performance Computing environments" → "HPC". Extract every distinct skill, tool, technology, or competency mentioned as required. Return as many as are present, do not truncate.
- preferred_skills (array of strings): same rule — extract ALL preferred/nice-to-have skills as clean names. Do not truncate.
- min_experience_years (integer or null): minimum years of experience ONLY if explicitly stated as a hard requirement like "3+ years required" or "minimum 3 years". If it is mentioned only as part of education/qualification combos like "degree or equivalent experience", return null. When in doubt, return null.
- education_level (string): minimum degree required, one of exactly: "High School", "Associate\'s", "Bachelor\'s", "Master\'s", "PhD", or empty string if not specified
- education_field (string): field of study or discipline if mentioned, e.g. "quantitative field", "Computer Science", "Engineering", empty string if not specified  
- education_notes (string): any additional education preferences or bonuses, e.g. "Master\'s degree a plus", "MBA preferred", empty string if none
- employment_type (string): one of "remote", "hybrid", "onsite", or empty string if not specified

Return only JSON, no explanation.""",
        user=f"Extract structured data from this job description:\n\n{jd_text}",
        max_tokens=1000
    )

    raw_exp = result.get("min_experience_years")
    jd = ExtractedJD(
        title=result.get("title") or None,
        company=result.get("company") or None,
        location=result.get("location") or None,
        industry=result.get("industry") or None,
        salary_min=result.get("salary_min") or None,
        salary_max=result.get("salary_max") or None,
        required_skills=result.get("required_skills", []),
        preferred_skills=result.get("preferred_skills", []),
        min_experience_years=int(raw_exp) if raw_exp and str(raw_exp).isdigit() and int(raw_exp) > 0 else None,
        education_level=result.get("education_level") or None,
        education_field=result.get("education_field") or None,
        education_notes=result.get("education_notes") or None,
        employment_type=result.get("employment_type") or None,
        raw_text=jd_text
    )

    # Check which required fields are missing
    missing = []
    for f in REQUIRED_FIELDS:
        val = getattr(jd, f)
        if val is None or val == [] or val == 0:
            missing.append(f)

    jd.missing_required = missing
    jd.is_complete = len(missing) == 0

    return jd


def apply_employer_overrides(jd: ExtractedJD, overrides: dict) -> ExtractedJD:
    """
    Apply manual corrections from the employer UI.
    Called after the employer fills in missing fields.
    """
    for key, value in overrides.items():
        if hasattr(jd, key) and value not in [None, "", [], 0]:
            setattr(jd, key, value)

    # Re-check missing fields
    missing = []
    for f in REQUIRED_FIELDS:
        val = getattr(jd, f)
        if val is None or val == [] or val == 0:
            missing.append(f)

    jd.missing_required = missing
    jd.is_complete = len(missing) == 0

    return jd


def _parse_json_tolerant(raw: str) -> dict:
    """Parse JSON that may contain unescaped control chars (newlines, tabs) inside string values."""
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        fixed = []
        in_string = False
        escape_next = False
        for ch in raw:
            if escape_next:
                fixed.append(ch)
                escape_next = False
            elif ch == '\\' and in_string:
                fixed.append(ch)
                escape_next = True
            elif ch == '"':
                in_string = not in_string
                fixed.append(ch)
            elif in_string and ch == '\n':
                fixed.append('\\n')
            elif in_string and ch == '\r':
                fixed.append('\\r')
            elif in_string and ch == '\t':
                fixed.append('\\t')
            else:
                fixed.append(ch)
        return json.loads(''.join(fixed))


def generate_jd_presentation(raw_text: str, title: str, company: str,
                              required_skills: list, preferred_skills: list,
                              salary_min: int, salary_max: int,
                              employment_type: str, location: str,
                              min_experience_years: int) -> dict:
    """
    Generate candidate-facing content from a JD:
    - summary: 2-3 sentence plain-language overview
    - standardized: full description in a consistent section format

    Returns {"summary": str, "standardized": str}
    Uses two separate LLM calls to keep each output focused and avoid token limits.
    """
    llm = get_llm_client()

    skills_str = ", ".join(required_skills[:10]) if required_skills else "various technologies"
    preferred_str = ", ".join(preferred_skills[:6]) if preferred_skills else ""
    salary_str = f"${salary_min:,} – ${salary_max:,}" if salary_min and salary_max else "Competitive"
    exp_str = f"{min_experience_years}+" if min_experience_years else "Relevant"

    context = f"""Job Title: {title}
Company: {company}
Location: {location} | {employment_type or 'Not specified'}
Salary: {salary_str}
Required Skills: {skills_str}
{"Preferred Skills: " + preferred_str if preferred_str else ""}
Min Experience: {exp_str} years

Original JD text:
{raw_text[:2000] if raw_text else "(not provided)"}"""

    # --- Call 1: Summary (short JSON, reliable) ---
    summary_system = (
        "Write a 4-5 sentence candidate-facing summary of this job posting. "
        "Cover: (1) who the company is and what they do, (2) the core purpose of the role and what the person will own day-to-day, "
        "(3) the type of candidate who would thrive here — key background, skills, or mindset, "
        "(4) anything distinctive about the team, product, or opportunity. "
        "Plain, direct language. No buzzwords like 'dynamic', 'passionate', or 'fast-paced'. No bullet points. "
        'Return JSON: {"summary": "..."}'
    )
    try:
        summary = llm.complete_json(summary_system, context, max_tokens=350).get("summary", "")
    except Exception:
        summary = ""

    # --- Call 2: Standardized JD (plain text, no JSON parsing) ---
    std_system = (
        "Rewrite this job description in a clean, standardized format using these EXACT section headers "
        "(ALL-CAPS, blank line between sections, bullet points with •):\n\n"
        "ABOUT THE ROLE\n"
        "WHAT YOU'LL DO\n"
        "WHAT WE'RE LOOKING FOR\n"
        "NICE TO HAVE\n"
        "COMPENSATION & DETAILS\n\n"
        "Return ONLY the formatted text. No JSON, no markdown, no code fences. Be concise but complete."
    )
    try:
        standardized = llm.complete(std_system, context, max_tokens=800).content.strip()
    except Exception:
        standardized = ""

    return {"summary": summary, "standardized": standardized}

