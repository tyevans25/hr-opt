from src.parsers.resume import parse_resume
from src.scoring.resume_scorer import extract_jd_requirements, score_resume

# Load JD
with open("sample_jd.txt", "r") as f:
    jd_text = f.read()

# Load resume
resume = parse_resume("Resume_Tyra_Evans_Data_Scientist_2026-07-2.pdf")

print("Extracting JD requirements...")
jd = extract_jd_requirements(jd_text)
print(f"Title: {jd.title}")
print(f"Company: {jd.company}")
print(f"Location: {jd.location}")
print(f"Required Skills: {jd.required_skills}")
print(f"Preferred Skills: {jd.preferred_skills}")
print(f"Min Experience: {jd.min_experience_years} years")
print(f"Education: {jd.education_requirement}")

print("\nScoring resume...")
score = score_resume(resume, jd)
print(f"\nOverall Score:    {score.overall_score}/100")
print(f"Skill Match:      {score.skill_match_score}/100")
print(f"Experience:       {score.experience_score}/100")
print(f"Education:        {score.education_score}/100")
print(f"Recommendation:   {score.recommendation}")
print(f"\nReasoning: {score.reasoning}")
print(f"\nStrengths:")
for s in score.strengths:
    print(f"  - {s}")
print(f"\nGaps:")
for g in score.gaps:
    print(f"  - {g}")
