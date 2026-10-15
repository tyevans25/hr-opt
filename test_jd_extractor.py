from src.scoring.jd_extractor import extract_jd, apply_employer_overrides

with open("sample_jd.txt", "r") as f:
    jd_text = f.read()

print("Extracting JD...")
jd = extract_jd(jd_text)

print(f"\n--- EXTRACTED ---")
print(f"Title:           {jd.title}")
print(f"Company:         {jd.company}")
print(f"Location:        {jd.location}")
print(f"Industry:        {jd.industry}")
print(f"Salary:          ${jd.salary_min} - ${jd.salary_max}")
print(f"Experience:      {jd.min_experience_years} years")
print(f"Education:       {jd.education_requirement}")
print(f"Employment Type: {jd.employment_type}")
print(f"Required Skills: {jd.required_skills}")
print(f"Preferred Skills:{jd.preferred_skills}")

print(f"\n--- VALIDATION ---")
print(f"Complete:        {jd.is_complete}")
if jd.missing_required:
    print(f"Missing fields:  {jd.missing_required}")
    print("\nSimulating employer filling in missing fields...")
    overrides = {}
    for f in jd.missing_required:
        if f == "industry":
            overrides[f] = "Sports Betting / Gaming"
        elif f == "salary_min":
            overrides[f] = 98000
        elif f == "salary_max":
            overrides[f] = 122000
        elif f == "employment_type":
            overrides[f] = "hybrid"

    jd = apply_employer_overrides(jd, overrides)
    print(f"Complete after overrides: {jd.is_complete}")
    print(f"Still missing: {jd.missing_required}")
else:
    print("All required fields present — ready to save.")
