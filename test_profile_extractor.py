from src.parsers.resume import parse_resume
from src.parsers.resume_profile_extractor import extract_candidate_profile, apply_candidate_overrides

resume = parse_resume("Resume_Tyra_Evans_Data_Scientist_2026-07-2.pdf")

print("Extracting candidate profile from resume...")
profile = extract_candidate_profile(resume.raw_text)

print(f"\n--- EXTRACTED PROFILE ---")
print(f"Name:               {profile.name}")
print(f"Location:           {profile.location}")
print(f"Years Experience:   {profile.years_of_experience}")
print(f"Skills:             {profile.skills}")
print(f"\nWork Experience:")
for exp in profile.work_experience:
    print(f"  {exp.get('title')} at {exp.get('company')} ({exp.get('start_date')} - {exp.get('end_date')})")
print(f"\nEducation:")
for edu in profile.education:
    print(f"  {edu.get('degree')} from {edu.get('school')} ({edu.get('graduation_year')})")

print(f"\n--- VALIDATION ---")
print(f"Complete:       {profile.is_complete}")
if profile.missing_required:
    print(f"Missing fields: {profile.missing_required}")
    print("\nSimulating candidate filling in missing fields...")
    overrides = {
        "desired_roles": ["Data Scientist", "ML Engineer", "Analytics Engineer"],
        "salary_min": 95000,
        "salary_max": 130000,
        "work_preference": "hybrid",
        "open_to_relocation": True
    }
    profile = apply_candidate_overrides(profile, overrides)
    print(f"Complete after overrides: {profile.is_complete}")
else:
    print("All required fields present.")

print(f"\nDesired Roles:  {profile.desired_roles}")
print(f"Salary Range:   ${profile.salary_min} - ${profile.salary_max}")
print(f"Work Pref:      {profile.work_preference}")
print(f"Relocation:     {profile.open_to_relocation}")
