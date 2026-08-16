class ReportDomainError(Exception):
    """Base error for citizen-report business rules."""


class ReportNotFoundError(ReportDomainError):
    pass


class ReportAccessDeniedError(ReportDomainError):
    pass


class InvalidModerationStatusError(ReportDomainError):
    pass


class ReportIdempotencyConflictError(ReportDomainError):
    pass


class ForeignEnRouteError(ReportDomainError):
    """Cancelar el aviso de otro grupo dejaría a dos saliendo al mismo sitio sin saberlo."""
