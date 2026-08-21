"""add title_normalized and unique title per platform

Revision ID: 52c5ad05b8b7
Revises: aad742a65312
Create Date: 2026-08-21 14:16:31.564913

"""

import unicodedata
from collections import Counter
from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel
from alembic import op

revision: str = "52c5ad05b8b7"
down_revision: str | Sequence[str] | None = "aad742a65312"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _normalize_title(title: str) -> str:
    """Copia congelada de app.models.game.normalize_title.

    Migrations nao importam codigo da aplicacao: se a regra de normalizacao
    mudar amanha, esta migration precisa continuar reproduzindo o schema que
    ela produziu hoje.
    """
    decomposed = unicodedata.normalize("NFKD", title)
    without_accents = "".join(c for c in decomposed if not unicodedata.combining(c))
    return " ".join(without_accents.casefold().split())


def upgrade() -> None:
    """Upgrade schema."""
    connection = op.get_bind()

    # 1. Coluna entra nullable: NOT NULL direto quebraria com linhas existentes.
    with op.batch_alter_table("game", schema=None) as batch_op:
        batch_op.add_column(
            sa.Column(
                "title_normalized",
                sqlmodel.sql.sqltypes.AutoString(length=120),
                nullable=True,
            )
        )

    # 2. Backfill.
    rows = connection.execute(sa.text("SELECT id, title, platform FROM game")).all()
    normalized = {row.id: _normalize_title(row.title) for row in rows}

    # 3. Falha cedo e com mensagem util se os dados ja violam a unicidade.
    collisions = [
        key
        for key, count in Counter(
            (normalized[row.id], row.platform) for row in rows
        ).items()
        if count > 1
    ]
    if collisions:
        raise RuntimeError(
            "Ha jogos duplicados (mesmo titulo e plataforma) que impedem a "
            f"constraint de unicidade. Resolva antes de migrar: {collisions}"
        )

    for game_id, value in normalized.items():
        connection.execute(
            sa.text("UPDATE game SET title_normalized = :value WHERE id = :id"),
            {"value": value, "id": game_id},
        )

    # 4. Agora que toda linha tem valor, fecha para NOT NULL e cria a unique.
    with op.batch_alter_table("game", schema=None) as batch_op:
        batch_op.alter_column("title_normalized", existing_type=sa.String(length=120), nullable=False)
        batch_op.create_unique_constraint(
            "uq_game_title_platform", ["title_normalized", "platform"]
        )


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table("game", schema=None) as batch_op:
        batch_op.drop_constraint("uq_game_title_platform", type_="unique")
        batch_op.drop_column("title_normalized")
