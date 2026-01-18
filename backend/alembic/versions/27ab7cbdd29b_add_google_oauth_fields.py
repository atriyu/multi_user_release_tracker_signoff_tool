"""add_google_oauth_fields

Revision ID: 27ab7cbdd29b
Revises: b00046a117fd
Create Date: 2026-01-17 15:50:53.771620

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '27ab7cbdd29b'
down_revision: Union[str, None] = 'b00046a117fd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add Google OAuth fields to users table
    op.add_column('users', sa.Column('google_id', sa.String(length=255), nullable=True))
    op.add_column('users', sa.Column('avatar_url', sa.String(length=500), nullable=True))
    op.create_index(op.f('ix_users_google_id'), 'users', ['google_id'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_users_google_id'), table_name='users')
    op.drop_column('users', 'avatar_url')
    op.drop_column('users', 'google_id')
