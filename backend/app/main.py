from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import auth, papers, questions, subjects, topics

app = FastAPI(title="Gradify API", version="0.1.0")

# CORS — allow the Vite dev server (and whatever FRONTEND_URL is configured).
_origins = list(
    {
        settings.FRONTEND_URL,
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    }
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(subjects.router)
app.include_router(topics.router)
app.include_router(questions.router)
app.include_router(papers.router)


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok", "service": "gradify", "version": app.version}
