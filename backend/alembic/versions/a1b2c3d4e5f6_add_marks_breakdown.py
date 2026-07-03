"""add original marks + sub-part breakdown

Adds questions.original_marks, questions.parts and paper_questions.part_marks.
All nullable so existing rows are untouched.

Revision ID: a1b2c3d4e5f6
Revises: 14279cb02e91
Create Date: 2026-07-03

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "a1b2c3d4e5f6"
down_revision = "14279cb02e91"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("questions", sa.Column("original_marks", sa.Integer(), nullable=True))
    op.add_column("questions", sa.Column("parts", JSONB(), nullable=True))
    op.add_column("paper_questions", sa.Column("part_marks", JSONB(), nullable=True))


def downgrade() -> None:
    op.drop_column("paper_questions", "part_marks")
    op.drop_column("questions", "parts")
    op.drop_column("questions", "original_marks")
