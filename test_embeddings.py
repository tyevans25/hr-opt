from src.embeddings import init_collections, upsert_job, upsert_candidate, find_matching_candidates, find_matching_jobs

init_collections()

# Test job
job_id = "job-001"
job = {
    "title": "Data Scientist, Experimentation",
    "company": "FanDuel",
    "industry": "Sports Betting / Gaming",
    "location": "New York City",
    "required_skills": ["SQL", "Python", "A/B testing", "statistical analysis", "experimental design"],
    "preferred_skills": ["causal inference", "Bayesian modeling", "PySpark"],
    "min_experience_years": 1,
    "education_requirement": "Bachelor's in quantitative field"
}

# Test candidate
candidate_id = "candidate-001"
candidate = {
    "name": "Tyra Evans",
    "location": "Atlanta, GA",
    "skills": ["Python", "PySpark", "SQL", "Bayesian modeling", "causal inference", "machine learning", "Databricks", "Snowflake"],
    "years_of_experience": 3,
    "desired_roles": ["Data Scientist", "ML Engineer", "Analytics Engineer"],
    "work_experience": [
        {"title": "Graduate Research Assistant", "company": "Georgia State University / FanDuel"},
        {"title": "Actuarial Analyst", "company": "AIG"}
    ],
    "education": [
        {"degree": "MS Data Science and Analytics", "school": "Georgia State University"},
        {"degree": "BBA Actuarial Science", "school": "Georgia State University"}
    ]
}

print("Upserting job...")
job_vector_id = upsert_job(job_id, job)
print(f"Job vector ID: {job_vector_id}")

print("\nUpserting candidate...")
candidate_vector_id = upsert_candidate(candidate_id, candidate)
print(f"Candidate vector ID: {candidate_vector_id}")

print("\nFinding candidates matching job...")
matches = find_matching_candidates(job, top_k=5)
for m in matches:
    print(f"  Candidate: {m['payload'].get('name')} | Similarity: {m['similarity_score']}%")

print("\nFinding jobs matching candidate...")
job_matches = find_matching_jobs(candidate, top_k=5)
for m in job_matches:
    print(f"  Job: {m['payload'].get('title')} at {m['payload'].get('company')} | Similarity: {m['similarity_score']}%")
