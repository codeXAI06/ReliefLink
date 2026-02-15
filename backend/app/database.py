"""
Database configuration for ReliefLink
Using SQLite for MVP - PostgreSQL ready via DATABASE_URL env var
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
import os

from .config import get_settings


settings = get_settings()

# Resolve database path
if settings.DATABASE_URL.startswith("sqlite"):
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    DATABASE_URL = f"sqlite:///{os.path.join(BASE_DIR, '..', 'relieflink.db')}"
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=False
    )
else:
    DATABASE_URL = settings.DATABASE_URL
    engine = create_engine(DATABASE_URL, echo=False)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# Modern declarative base (SQLAlchemy 2.0+)
class Base(DeclarativeBase):
    pass

def get_db():
    """Dependency for getting database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initialize database tables"""
    Base.metadata.create_all(bind=engine)
