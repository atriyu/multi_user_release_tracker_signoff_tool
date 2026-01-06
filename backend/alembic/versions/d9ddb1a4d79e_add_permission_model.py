"""add_permission_model

Revision ID: d9ddb1a4d79e
Revises: 3a88ca5322c4
Create Date: 2026-01-04 03:30:00.000000

This migration implements the new permission-based model:
1. Adds is_admin boolean to users table
2. Makes role column nullable (deprecated but kept for compatibility)
3. Creates product_permissions table for product-specific permissions
4. Migrates existing roles to new permission model:
   - admin role → is_admin = True
   - product_owner role → ProductPermission records for all products
   - stakeholder role → is_admin = False (stakeholder is now release-specific only)
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

# revision identifiers, used by Alembic.
revision = 'd9ddb1a4d79e'
down_revision = '3a88ca5322c4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add is_admin column to users table
    op.add_column('users', sa.Column('is_admin', sa.Boolean(), nullable=False, server_default='0'))

    # 2. Make role column nullable (deprecated)
    with op.batch_alter_table('users') as batch_op:
        batch_op.alter_column('role', existing_type=sa.String(), nullable=True)

    # 3. Create product_permissions table
    op.create_table(
        'product_permissions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('permission_type', sa.String(50), nullable=False, server_default='product_owner'),
        sa.Column('granted_by_id', sa.Integer(), nullable=True),
        sa.Column('granted_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['granted_by_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('product_id', 'user_id', name='uq_product_user')
    )
    op.create_index(op.f('ix_product_permissions_product_id'), 'product_permissions', ['product_id'], unique=False)
    op.create_index(op.f('ix_product_permissions_user_id'), 'product_permissions', ['user_id'], unique=False)

    # 4. Data migration: Convert existing roles to new permission model
    conn = op.get_bind()

    # 4a. Set is_admin = True for users with admin role
    conn.execute(sa.text(
        "UPDATE users SET is_admin = 1 WHERE role = 'admin'"
    ))

    # 4b. Create product_owner permissions for users with product_owner role
    # Give them permission on ALL existing products
    conn.execute(sa.text("""
        INSERT INTO product_permissions (product_id, user_id, permission_type, granted_by_id, granted_at)
        SELECT p.id as product_id, u.id as user_id, 'product_owner', NULL, CURRENT_TIMESTAMP
        FROM users u
        CROSS JOIN products p
        WHERE u.role = 'product_owner'
    """))

    # 4c. Stakeholders don't get any product permissions (they're only assigned per-release)
    # No action needed for stakeholder role


def downgrade() -> None:
    # Drop product_permissions table
    op.drop_index(op.f('ix_product_permissions_user_id'), table_name='product_permissions')
    op.drop_index(op.f('ix_product_permissions_product_id'), table_name='product_permissions')
    op.drop_table('product_permissions')

    # Make role column non-nullable again
    with op.batch_alter_table('users') as batch_op:
        batch_op.alter_column('role', existing_type=sa.String(), nullable=False)

    # Remove is_admin column
    op.drop_column('users', 'is_admin')
