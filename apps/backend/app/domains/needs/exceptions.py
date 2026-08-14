class NeedDomainError(Exception):
    """Base error for assistance-need business rules."""


class NeedNotFoundError(NeedDomainError):
    pass


class NeedIdempotencyConflictError(NeedDomainError):
    pass
