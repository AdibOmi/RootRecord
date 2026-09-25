from fastapi import APIRouter

from app.api.v1 import auth, users

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth.router)
api_router.include_router(users.router)


@api_router.get("/health", tags=["meta"])
def health() -> dict[str, str]:
    return {"status": "ok"}
