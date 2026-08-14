class CenterDomainError(Exception):
    """Base error for aid-center business rules."""


class CenterNotFoundError(CenterDomainError):
    pass


class CenterAccessDeniedError(CenterDomainError):
    pass
