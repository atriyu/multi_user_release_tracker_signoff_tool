"""make_templates_independent

Revision ID: 4c8a1e9f2d3b
Revises: 3b852344f19c
Create Date: 2026-01-01 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4c8a1e9f2d3b'
down_revision: Union[str, None] = '3b852344f19c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Step 1: Add default_template_id to products table
    with op.batch_alter_table('products', schema=None) as batch_op:
        batch_op.add_column(sa.Column('default_template_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key(
            'fk_products_default_template_id',
            'templates',
            ['default_template_id'],
            ['id'],
            ondelete='SET NULL'
        )

    # Step 2: Remove product_id from templates table
    # First drop the index outside batch mode
    op.drop_index('ix_templates_product_id', table_name='templates')

    # Using batch mode for SQLite compatibility to drop the column
    # recreate='always' ensures proper table recreation without the index
    with op.batch_alter_table('templates', schema=None, recreate='always') as batch_op:
        batch_op.drop_column('product_id')


def downgrade() -> None:
    # Step 1: Re-add product_id to templates (nullable since we lost the data)
    with op.batch_alter_table('templates', schema=None) as batch_op:
        batch_op.add_column(sa.Column('product_id', sa.Integer(), nullable=True))
        batch_op.create_index('ix_templates_product_id', ['product_id'], unique=False)
        batch_op.create_foreign_key(None, 'products', ['product_id'], ['id'])

    # Step 2: Remove default_template_id from products
    with op.batch_alter_table('products', schema=None) as batch_op:
        batch_op.drop_constraint('fk_products_default_template_id', type_='foreignkey')
        batch_op.drop_column('default_template_id')
