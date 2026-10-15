import os
import uuid
import bcrypt
import jwt
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET", "hr-opt-dev-secret-change-in-production")
ALGORITHM = "HS256"
TOKEN_EXPIRY_DAYS = 30


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def create_token(user_id: str, role: str, linked_id: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "linked_id": linked_id,
        "exp": datetime.utcnow() + timedelta(days=TOKEN_EXPIRY_DAYS)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
