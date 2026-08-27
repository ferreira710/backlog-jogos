"""add cover_image_url to game

Revision ID: c786f0fbbf41
Revises: 52c5ad05b8b7
Create Date: 2026-08-27 15:56:53.839552

"""

from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel
from alembic import op

revision: str = "c786f0fbbf41"
down_revision: str | Sequence[str] | None = "52c5ad05b8b7"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table("game", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                "cover_image_url",
                sqlmodel.sql.sqltypes.AutoString(length=500),
                nullable=True,
            )
        )


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table("game", schema=None) as batch_op:
        batch_op.drop_column("cover_image_url")
