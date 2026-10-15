import uuid
import secrets
import os
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Form, HTTPException, Header
from fastapi.responses import JSONResponse
from src.db import SessionLocal, User, Employer, Candidate, UserRole
from src.auth import hash_password, verify_password, create_token, decode_token

router = APIRouter()


# --- Email helpers ---

def _generate_verify_token() -> str:
    """6-character uppercase alphanumeric token."""
    return secrets.token_hex(3).upper()  # 6 hex chars


def _send_verification_email(to_email: str, token: str):
    """Send verification email via Resend. Silently no-ops if RESEND_API_KEY is not set."""
    api_key = os.getenv("RESEND_API_KEY")
    if not api_key:
        return  # dev mode — skip sending
    try:
        import resend
        resend.api_key = api_key
        app_url = os.getenv("APP_URL", "http://localhost:5173")
        verify_link = f"{app_url}/verify?token={token}"
        resend.Emails.send({
            "from": os.getenv("FROM_EMAIL", "noreply@hr-opt.app"),
            "to": to_email,
            "subject": "Verify your HR-Opt account",
            "html": (
                f"<p>Thanks for signing up! Verify your email to start using HR-Opt.</p>"
                f"<p><a href='{verify_link}' style='background:#5C8B6E;color:#fff;padding:10px 20px;"
                f"border-radius:8px;text-decoration:none;font-weight:600'>Verify Email</a></p>"
                f"<p>Or enter this code manually: <strong>{token}</strong></p>"
                f"<p style='color:#888;font-size:12px'>This link expires in 24 hours.</p>"
            ),
        })
    except Exception:
        pass  # don't break signup if email fails


def _check_mx(domain: str) -> bool:
    """Return True if domain has at least one MX record."""
    try:
        import dns.resolver
        records = dns.resolver.resolve(domain, "MX")
        return len(records) > 0
    except Exception:
        return False



def get_current_user(authorization: str = Header(...)):
    """Dependency — extract and verify JWT from Authorization header."""
    try:
        token = authorization.replace("Bearer ", "")
        payload = decode_token(token)
        return payload
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


@router.post("/auth/signup")
async def signup(
    email: str = Form(...),
    password: str = Form(...),
    role: str = Form(...),
    first_name: str = Form(...),
    last_name: str = Form(...),
    company_name: str = Form(None),
    industry: str = Form(None),
):
    db = SessionLocal()
    try:
        # Check email not already taken
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")

        user_id = str(uuid.uuid4())
        password_hash = hash_password(password)
        linked_id = None

        # Email verification token (24-hour expiry)
        verify_token = _generate_verify_token()
        token_expiry = datetime.now(timezone.utc) + timedelta(hours=24)

        # Domain MX check (non-blocking — failure just means domain_verified=False)
        domain = email.split("@")[-1] if "@" in email else ""
        domain_ok = _check_mx(domain) if domain else False

        if role == "employer":
            if not company_name or not industry:
                raise HTTPException(status_code=400, detail="Company name and industry required")
            employer = Employer(
                id=str(uuid.uuid4()),
                company_name=company_name,
                email=email,
                industry=industry
            )
            db.add(employer)
            db.flush()
            linked_id = employer.id

            user = User(
                id=user_id,
                email=email,
                password_hash=password_hash,
                role=UserRole.employer,
                first_name=first_name,
                last_name=last_name,
                employer_id=linked_id,
                email_verify_token=verify_token,
                token_expiry=token_expiry,
                email_verified=False,
                domain_verified=domain_ok,
            )

        elif role == "candidate":
            user = User(
                id=user_id,
                email=email,
                password_hash=password_hash,
                role=UserRole.candidate,
                first_name=first_name,
                last_name=last_name,
                email_verify_token=verify_token,
                token_expiry=token_expiry,
                email_verified=False,
                domain_verified=domain_ok,
            )
            linked_id = user_id

        else:
            raise HTTPException(status_code=400, detail="Role must be employer or candidate")

        db.add(user)
        db.commit()

        # Send verification email (non-blocking — failure doesn't abort signup)
        _send_verification_email(email, verify_token)

        token = create_token(user_id, role, linked_id or user_id)

        return JSONResponse(content={
            "token": token,
            "user_id": user_id,
            "role": role,
            "email": email,
            "linked_id": linked_id,
            "candidate_id": None,
            "employer_id": linked_id if role == "employer" else None,
            "first_name": first_name,
            "last_name": last_name,
            "name": f"{first_name} {last_name}",
            "company_name": company_name if role == "employer" else None,
            "email_verified": False,
            "domain_verified": domain_ok,
        })

    finally:
        db.close()


@router.post("/auth/login")
async def login(
    email: str = Form(...),
    password: str = Form(...),
):
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if not user or not verify_password(password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        linked_id = user.employer_id or user.candidate_id or user.id

        # Get display name
        name = email
        if user.role == UserRole.employer and user.employer_id:
            employer = db.query(Employer).filter(Employer.id == user.employer_id).first()
            if employer:
                name = employer.company_name
        elif user.role == UserRole.candidate and user.candidate_id:
            candidate = db.query(Candidate).filter(Candidate.id == user.candidate_id).first()
            if candidate:
                name = candidate.name

        token = create_token(user.id, user.role, linked_id)

        return JSONResponse(content={
            "token": token,
            "user_id": user.id,
            "role": user.role,
            "email": user.email,
            "linked_id": linked_id,
            "candidate_id": user.candidate_id,
            "employer_id": user.employer_id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "name": f"{user.first_name or ''} {user.last_name or ''}".strip() or name,
            "company_name": name if user.role == UserRole.employer else None,
            "email_verified": user.email_verified or False,
            "domain_verified": user.domain_verified or False,
        })
    finally:
        db.close()


@router.get("/auth/me")
def get_me(authorization: str = Header(...)):
    db = SessionLocal()
    try:
        payload = get_current_user(authorization)
        user = db.query(User).filter(User.id == payload["sub"]).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        linked_id = user.employer_id or user.candidate_id or user.id
        name = user.email

        if user.role == UserRole.employer and user.employer_id:
            employer = db.query(Employer).filter(Employer.id == user.employer_id).first()
            if employer:
                name = employer.company_name
        elif user.role == UserRole.candidate and user.candidate_id:
            candidate = db.query(Candidate).filter(Candidate.id == user.candidate_id).first()
            if candidate:
                name = candidate.name

        return JSONResponse(content={
            "user_id": user.id,
            "role": user.role,
            "email": user.email,
            "linked_id": linked_id,
            "candidate_id": user.candidate_id,
            "employer_id": user.employer_id,
            "name": name,
            "email_verified": user.email_verified or False,
            "domain_verified": user.domain_verified or False,
        })
    finally:
        db.close()


@router.post("/auth/verify-email")
async def verify_email(token: str = Form(...)):
    """Mark account as email-verified if token matches and hasn't expired."""
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email_verify_token == token).first()
        if not user:
            raise HTTPException(status_code=400, detail="Invalid verification token")
        if user.email_verified:
            return JSONResponse(content={"verified": True, "already_verified": True})

        expiry = user.token_expiry
        now = datetime.now(timezone.utc)
        if expiry and expiry.tzinfo is None:
            expiry = expiry.replace(tzinfo=timezone.utc)
        if expiry and now > expiry:
            raise HTTPException(status_code=400, detail="Verification token has expired")

        user.email_verified = True
        user.email_verify_token = None
        user.token_expiry = None
        db.commit()
        return JSONResponse(content={"verified": True})
    finally:
        db.close()


@router.post("/auth/resend-verification")
async def resend_verification(authorization: str = Header(...)):
    """Resend verification email for the currently authenticated user."""
    db = SessionLocal()
    try:
        payload = get_current_user(authorization)
        user = db.query(User).filter(User.id == payload["sub"]).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if user.email_verified:
            return JSONResponse(content={"sent": False, "reason": "already_verified"})

        new_token = _generate_verify_token()
        user.email_verify_token = new_token
        user.token_expiry = datetime.now(timezone.utc) + timedelta(hours=24)
        db.commit()

        _send_verification_email(user.email, new_token)
        return JSONResponse(content={"sent": True})
    finally:
        db.close()
