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
