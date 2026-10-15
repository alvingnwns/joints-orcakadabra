"""add workspaces.daily_capacity_minutes

Revision ID: b7c1d2e3f4a5
Revises: 98fcab56751f
Create Date: 2026-10-15 17:30:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b7c1d2e3f4a5"
down_revision: str | Sequence[str] | None = "98fcab56751f"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Existing workspaces keep the old fixed 240 minutes.
    op.add_column(
        "workspaces",
        sa.Column("daily_capacity_minutes", sa.Integer(), server_default="240", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("workspaces", "daily_capacity_minutes")
