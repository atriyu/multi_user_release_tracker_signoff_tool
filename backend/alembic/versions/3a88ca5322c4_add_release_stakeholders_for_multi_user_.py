"""add_release_stakeholders_for_multi_user_approval

Revision ID: 3a88ca5322c4
Revises: 5d7e8f9g3h4i
Create Date: 2026-01-02 20:46:31.299190

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3a88ca5322c4'
down_revision: Union[str, None] = '5d7e8f9g3h4i'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create release_stakeholders table
    op.create_table(
        'release_stakeholders',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('release_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('assigned_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['release_id'], ['releases.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('release_id', 'user_id', name='uq_release_user')
    )
    op.create_index('ix_release_stakeholders_release_id', 'release_stakeholders', ['release_id'])
    op.create_index('ix_release_stakeholders_user_id', 'release_stakeholders', ['user_id'])

    # Migrate existing data: assign all users who have signed off on any criteria in a release
    # as stakeholders for that release
    op.execute("""
        INSERT INTO release_stakeholders (release_id, user_id)
        SELECT DISTINCT rc.release_id, so.signed_by_id
        FROM sign_offs so
        JOIN release_criteria rc ON so.criteria_id = rc.id
        WHERE so.status != 'revoked'
        ORDER BY rc.release_id, so.signed_by_id
    """)


def downgrade() -> None:
    op.drop_index('ix_release_stakeholders_user_id', 'release_stakeholders')
    op.drop_index('ix_release_stakeholders_release_id', 'release_stakeholders')
    op.drop_table('release_stakeholders')
