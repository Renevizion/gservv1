from sqlalchemy.orm import sessionmaker
from models import get_engine
from config import get_settings


def _make_factory():
    settings = get_settings()
    engine = get_engine(settings.database_url)
    return sessionmaker(autocommit=False, autoflush=False, bind=engine), engine


SessionLocal, engine = _make_factory()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
