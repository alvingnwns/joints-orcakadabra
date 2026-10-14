"""create workspaces and tasks

Revision ID: 98fcab56751f
Revises:
Create Date: 2026-10-14 15:26:43.896029

"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "98fcab56751f"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "workspaces",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("name", sa.String(length=100), nullable=True),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_workspaces")),
    )
    op.create_table(
        "tasks",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("workspace_id", sa.Uuid(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("estimated_minutes", sa.Integer(), nullable=True),
        sa.Column("impact_score", sa.Integer(), server_default="3", nullable=False),
        sa.Column("urgency_score", sa.Integer(), nullable=True),
        sa.Column("priority_score", sa.Integer(), nullable=True),
        sa.Column("priority_label", sa.String(length=20), nullable=True),
        # Plain strings; the allowed values are enforced by the CHECK constraints below.
        sa.Column("status", sa.String(length=20), server_default="todo", nullable=False),
        sa.Column("source_type", sa.String(length=20), server_default="manual", nullable=False),
        sa.Column("ai_summary", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "status IN ('todo', 'in_progress', 'done', 'deferred')", name=op.f("ck_tasks_status")
        ),
        sa.CheckConstraint(
            "source_type IN ('manual', 'ai_parsed')", name=op.f("ck_tasks_source_type")
        ),
        sa.ForeignKeyConstraint(
            ["workspace_id"],
            ["workspaces.id"],
            name=op.f("fk_tasks_workspace_id_workspaces"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_tasks")),
    )
    op.create_index(op.f("ix_tasks_workspace_id"), "tasks", ["workspace_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_tasks_workspace_id"), table_name="tasks")
    op.drop_table("tasks")
    op.drop_table("workspaces")
