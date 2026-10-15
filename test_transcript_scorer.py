from src.interview.transcript_scorer import summarize_interview

questions = [
    {"question_id": "q1", "question_text": "Tell me about yourself and your background."},
    {"question_id": "q2", "question_text": "Why are you interested in working at FanDuel?"},
    {"question_id": "q3", "question_text": "Tell me about a time when you had to communicate a complex idea to someone without a technical background."},
    {"question_id": "q4", "question_text": "How do you prefer to work — independently or collaboratively?"},
    {"question_id": "q5", "question_text": "Where do you see yourself in 3 years?"},
]

answers = {
    "q1": """I'm a data scientist with about 3 years of experience spanning actuarial work 
    at AIG and graduate research in causal inference at Georgia State partnering with FanDuel. 
    My background is in statistics and machine learning, and I'm really passionate about 
    using data to drive decisions rather than just report on them.""",

    "q2": """I actually worked with FanDuel data during my graduate research, building 
    Bayesian causal inference models to measure the impact of casino game launches on 
    player behavior. That experience made me really excited about the scale of problems 
    FanDuel works on and the rigor they bring to data. I'd love to continue that work 
    in a full-time capacity.""",

    "q3": """At AIG I built KPI dashboards for business leaders who weren't data people. 
    I learned to lead with the business question rather than the methodology. Instead of 
    explaining the model, I would say something like we found that accounts in this 
    segment are 30% more likely to lapse, so we should prioritize outreach there. 
    The insight first, the method only if they ask.""",

    "q4": """I like a mix honestly. I do my best deep work independently but I think 
    the best ideas come from collaboration. During my research I worked closely with 
    FanDuel stakeholders to define what success looked like before I touched any data, 
    and that made the final deliverable much more useful.""",

    "q5": """In 3 years I'd like to be owning end-to-end experimentation work — 
    designing studies, analyzing results, and helping teams build a culture around 
    data-driven decisions. I want to be the person people come to when they need 
    to know if something actually worked."""
}

print("Summarizing interview...\n")
result = summarize_interview(
    questions=questions,
    answers=answers,
    job_title="Data Scientist, Experimentation",
    company="FanDuel"
)

print(f"Interview ID: {result.interview_id}")
print(f"\nSummary:\n{result.summary}")
print(f"\nStrengths:")
for s in result.strengths:
    print(f"  - {s}")
print(f"\nNotable Answers:")
for n in result.notable_answers:
    print(f"  Q: {n.get('question')}")
    print(f"  Highlight: {n.get('highlight')}")
print(f"\nFlags:")
for f in result.flags:
    print(f"  - {f}")
print(f"\nAnswers stored in Qdrant: {len(answers)}")
