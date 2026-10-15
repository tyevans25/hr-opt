import uuid
from dataclasses import dataclass, field
from src.llm.client import get_llm_client
from src.embeddings import embed_text, client as qdrant_client
from qdrant_client.models import VectorParams, Distance, PointStruct

ANSWER_COLLECTION = "interview_answers"
VECTOR_SIZE = 384

def init_answer_collection():
    existing = [c.name for c in qdrant_client.get_collections().collections]
    if ANSWER_COLLECTION not in existing:
        qdrant_client.create_collection(
            collection_name=ANSWER_COLLECTION,
            vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE)
        )

@dataclass
class InterviewSummary:
    interview_id: str
    summary: str
    strengths: list[str] = field(default_factory=list)
    notable_answers: list[dict] = field(default_factory=list)
    flags: list[str] = field(default_factory=list)


def store_answer(
    interview_id: str,
    question_id: str,
    question_text: str,
    answer_text: str,
) -> str:
    """Embed and store a single answer in Qdrant. Returns vector_id."""
    vector = embed_text(answer_text)
    vector_id = str(uuid.uuid4())

    qdrant_client.upsert(
        collection_name=ANSWER_COLLECTION,
        points=[PointStruct(
            id=vector_id,
            vector=vector,
            payload={
                "interview_id": interview_id,
                "question_id": question_id,
                "question_text": question_text,
                "answer_text": answer_text,
            }
        )]
    )
    return vector_id


def summarize_interview(
    questions: list[dict],   # {question_id, question_text}
    answers: dict[str, str], # question_id -> answer text
    job_title: str = "",
    company: str = "",
    interview_id: str = None
) -> InterviewSummary:
    """
    Store all answers in Qdrant, then generate one LLM summary
    for the employer to read.
    """
    llm = get_llm_client()
    interview_id = interview_id or str(uuid.uuid4())

    init_answer_collection()

    # Store all answers in Qdrant
    for q in questions:
        answer = answers.get(q["question_id"], "")
        if answer:
            store_answer(
                interview_id=interview_id,
                question_id=q["question_id"],
                question_text=q["question_text"],
                answer_text=answer
            )

    # Build Q&A text for LLM
    qa_text = "\n\n".join([
        f"Q: {q['question_text']}\nA: {answers.get(q['question_id'], '[No answer provided]')}"
        for q in questions
    ])

    # One LLM call for the full summary
    result = llm.complete_json(
        system="""You are an HR assistant summarizing a soft screening interview for an employer.
These are personality and behavioral questions — not technical assessments.
Your job is to give the employer a fair, objective summary to help them decide 
whether to move forward.

Return valid JSON with exactly these keys:
- summary (string): 3-4 sentence overall impression of the candidate
- strengths (array of strings): 2-3 genuine strengths shown in their answers
- notable_answers (array of objects): 1-2 standout answers, each with keys "question" and "highlight"
- flags (array of strings): anything the employer should follow up on, empty array if none

Be objective and factual. Do not invent details not present in the answers.""",
        user=f"""Role: {job_title} at {company}

Interview Transcript:
{qa_text}

Summarize this candidate's screening interview for the employer.""",
        max_tokens=800
    )

    return InterviewSummary(
        interview_id=interview_id,
        summary=result.get("summary", ""),
        strengths=result.get("strengths", []),
        notable_answers=result.get("notable_answers", []),
        flags=result.get("flags", [])
    )
