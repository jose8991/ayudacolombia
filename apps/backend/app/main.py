from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.router import api_router
from app.core.config import get_settings
from app.core.observability import RequestContextMiddleware
from app.domains.abuse.exceptions import RateLimitExceededError
from app.domains.centers.exceptions import (
    CenterAccessDeniedError,
    CenterNotFoundError,
    EmptyCenterUpdateError,
)
from app.domains.identity.exceptions import (
    IdentityAccessDeniedError,
    IdentityConflictError,
    InvalidCredentialsError,
    InvalidInvitationError,
    InvitationCenterNotFoundError,
)
from app.domains.needs.exceptions import NeedIdempotencyConflictError, NeedNotFoundError
from app.domains.reports.exceptions import (
    ForeignEnRouteError,
    InvalidModerationStatusError,
    ReportAccessDeniedError,
    ReportIdempotencyConflictError,
    ReportNotFoundError,
)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    yield


settings = get_settings()
app = FastAPI(
    title="SOS Pereira API",
    version="0.1.0",
    description="Contrato para coordinación humanitaria territorial.",
    lifespan=lifespan,
)
app.add_middleware(RequestContextMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH"],
    allow_headers=["Content-Type", "Authorization", "Idempotency-Key"],
)
app.include_router(api_router)


def error_response(request: Request, status_code: int, code: str, message: str) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "error": {
                "code": code,
                "message": message,
                "details": None,
                "request_id": getattr(request.state, "request_id", None),
            }
        },
    )


@app.exception_handler(RateLimitExceededError)
async def rate_limit_handler(request: Request, exc: RateLimitExceededError) -> JSONResponse:
    response = error_response(
        request, 429, "RATE_LIMIT_EXCEEDED", "Demasiados intentos. Espera un momento."
    )
    response.headers["Retry-After"] = str(exc.retry_after)
    return response


@app.exception_handler(InvalidCredentialsError)
async def invalid_credentials_handler(request: Request, _: InvalidCredentialsError) -> JSONResponse:
    return error_response(request, 401, "INVALID_CREDENTIALS", "Correo o contraseña incorrectos")


@app.exception_handler(IdentityAccessDeniedError)
async def identity_access_denied_handler(
    request: Request, _: IdentityAccessDeniedError
) -> JSONResponse:
    return error_response(
        request, 403, "IDENTITY_ACCESS_DENIED", "No tienes permiso para crear accesos"
    )


@app.exception_handler(InvitationCenterNotFoundError)
async def invitation_center_not_found_handler(
    request: Request, _: InvitationCenterNotFoundError
) -> JSONResponse:
    return error_response(request, 404, "CENTER_NOT_FOUND", "Centro o albergue no encontrado")


@app.exception_handler(IdentityConflictError)
async def identity_conflict_handler(request: Request, _: IdentityConflictError) -> JSONResponse:
    return error_response(request, 409, "IDENTITY_CONFLICT", "Ya existe una cuenta con este correo")


@app.exception_handler(InvalidInvitationError)
async def invalid_invitation_handler(request: Request, _: InvalidInvitationError) -> JSONResponse:
    return error_response(request, 422, "INVALID_INVITATION", "La invitación venció o no es válida")


@app.exception_handler(ReportNotFoundError)
async def report_not_found_handler(request: Request, _: ReportNotFoundError) -> JSONResponse:
    return error_response(request, 404, "REPORT_NOT_FOUND", "No encontramos ese reporte")


@app.exception_handler(ReportAccessDeniedError)
async def report_access_denied_handler(
    request: Request, _: ReportAccessDeniedError
) -> JSONResponse:
    return error_response(
        request, 403, "REPORT_ACCESS_DENIED", "No tienes permiso para revisar reportes"
    )


@app.exception_handler(InvalidModerationStatusError)
async def invalid_moderation_status_handler(
    request: Request, _: InvalidModerationStatusError
) -> JSONResponse:
    return error_response(
        request, 422, "INVALID_MODERATION_STATUS", "Estado de moderación inválido"
    )


@app.exception_handler(ForeignEnRouteError)
async def foreign_en_route_handler(request: Request, _: ForeignEnRouteError) -> JSONResponse:
    return JSONResponse(
        status_code=409,
        content={
            "error": {
                "code": "FOREIGN_EN_ROUTE",
                "message": "Otro grupo anunció ese viaje; sólo ellos pueden cancelarlo",
                "details": None,
                "request_id": getattr(request.state, "request_id", None),
            }
        },
    )


@app.exception_handler(CenterNotFoundError)
async def center_not_found_handler(request: Request, _: CenterNotFoundError) -> JSONResponse:
    return JSONResponse(
        status_code=404,
        content={
            "error": {
                "code": "CENTER_NOT_FOUND",
                "message": "Centro no encontrado",
                "details": None,
                "request_id": getattr(request.state, "request_id", None),
            }
        },
    )


@app.exception_handler(EmptyCenterUpdateError)
async def empty_center_update_handler(request: Request, _: EmptyCenterUpdateError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "EMPTY_CENTER_UPDATE",
                "message": "No enviaste ningún cambio",
                "details": None,
                "request_id": getattr(request.state, "request_id", None),
            }
        },
    )


@app.exception_handler(CenterAccessDeniedError)
async def center_access_denied_handler(
    request: Request, _: CenterAccessDeniedError
) -> JSONResponse:
    return JSONResponse(
        status_code=403,
        content={
            "error": {
                "code": "CENTER_ACCESS_DENIED",
                "message": "No tienes permiso para administrar este centro",
                "details": None,
                "request_id": getattr(request.state, "request_id", None),
            }
        },
    )


@app.exception_handler(NeedNotFoundError)
async def need_not_found_handler(request: Request, _: NeedNotFoundError) -> JSONResponse:
    return JSONResponse(
        status_code=404,
        content={
            "error": {
                "code": "NEED_NOT_FOUND",
                "message": "No encontramos una solicitud con ese código",
                "details": None,
                "request_id": getattr(request.state, "request_id", None),
            }
        },
    )


@app.exception_handler(NeedIdempotencyConflictError)
async def need_idempotency_conflict_handler(
    request: Request, _: NeedIdempotencyConflictError
) -> JSONResponse:
    return error_response(
        request,
        409,
        "IDEMPOTENCY_CONFLICT",
        "La clave de reintento ya fue utilizada con información diferente",
    )


@app.exception_handler(ReportIdempotencyConflictError)
async def report_idempotency_conflict_handler(
    request: Request, _: ReportIdempotencyConflictError
) -> JSONResponse:
    return error_response(
        request,
        409,
        "IDEMPOTENCY_CONFLICT",
        "La clave de reintento ya fue utilizada con información diferente",
    )


@app.get("/api/v1/health/live", tags=["health"])
async def live() -> dict[str, str]:
    return {"status": "ok"}
