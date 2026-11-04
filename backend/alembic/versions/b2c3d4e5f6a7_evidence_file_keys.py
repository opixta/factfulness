"""evidence file keys

Revision ID: b2c3d4e5f6a7
Revises: 192a790309cf
Create Date: 2026-11-04 12:00:00

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, None] = "192a790309cf"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("evidence", sa.Column("scanned_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("evidence", sa.Column("quarantine_file_key", sa.Text(), nullable=True))
    op.add_column("evidence", sa.Column("file_key", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("evidence", "file_key")
    op.drop_column("evidence", "quarantine_file_key")
    op.drop_column("evidence", "scanned_at")
