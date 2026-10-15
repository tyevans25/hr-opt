from sqlalchemy import (
    create_engine, Column, String, Integer, Float, 
    Boolean, DateTime, Date, Text, JSON, ForeignKey, Enum
)
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from sqlalchemy.sql import func
from dotenv import load_dotenv
import os
import enum

load_dotenv()

engine = create_engine(os.getenv("POSTGRES_URL"))
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

# --- Enums ---

class EmploymentType(str, enum.Enum):
    remote = "remote"
    hybrid = "hybrid"
    onsite = "onsite"

class RecommendationLabel(str, enum.Enum):
    strong_yes = "Strong Yes"
    yes = "Yes"
    maybe = "Maybe"
    no = "No"

class ApplicationStatus(str, enum.Enum):
    new = "new"
    reviewed = "reviewed"
    interview = "interview"
    rejected = "rejected"

# --- Employer / Job Side ---

class Employer(Base):
    __tablename__ = "employers"

    id = Column(String, primary_key=True)
    company_name = Column(String, nullable=False)
    email = Column(String, nullable=False, unique=True)
    industry = Column(String)
    created_at = Column(DateTime, server_default=func.now())

    jobs = relationship("Job", back_populates="employer")


class Job(Base):
    __tablename__ = "jobs"

    id = Column(String, primary_key=True)
    employer_id = Column(String, ForeignKey("employers.id"), nullable=False)

    # Required fields
    title = Column(String, nullable=False)
    company = Column(String, nullable=False)
    location = Column(String, nullable=False)
    industry = Column(String, nullable=False)
    salary_min = Column(Integer, nullable=False)
    salary_max = Column(Integer, nullable=False)
    required_skills = Column(JSON, nullable=False)  # list of strings
    min_experience_years = Column(Integer, nullable=False)
    education_requirement = Column(String, nullable=True)  # kept for backward compat
    education_level = Column(String, nullable=True)
    education_field = Column(String, nullable=True)
    education_notes = Column(String, nullable=True)

    # Optional fields
    preferred_skills = Column(JSON, default=list)
    employment_type = Column(Enum(EmploymentType), nullable=True)
    skill_weights = Column(JSON, default=dict)
    education_fields = Column(JSON, default=list)  # list of field tags

    # Hiring manager who posted the job
    posted_by_user_id = Column(String, ForeignKey("users.id"), nullable=True)

    # Raw JD text for reference
    raw_jd_text = Column(Text)

    # AI-generated candidate-facing content (generated async after job save)
    jd_summary = Column(Text, nullable=True)          # 2-3 sentence overview for candidates
    jd_standardized = Column(Text, nullable=True)     # full JD in consistent format

    # Application deadline
    application_deadline = Column(Date, nullable=True)

    # Qdrant vector ID
    vector_id = Column(String)

    created_at = Column(DateTime, server_default=func.now())

    employer = relationship("Employer", back_populates="jobs")
    applications = relationship("Application", back_populates="job")


# --- Candidate Side ---

class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(String, primary_key=True)
    email = Column(String, nullable=False, unique=True)
    name = Column(String, nullable=False)
    first_name = Column(String)
    last_name = Column(String)
    location = Column(String)

    # Auto-extracted from resume
    skills = Column(JSON, default=list)
    work_experience = Column(JSON, default=list)  # list of {company, title, dates}
    education = Column(JSON, default=list)        # list of {degree, school, year}
    years_of_experience = Column(Integer)

    # Candidate fills in manually
    desired_roles = Column(JSON, default=list)    # list of strings
    salary_min = Column(Integer)
    salary_max = Column(Integer)
    work_preference = Column(Enum(EmploymentType), nullable=True)
    open_to_relocation = Column(Boolean, default=False)

    # Raw resume text
    raw_resume_text = Column(Text)
    resume_filename = Column(String)

    # Qdrant vector ID
    vector_id = Column(String)

    created_at = Column(DateTime, server_default=func.now())

    applications = relationship("Application", back_populates="candidate")


# --- Application (links candidate to job) ---

class Application(Base):
    __tablename__ = "applications"

    id = Column(String, primary_key=True)
    candidate_id = Column(String, ForeignKey("candidates.id"), nullable=False)
    job_id = Column(String, ForeignKey("jobs.id"), nullable=False)

    # Scores
    overall_score = Column(Float)
    skill_match_score = Column(Float)
    experience_score = Column(Float)
    relevant_experience_years = Column(Float, nullable=True)  # LLM-estimated relevant years
    education_score = Column(Float)
    recommendation = Column(Enum(RecommendationLabel), nullable=True)
    reasoning = Column(Text)
    strengths = Column(JSON, default=list)
    gaps = Column(JSON, default=list)
    matched_skills = Column(JSON, default=list)
    missing_skills = Column(JSON, default=list)
    score_details = Column(JSON, default=dict)  # {overall, skills, experience, education} explanations

    status = Column(Enum(ApplicationStatus), default=ApplicationStatus.new)
    created_at = Column(DateTime, server_default=func.now())

    candidate = relationship("Candidate", back_populates="applications")
    job = relationship("Job", back_populates="applications")


class UserRole(str, enum.Enum):
    employer = "employer"
    candidate = "candidate"

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)
    email = Column(String, nullable=False, unique=True)
    password_hash = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    first_name = Column(String)
    last_name = Column(String)
    title = Column(String)  # job title e.g. "Head of Engineering"
    employer_id = Column(String, ForeignKey("employers.id"), nullable=True)
    candidate_id = Column(String, ForeignKey("candidates.id"), nullable=True)
    # Email verification
    email_verified = Column(Boolean, default=False)
    email_verify_token = Column(String)
    token_expiry = Column(DateTime)
    domain_verified = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())


def init_db():
    Base.metadata.create_all(bind=engine)
    print("Database tables created.")

if __name__ == "__main__":
    init_db()


# --- Question Bank ---

class QuestionCategory(str, enum.Enum):
    introduction = "introduction"
    behavioral = "behavioral"
    culture = "culture"
    company = "company"

class Question(Base):
    __tablename__ = "questions"

    id = Column(String, primary_key=True)
    category = Column(Enum(QuestionCategory), nullable=False)
    template = Column(Text, nullable=False)        # e.g. "Tell me about a time when you [...]"
    has_blank = Column(Boolean, default=False)      # True if employer fills in a blank
    blank_hint = Column(String)                    # e.g. "describe a challenge or situation"
    is_fixed = Column(Boolean, default=False)      # True = always included, can't be removed
    created_at = Column(DateTime, server_default=func.now())

    intent_text = Column(Text)   # what a good answer looks like, used for embedding
    intent_vector_id = Column(String)  # Qdrant vector ID for intent embedding
    job_questions = relationship("JobQuestion", back_populates="question")


class JobQuestion(Base):
    __tablename__ = "job_questions"

    id = Column(String, primary_key=True)
    job_id = Column(String, ForeignKey("jobs.id"), nullable=False)
    question_id = Column(String, ForeignKey("questions.id"), nullable=False)
    customized_text = Column(Text)                 # filled-in version of the template
    weight = Column(Float, default=1.0)
    order = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())

    question = relationship("Question", back_populates="job_questions")


class Interview(Base):
    __tablename__ = "interviews"

    id = Column(String, primary_key=True)
    candidate_id = Column(String, ForeignKey("candidates.id"), nullable=False)
    job_id = Column(String, ForeignKey("jobs.id"), nullable=False)
    overall_score = Column(Float)
    recommendation = Column(Enum(RecommendationLabel), nullable=True)
    summary = Column(Text)
    strengths = Column(JSON, default=list)
    gaps = Column(JSON, default=list)
    created_at = Column(DateTime, server_default=func.now())

    answers = relationship("InterviewAnswer", back_populates="interview")


class InterviewAnswer(Base):
    __tablename__ = "interview_answers"

    id = Column(String, primary_key=True)
    interview_id = Column(String, ForeignKey("interviews.id"), nullable=False)
    job_question_id = Column(String, ForeignKey("job_questions.id"), nullable=False)
    answer_text = Column(Text)
    similarity_score = Column(Float)               # cosine similarity vs question intent
    overall_score = Column(Float)
    vector_id = Column(String)                     # Qdrant vector ID
    created_at = Column(DateTime, server_default=func.now())

    interview = relationship("Interview", back_populates="answers")
