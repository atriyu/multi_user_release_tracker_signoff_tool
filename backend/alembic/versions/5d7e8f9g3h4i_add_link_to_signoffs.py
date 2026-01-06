"""add link to signoffs

Revision ID: 5d7e8f9g3h4i
Revises: 4c8a1e9f2d3b
Create Date: 2026-01-03 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5d7e8f9g3h4i'
down_revision: Union[str, None] = '4c8a1e9f2d3b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add link column to sign_offs table
    op.add_column('sign_offs', sa.Column('link', sa.Text(), nullable=True))


def downgrade() -> None:
    # Remove link column from sign_offs table
    op.drop_column('sign_offs', 'link')
