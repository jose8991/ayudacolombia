class CenterDomainError(Exception):
    """Base error for aid-center business rules."""


class CenterNotFoundError(CenterDomainError):
    pass


class CenterAccessDeniedError(CenterDomainError):
    pass


class EmptyCenterUpdateError(CenterDomainError):
    """Una actualización sin cambios sería un 200 que no hizo nada."""
