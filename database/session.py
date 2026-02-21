import os
from sqlalchemy import create_engine
from sqlalchemy.pool import NullPool
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set.")

# Clean the DATABASE_URL: SQLAlchemy 1.4+ and some drivers can't parse ?pgbouncer=true
# We strip query params to prevent DSN initialization errors.
if "?" in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.split("?")[0]

# Create the SQLAlchemy engine with NullPool for serverless optimization.
# pool_pre_ping=True ensures we check connection health before use,
# which is essential when the remote pooler (Supavisor) might drop idle ones.
# DATABASE_URL = "postgresql://postgres.xxx:password@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# We use port 6543 for Supabase connection pooling (Transaction mode)
# In serverless/FastAPI envs, it's best to use NullPool to avoid
# keeping too many idle connections on the app side when using a pooler.

engine = create_engine(
    DATABASE_URL.replace(":5432", ":6543"),
    poolclass=NullPool,
    pool_pre_ping=True
)

# SessionLocal is a factory for new database sessions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for all ORM models
Base = declarative_base()


def get_db():
    """
    Dependency generator that yields a database session and ensures
    it is properly closed after the request, even if an error occurs.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
