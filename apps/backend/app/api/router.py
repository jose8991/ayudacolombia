from fastapi import APIRouter

from app.domains.centers.router import router as centers_router
from app.domains.identity.auth_router import router as auth_router
from app.domains.needs.router import router as needs_router
from app.domains.reports.router import router as reports_router
from app.domains.territories.router import router as territories_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth_router)
api_router.include_router(centers_router)
api_router.include_router(needs_router)
api_router.include_router(reports_router)
api_router.include_router(territories_router)
