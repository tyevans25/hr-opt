"""
Seed the question bank with a general-purpose set of interview questions.
Run from project root with venv active:
  python3 seed_questions.py
"""
import uuid, os, sys
sys.path.insert(0, os.path.dirname(__file__))

from src.db import SessionLocal, Question, QuestionCategory

QUESTIONS = [
    # ── Introduction (always first, is_fixed=True) ──────────────────────────
    {
        "category": QuestionCategory.introduction,
        "template": "Tell me about yourself and what brings you to this role.",
        "is_fixed": True,
        "intent_text": "Candidate gives a concise, relevant professional summary and connects their background to the role.",
    },
    {
        "category": QuestionCategory.introduction,
        "template": "Walk me through your resume — what have you been working on most recently?",
        "is_fixed": True,
        "intent_text": "Candidate summarizes recent experience clearly and highlights what's most relevant.",
    },
    {
        "category": QuestionCategory.introduction,
        "template": "What made you interested in this particular position?",
        "is_fixed": False,
        "intent_text": "Candidate demonstrates genuine interest in the role and has done research on the company.",
    },

    # ── Behavioral ──────────────────────────────────────────────────────────
    {
        "category": QuestionCategory.behavioral,
        "template": "Tell me about a time you had to deliver results under a tight deadline. How did you handle it?",
        "is_fixed": False,
        "intent_text": "Candidate demonstrates prioritization, composure, and a successful outcome under pressure.",
    },
    {
        "category": QuestionCategory.behavioral,
        "template": "Describe a situation where you disagreed with a colleague or manager. What did you do?",
        "is_fixed": False,
        "intent_text": "Candidate shows professionalism, constructive communication, and ability to navigate conflict.",
    },
    {
        "category": QuestionCategory.behavioral,
        "template": "Tell me about a project you're proud of. What was your specific contribution?",
        "is_fixed": False,
        "intent_text": "Candidate clearly owns a specific contribution, shows impact, and takes appropriate credit.",
    },
    {
        "category": QuestionCategory.behavioral,
        "template": "Describe a time you had to learn something new quickly. How did you approach it?",
        "is_fixed": False,
        "intent_text": "Candidate demonstrates learning agility, resourcefulness, and a growth mindset.",
    },
    {
        "category": QuestionCategory.behavioral,
        "template": "Tell me about a time you made a mistake at work. What happened and what did you do?",
        "is_fixed": False,
        "intent_text": "Candidate shows accountability, self-awareness, and a clear fix or lesson learned.",
    },
    {
        "category": QuestionCategory.behavioral,
        "template": "Give me an example of a time you had to work with limited resources or information.",
        "is_fixed": False,
        "intent_text": "Candidate shows resourcefulness, good judgment under ambiguity, and initiative.",
    },
    {
        "category": QuestionCategory.behavioral,
        "template": "Tell me about a time you had to collaborate across teams or departments to get something done.",
        "is_fixed": False,
        "intent_text": "Candidate demonstrates cross-functional communication and alignment skills.",
    },

    # ── Culture ─────────────────────────────────────────────────────────────
    {
        "category": QuestionCategory.culture,
        "template": "What kind of work environment do you do your best work in?",
        "is_fixed": False,
        "intent_text": "Candidate's preferences align with the team's working style; they can articulate what they need to thrive.",
    },
    {
        "category": QuestionCategory.culture,
        "template": "How do you like to receive feedback from managers or peers?",
        "is_fixed": False,
        "intent_text": "Candidate demonstrates openness to feedback and has a constructive, growth-oriented mindset.",
    },
    {
        "category": QuestionCategory.culture,
        "template": "What does a great workday look like for you?",
        "is_fixed": False,
        "intent_text": "Candidate's motivators and energy sources are visible and align with the role's day-to-day.",
    },
    {
        "category": QuestionCategory.culture,
        "template": "How do you stay organized and on top of multiple priorities?",
        "is_fixed": False,
        "intent_text": "Candidate has clear, reliable systems for managing their time and workload.",
    },

    # ── Company ─────────────────────────────────────────────────────────────
    {
        "category": QuestionCategory.company,
        "template": "What do you know about our company, and what excites you about working here?",
        "is_fixed": False,
        "intent_text": "Candidate has done research and can articulate genuine, specific reasons for interest.",
    },
    {
        "category": QuestionCategory.company,
        "template": "Where do you see yourself in the next two to three years?",
        "is_fixed": False,
        "intent_text": "Candidate has realistic career goals that can plausibly be met within this company.",
    },
    {
        "category": QuestionCategory.company,
        "template": "What's something you'd want to accomplish in your first 90 days in this role?",
        "is_fixed": False,
        "intent_text": "Candidate shows initiative, realistic expectations, and has thought about how to ramp up.",
    },
]


def main():
    db = SessionLocal()
    try:
        existing = db.query(Question).count()
        if existing > 0:
            print(f"Question bank already has {existing} questions. Skipping.")
            return

        for q in QUESTIONS:
            question = Question(
                id=str(uuid.uuid4()),
                category=q["category"],
                template=q["template"],
                is_fixed=q.get("is_fixed", False),
                has_blank=False,
                intent_text=q.get("intent_text"),
            )
            db.add(question)

        db.commit()
        print(f"✓ Seeded {len(QUESTIONS)} questions.")
        for cat in QuestionCategory:
            count = sum(1 for q in QUESTIONS if q["category"] == cat)
            print(f"  {cat.value}: {count}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
