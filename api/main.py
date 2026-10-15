from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import router
from api.auth import router as auth_router

app = FastAPI(
    title="HR-Opt API",
    description="AI-powered resume screening and candidate scoring",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")
app.include_router(auth_router, prefix="/api")

@app.get("/")
def health_check():
    return {"status": "ok", "version": "0.1.0"}
