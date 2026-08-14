class IdentityDomainError(Exception):
    """Base error for identity business rules."""


class InvalidCredentialsError(IdentityDomainError):
    pass


class IdentityAccessDeniedError(IdentityDomainError):
    pass


class InvitationCenterNotFoundError(IdentityDomainError):
    pass


class IdentityConflictError(IdentityDomainError):
    pass


class InvalidInvitationError(IdentityDomainError):
    pass
