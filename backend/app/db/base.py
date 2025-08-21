from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from dotenv import load_dotenv
import os
import urllib.parse

load_dotenv()

# Read and normalize DATABASE_URL
_raw_db_url = os.getenv("DATABASE_URL", "sqlite:///./dreamscope.db")

# If Postgres URL is provided, ensure the SQLAlchemy driver and SSL are correct
if _raw_db_url.startswith(("postgresql://", "postgres://", "postgresql+psycopg://")):
    db_url = _raw_db_url
    # Normalize to psycopg v3 driver
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql+psycopg://", 1)
    elif db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+psycopg://", 1)

    # Ensure sslmode=require for Supabase
    parsed = urllib.parse.urlsplit(db_url)
    query = parsed.query or ""
    if "sslmode=" not in query:
        new_query = (query + ("&" if query else "") + "sslmode=require")
        db_url = urllib.parse.urlunsplit(
            (parsed.scheme, parsed.netloc, parsed.path, new_query, parsed.fragment)
        )
    DATABASE_URL = db_url
else:
    DATABASE_URL = _raw_db_url

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass