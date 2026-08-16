"""La cadena que le da acceso a quien atiende un albergue.

Alguien con permiso invita, la persona crea su propia contraseña y a partir de ahí publica
qué necesita su albergue. Son cuatro piezas encadenadas —permiso, invitación, alta de
usuario y alcance— y si cualquiera se rompe el fallo no se ve hasta que un albergue real no
puede publicar. Estas pruebas cubren esa cadena y, sobre todo, sus bordes: quién no puede
invitar, qué pasa con un enlace vencido o ya usado, y hasta dónde llega el operador.
"""

import hashlib
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import pytest

from app.domains.centers.exceptions import CenterAccessDeniedError
from app.domains.centers.schemas import CenterPublicationCreate
from app.domains.centers.service import CenterService
from app.domains.identity.auth_schemas import (
    CenterOperatorInvitationCreate,
    InvitationAccept,
)
from app.domains.identity.exceptions import (
    IdentityAccessDeniedError,
    IdentityConflictError,
    InvalidInvitationError,
    InvitationCenterNotFoundError,
)
from app.domains.identity.schemas import Actor, Role
from app.domains.identity.service import IdentityService

ADMIN_ID = UUID("10000000-0000-0000-0000-000000000001")
ORG_ID = UUID("20000000-0000-0000-0000-000000000001")
CENTER_ID = UUID("30000000-0000-0000-0000-000000000001")
OTHER_CENTER_ID = UUID("30000000-0000-0000-0000-000000000002")
TERRITORY = "co-ris-pereira"


class FakeCenter:
    def __init__(self, center_id: UUID, territory_id: str = TERRITORY) -> None:
        self.id = center_id
        self.organization_id = ORG_ID
        self.territory_id = territory_id
        self.name = "Albergue Coliseo Mayor"


class FakeUser:
    def __init__(self, email: str, display_name: str) -> None:
        self.id = uuid4()
        self.email = email
        self.display_name = display_name
        self.is_active = True
        self.password_hash = ""


class FakeMembership:
    def __init__(self, role: str) -> None:
        self.organization_id = ORG_ID
        self.role = role


class FakeIdentityRepository:
    """Refleja lo que hace el repositorio real, incluida la parte que importa: al aceptar
    se crea la membresía con el rol y el centro asignados, no sólo el usuario."""

    def __init__(self, centers: dict[UUID, FakeCenter] | None = None) -> None:
        self.centers = centers if centers is not None else {CENTER_ID: FakeCenter(CENTER_ID)}
        self.users: dict[str, FakeUser] = {}
        self.invitations: list[object] = []
        self.contexts: dict[UUID, tuple[list[FakeMembership], set[str], set[UUID]]] = {}

    async def get_user_by_email(self, email):
        return self.users.get(email.lower())

    async def get_center(self, center_id):
        return self.centers.get(center_id)

    async def add_invitation(self, invitation):
        self.invitations.append(invitation)
        return invitation

    async def get_valid_invitation(self, token_hash):
        return next(
            (
                item
                for item in self.invitations
                if item.token_hash == token_hash
                and item.accepted_at is None
                and item.expires_at > datetime.now(UTC)
            ),
            None,
        )

    async def create_center_operator(self, invitation, password, privacy_policy_version):
        user = FakeUser(invitation.email, invitation.display_name)
        self.users[user.email] = user
        self.contexts[user.id] = (
            [FakeMembership(Role.CENTER_OPERATOR.value)],
            {invitation.territory_id},
            {invitation.center_id},
        )
        invitation.accepted_at = datetime.now(UTC)
        return user

    async def actor_context(self, user):
        return self.contexts.get(user.id, ([], set(), set()))


class FakeCenterRepository:
    def __init__(self) -> None:
        self.publications: list[object] = []

    async def list_for_territory(self, territory_id, include_community=False):
        return []

    async def list_for_actor(self, actor):
        return []

    async def add(self, center):
        return center

    async def get(self, center_id):
        if center_id in {CENTER_ID, OTHER_CENTER_ID}:
            return FakeCenter(center_id)
        return None

    async def list_publications(self, center_id):
        return [item for item in self.publications if item.center_id == center_id]

    async def add_publication(self, publication):
        publication.id = uuid4()
        publication.published_at = datetime.now(UTC)
        publication.status = "published"
        self.publications.append(publication)
        return publication


def administrador() -> Actor:
    return Actor(id=ADMIN_ID, display_name="Coordinación", roles={Role.ADMINISTRATOR})


def invitacion(email: str = "responsable@albergue.co") -> CenterOperatorInvitationCreate:
    return CenterOperatorInvitationCreate(
        email=email, display_name="Ana Responsable", center_id=CENTER_ID
    )


def aceptacion(token: str) -> InvitationAccept:
    return InvitationAccept(
        token=token,
        password="una-contrasena-larga",
        privacy_authorized=True,
        privacy_policy_version="2026-08-14",
    )


async def cadena_completa(
    repository: FakeIdentityRepository,
) -> Actor:
    """Invita, acepta y devuelve el actor que quedó, tal como lo verá el backend."""
    service = IdentityService(repository)
    respuesta = await service.invite_center_operator(invitacion(), administrador())
    sesion = await service.accept_invitation(aceptacion(respuesta.token))
    return sesion.actor


async def test_el_responsable_queda_con_su_albergue_asignado() -> None:
    actor = await cadena_completa(FakeIdentityRepository())
    assert actor.roles == {Role.CENTER_OPERATOR}
    assert actor.center_ids == {CENTER_ID}
    assert actor.territory_ids == {TERRITORY}


async def test_el_responsable_publica_lo_que_necesita_su_albergue() -> None:
    actor = await cadena_completa(FakeIdentityRepository())
    repositorio = FakeCenterRepository()
    publicacion = await CenterService(repositorio).publish(
        CENTER_ID,
        CenterPublicationCreate(
            title="Faltan colchonetas",
            message="Llegaron veinte familias esta noche.",
            needed_items=["Colchonetas", "Cobijas"],
            sufficient_items=["Ropa"],
        ),
        actor,
    )
    assert publicacion.needed_items == ["Colchonetas", "Cobijas"]
    # De qué ya tiene suficiente: es lo que evita que sigan llegando donaciones que estorban.
    assert publicacion.sufficient_items == ["Ropa"]
    assert len(repositorio.publications) == 1


async def test_el_responsable_no_puede_publicar_por_otro_albergue() -> None:
    actor = await cadena_completa(FakeIdentityRepository())
    with pytest.raises(CenterAccessDeniedError):
        await CenterService(FakeCenterRepository()).publish(
            OTHER_CENTER_ID,
            CenterPublicationCreate(title="Faltan cobijas", message="Prueba de alcance."),
            actor,
        )


async def test_quien_no_administra_usuarios_no_puede_invitar() -> None:
    verificador = Actor(id=uuid4(), display_name="Verificador", roles={Role.VERIFIER})
    with pytest.raises(IdentityAccessDeniedError):
        await IdentityService(FakeIdentityRepository()).invite_center_operator(
            invitacion(), verificador
        )


async def test_no_se_invita_a_un_albergue_que_no_existe() -> None:
    service = IdentityService(FakeIdentityRepository(centers={}))
    with pytest.raises(InvitationCenterNotFoundError):
        await service.invite_center_operator(invitacion(), administrador())


async def test_el_enlace_no_sirve_dos_veces() -> None:
    repository = FakeIdentityRepository()
    service = IdentityService(repository)
    respuesta = await service.invite_center_operator(invitacion(), administrador())
    await service.accept_invitation(aceptacion(respuesta.token))
    with pytest.raises(InvalidInvitationError):
        await service.accept_invitation(aceptacion(respuesta.token))


async def test_el_enlace_vencido_no_sirve() -> None:
    repository = FakeIdentityRepository()
    service = IdentityService(repository)
    respuesta = await service.invite_center_operator(invitacion(), administrador())
    repository.invitations[0].expires_at = datetime.now(UTC) - timedelta(minutes=1)
    with pytest.raises(InvalidInvitationError):
        await service.accept_invitation(aceptacion(respuesta.token))


async def test_el_enlace_dura_veinticuatro_horas() -> None:
    repository = FakeIdentityRepository()
    await IdentityService(repository).invite_center_operator(invitacion(), administrador())
    restante = repository.invitations[0].expires_at - datetime.now(UTC)
    assert timedelta(hours=23, minutes=55) < restante <= timedelta(hours=24)


async def test_no_se_invita_dos_veces_al_mismo_correo() -> None:
    repository = FakeIdentityRepository()
    service = IdentityService(repository)
    respuesta = await service.invite_center_operator(invitacion(), administrador())
    await service.accept_invitation(aceptacion(respuesta.token))
    with pytest.raises(IdentityConflictError):
        await service.invite_center_operator(invitacion(), administrador())


async def test_el_enlace_no_se_guarda_en_claro() -> None:
    """Si alguien lee la base de datos no debe poder usar las invitaciones pendientes."""
    repository = FakeIdentityRepository()
    respuesta = await IdentityService(repository).invite_center_operator(
        invitacion(), administrador()
    )
    guardada = repository.invitations[0]
    assert guardada.token_hash != respuesta.token
    assert guardada.token_hash == hashlib.sha256(respuesta.token.encode()).hexdigest()
