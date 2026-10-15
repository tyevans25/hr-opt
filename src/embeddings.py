from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance, VectorParams, PointStruct, Filter,
    FieldCondition, MatchValue
)
from dotenv import load_dotenv
import os
import uuid

load_dotenv()

# Load embedding model once at module level
model = SentenceTransformer("all-MiniLM-L6-v2")

VECTOR_SIZE = 384  # all-MiniLM-L6-v2 output size
JOB_COLLECTION = "jobs"
CANDIDATE_COLLECTION = "candidates"

client = QdrantClient(url=os.getenv("QDRANT_URL", "http://localhost:6333"))


def init_collections():
    """Create Qdrant collections if they don't exist."""
    existing = [c.name for c in client.get_collections().collections]

    if JOB_COLLECTION not in existing:
        client.create_collection(
            collection_name=JOB_COLLECTION,
            vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE)
        )
        print(f"Created collection: {JOB_COLLECTION}")

    if CANDIDATE_COLLECTION not in existing:
        client.create_collection(
            collection_name=CANDIDATE_COLLECTION,
            vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE)
        )
        print(f"Created collection: {CANDIDATE_COLLECTION}")


def embed_text(text: str) -> list[float]:
    """Convert text to embedding vector."""
    return model.encode(text).tolist()


def build_job_text(job: dict) -> str:
    """Build a clean text representation of a job for embedding."""
    parts = [
        f"Job Title: {job.get('title', '')}",
        f"Company: {job.get('company', '')}",
        f"Industry: {job.get('industry', '')}",
        f"Location: {job.get('location', '')}",
        f"Required Skills: {', '.join(job.get('required_skills', []))}",
        f"Preferred Skills: {', '.join(job.get('preferred_skills', []))}",
        f"Experience Required: {job.get('min_experience_years', 0)} years",
        f"Education: {job.get('education_requirement', '')}",
    ]
    return "\n".join(parts)


def build_candidate_text(candidate: dict) -> str:
    """Build a clean text representation of a candidate for embedding."""
    parts = [
        f"Name: {candidate.get('name', '')}",
        f"Location: {candidate.get('location', '')}",
        f"Skills: {', '.join(candidate.get('skills', []))}",
        f"Years of Experience: {candidate.get('years_of_experience', 0)}",
        f"Desired Roles: {', '.join(candidate.get('desired_roles', []))}",
    ]

    # Add work experience
    for exp in candidate.get('work_experience', []):
        parts.append(f"Experience: {exp.get('title', '')} at {exp.get('company', '')}")

    # Add education
    for edu in candidate.get('education', []):
        parts.append(f"Education: {edu.get('degree', '')} from {edu.get('school', '')}")

    return "\n".join(parts)


def upsert_job(job_id: str, job: dict) -> str:
    """Embed and store a job in Qdrant. Returns vector_id."""
    text = build_job_text(job)
    vector = embed_text(text)
    vector_id = str(uuid.uuid4())

    client.upsert(
        collection_name=JOB_COLLECTION,
        points=[PointStruct(
            id=vector_id,
            vector=vector,
            payload={"job_id": job_id, **job}
        )]
    )
    return vector_id


def upsert_candidate(candidate_id: str, candidate: dict) -> str:
    """Embed and store a candidate in Qdrant. Returns vector_id."""
    text = build_candidate_text(candidate)
    vector = embed_text(text)
    vector_id = str(uuid.uuid4())

    client.upsert(
        collection_name=CANDIDATE_COLLECTION,
        points=[PointStruct(
            id=vector_id,
            vector=vector,
            payload={"candidate_id": candidate_id, **candidate}
        )]
    )
    return vector_id


def find_matching_candidates(job: dict, top_k: int = 10) -> list[dict]:
    """Find top K candidates that match a job."""
    text = build_job_text(job)
    vector = embed_text(text)

    results = client.query_points(
        collection_name=CANDIDATE_COLLECTION,
        query=vector,
        limit=top_k,
        with_payload=True
    ).points

    return [
        {
            "candidate_id": r.payload.get("candidate_id"),
            "similarity_score": round(r.score * 100, 2),
            "payload": r.payload
        }
        for r in results
    ]


def find_matching_jobs(candidate: dict, top_k: int = 10) -> list[dict]:
    """Find top K jobs that match a candidate."""
    text = build_candidate_text(candidate)
    vector = embed_text(text)

    results = client.query_points(
        collection_name=JOB_COLLECTION,
        query=vector,
        limit=top_k,
        with_payload=True
    ).points

    return [
        {
            "job_id": r.payload.get("job_id"),
            "similarity_score": round(r.score * 100, 2),
            "payload": r.payload
        }
        for r in results
    ]


if __name__ == "__main__":
    init_collections()
    print("Qdrant collections initialized.")
