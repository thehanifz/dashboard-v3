"""
db/database.py
Koneksi PostgreSQL async. Satu engine, satu session factory.
"""
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.core.config import DB_URL

engine = create_async_engine(
    DB_URL,
    echo=False,
    pool_size=5,
    max_overflow=10,
    pool_pre_ping=True,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)

class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    """Dependency injection untuk FastAPI endpoint."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()