from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./dreamscope.db")

# Configure connect_args depending on driver while keeping line lengths reasonable
if DATABASE_URL.startswith("sqlite"):
    _connect_args = {"check_same_thread": False}
else:
    # For Postgres and others, it's safe to omit sslmode locally; keep require if env sets it
    _connect_args = {"sslmode": os.getenv("DB_SSLMODE", "require")}

engine = create_engine(DATABASE_URL, connect_args=_connect_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass
