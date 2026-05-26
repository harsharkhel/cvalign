from app.database import engine
from app.models import Base


def init_db() -> None:
    # MVP: create tables directly. For production, use Alembic migrations.
    Base.metadata.create_all(bind=engine)
