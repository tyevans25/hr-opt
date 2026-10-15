from dataclasses import dataclass, field
from typing import Optional
from src.llm.client import get_llm_client

# ── Date normalisation ────────────────────────────────────────────────────────
_MONTH_MAP = {
    "jan": "January", "feb": "February", "mar": "March", "apr": "April",
    "may": "May",     "jun": "June",     "jul": "July",  "aug": "August",
    "sep": "September", "sept": "September", "oct": "October",
    "nov": "November", "dec": "December",
}

def normalize_date(raw: str | None) -> str:
    """Convert any date string to 'Month YYYY' or 'Present'. Returns '' if blank."""
    if not raw:
        return ""
    s = raw.strip()
    if not s:
        return ""
    # Already normalised keywords
    if s.lower() in ("present", "current", "now", "ongoing"):
        return "Present"
    # Try "Jan 2022" / "January 2022" / "jan 2022"
    parts = s.replace(",", "").replace("-", " ").replace("/", " ").split()
    if len(parts) == 2:
        month_raw, year = parts[0], parts[1]
        if month_raw.lower() in _MONTH_MAP and year.isdigit():
            return f"{_MONTH_MAP[month_raw.lower()]} {year}"
        # "2022 Jan" order
        if year.lower() in _MONTH_MAP and month_raw.isdigit():
            return f"{_MONTH_MAP[year.lower()]} {month_raw}"
        # "2022 01" or "01 2022"
        if month_raw.isdigit() and 1 <= int(month_raw) <= 12 and len(year) == 4:
            months = ["January","February","March","April","May","June",
                      "July","August","September","October","November","December"]
            return f"{months[int(month_raw)-1]} {year}"
        if year.isdigit() and 1 <= int(year) <= 12 and len(month_raw) == 4:
            months = ["January","February","March","April","May","June",
                      "July","August","September","October","November","December"]
            return f"{months[int(year)-1]} {month_raw}"
    # Year only "2022"
    if len(parts) == 1 and parts[0].isdigit() and len(parts[0]) == 4:
        return parts[0]
    return s  # fallback — return as-is

def normalize_work_experience(entries: list[dict]) -> list[dict]:
    """Normalise dates in a list of work_experience dicts."""
    out = []
    for e in entries:
        end_raw = e.get("end_date") or ""
        is_current = e.get("is_current", False) or not end_raw or end_raw.lower() in ("present","current","now","ongoing","null","none")
        out.append({
            "title":       e.get("title", ""),
            "company":     e.get("company", ""),
            "start_date":  normalize_date(e.get("start_date")),
            "end_date":    "Present" if is_current else normalize_date(end_raw),
            "is_current":  is_current,
            "description": e.get("description", ""),
        })
    return out

@dataclass
class ExtractedProfile:
    # Auto-extracted
    name: Optional[str] = None
    location: Optional[str] = None
    skills: list[str] = field(default_factory=list)
    work_experience: list[dict] = field(default_factory=list)
    education: list[dict] = field(default_factory=list)
    years_of_experience: Optional[int] = None

    # Candidate fills in
    desired_roles: list[str] = field(default_factory=list)
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    work_preference: Optional[str] = None
    open_to_relocation: bool = False

    # Validation
    missing_required: list[str] = field(default_factory=list)
    is_complete: bool = False


REQUIRED_PROFILE_FIELDS = [
    "name",
    "location",
    "skills",
    "years_of_experience",
    "desired_roles",
]


def extract_candidate_profile(resume_text: str) -> ExtractedProfile:
    llm = get_llm_client()

    result = llm.complete_json(
        system="""You are an expert HR analyst extracting structured candidate information from resumes.
Extract exactly these fields and return valid JSON:
- name (string): candidate full name
- location (string): city and state, empty string if not found
- skills (array of strings): all technical and professional skills mentioned
- work_experience (array of objects): each with keys:
    "title" (job title string),
    "company" (company name string),
    "start_date" (string, full month and year e.g. "January 2022"; year only if month unknown),
    "end_date" (string, use "Present" if this is a current or ongoing role; full month and year otherwise; empty string if unknown),
    "is_current" (boolean, true if this is the candidate's current active role),
    "description" (string, 2-3 sentences summarising key responsibilities and notable achievements in this role)
- education (array of objects): each with keys "degree", "school", "graduation_year"
- years_of_experience (integer): total years of professional experience, calculated from dates if possible

Always use full month names (January, February, etc.), never abbreviations.
Return only JSON, no explanation.""",
        user=f"Extract structured profile from this resume:\n\n{resume_text}",
        max_tokens=2000
    )

    profile = ExtractedProfile(
        name=result.get("name") or None,
        location=result.get("location") or None,
        skills=result.get("skills", []),
        work_experience=normalize_work_experience(result.get("work_experience", [])),
        education=result.get("education", []),
        years_of_experience=result.get("years_of_experience") or None,
    )

    # Check missing required fields
    missing = []
    for f in REQUIRED_PROFILE_FIELDS:
        val = getattr(profile, f)
        if val is None or val == [] or val == 0:
            missing.append(f)

    profile.missing_required = missing
    profile.is_complete = len(missing) == 0

    return profile


def apply_candidate_overrides(profile: ExtractedProfile, overrides: dict) -> ExtractedProfile:
    """Apply manual input from candidate for missing or incorrect fields."""
    for key, value in overrides.items():
        if hasattr(profile, key) and value not in [None, "", [], 0]:
            setattr(profile, key, value)

    # Re-check missing
    missing = []
    for f in REQUIRED_PROFILE_FIELDS:
        val = getattr(profile, f)
        if val is None or val == [] or val == 0:
            missing.append(f)

    profile.missing_required = missing
    profile.is_complete = len(missing) == 0

    return profile
