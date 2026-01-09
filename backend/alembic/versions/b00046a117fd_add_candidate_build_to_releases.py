"""add candidate_build to releases

Revision ID: b00046a117fd
Revises: d9ddb1a4d79e
Create Date: 2026-01-07 21:02:46.467491

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b00046a117fd'
down_revision: Union[str, None] = 'd9ddb1a4d79e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('releases', sa.Column('candidate_build', sa.String(length=255), nullable=True))


def downgrade() -> None:
    op.drop_column('releases', 'candidate_build')
