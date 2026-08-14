"""Record explicit privacy authorization evidence."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0010_privacy_evidence"
down_revision: str | None = "0009_expand_territories"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("users", sa.Column("privacy_policy_version", sa.String(32)))
    op.add_column("users", sa.Column("privacy_accepted_at", sa.DateTime(timezone=True)))
    for table in ("assistance_needs", "citizen_reports"):
        op.add_column(
            table,
            sa.Column(
                "privacy_policy_version",
                sa.String(32),
                server_default="legacy",
                nullable=False,
            ),
        )
        op.add_column(
            table,
            sa.Column(
                "privacy_accepted_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
                nullable=False,
            ),
        )
        op.alter_column(table, "privacy_policy_version", server_default=None)
        op.alter_column(table, "privacy_accepted_at", server_default=None)
    op.create_table(
        "access_invitations",
        sa.Column("id", sa.UUID(), primary_key=True),
        sa.Column("token_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("display_name", sa.String(160), nullable=False),
        sa.Column(
            "organization_id",
            sa.UUID(),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "center_id",
            sa.UUID(),
            sa.ForeignKey("aid_centers.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "territory_id",
            sa.String(80),
            sa.ForeignKey("territories.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True)),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("ix_access_invitations_token_hash", "access_invitations", ["token_hash"])
    op.create_index("ix_access_invitations_email", "access_invitations", ["email"])


def downgrade() -> None:
    op.drop_table("access_invitations")
    for table in ("citizen_reports", "assistance_needs"):
        op.drop_column(table, "privacy_accepted_at")
        op.drop_column(table, "privacy_policy_version")
    op.drop_column("users", "privacy_accepted_at")
    op.drop_column("users", "privacy_policy_version")
