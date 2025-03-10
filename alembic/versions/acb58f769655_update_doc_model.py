"""Update Doc model

Revision ID: acb58f769655
Revises: 
Create Date: 2025-02-15 13:29:35.214028

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'acb58f769655'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    # op.drop_table('phone_proofs')
    op.add_column('documents', sa.Column('popularity', sa.Integer(), nullable=True))
    op.alter_column('moderation_logs', 'decision',
               existing_type=postgresql.ENUM('pending', 'approved', 'rejected', name='documentstatusenum'),
               type_=sa.String(),
               existing_nullable=False)
    op.alter_column('users', 'role',
               existing_type=postgresql.ENUM('visitor', 'user', 'moderator', 'admin', name='roleenum'),
               type_=sa.String(),
               existing_nullable=False)
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.alter_column('users', 'role',
               existing_type=sa.String(),
               type_=postgresql.ENUM('visitor', 'user', 'moderator', 'admin', name='roleenum'),
               existing_nullable=False)
    op.alter_column('moderation_logs', 'decision',
               existing_type=sa.String(),
               type_=postgresql.ENUM('pending', 'approved', 'rejected', name='documentstatusenum'),
               existing_nullable=False)
    op.drop_column('documents', 'popularity')
    # op.create_table('phone_proofs',
    sa.Column('id', sa.TEXT(), autoincrement=False, nullable=False),
    sa.Column('main_param', sa.VARCHAR(), autoincrement=False, nullable=True),
    sa.Column('verification_code', sa.VARCHAR(), autoincrement=False, nullable=True),
    sa.Column('prefix', sa.VARCHAR(), autoincrement=False, nullable=True),
    sa.Column('ip_address', sa.VARCHAR(), autoincrement=False, nullable=True),
    sa.Column('correct_code_submission_time', postgresql.TIMESTAMP(timezone=True), autoincrement=False, nullable=True),
    sa.ForeignKeyConstraint(['id'], ['proofs.id'], name='phone_proofs_id_fkey', ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name='phone_proofs_pkey')
    
    # ### end Alembic commands ###
