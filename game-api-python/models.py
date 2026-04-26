from sqlalchemy import (
    Column, Integer, String, DateTime, ForeignKey,
    Numeric, Date, create_engine, text,
)
from sqlalchemy.orm import DeclarativeBase, relationship
from datetime import datetime, timezone


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    servers = relationship("Server", back_populates="user", cascade="all, delete-orphan")
    billing = relationship("Billing", back_populates="user", cascade="all, delete-orphan")


class Server(Base):
    __tablename__ = "servers"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    game = Column(String(50), nullable=False)
    max_players = Column(Integer, default=20)
    status = Column(String(50), default="provisioning")
    ip_address = Column(String(50))
    port = Column(Integer)
    region = Column(String(50), default="us-east-1")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    user = relationship("User", back_populates="servers")
    billing = relationship("Billing", back_populates="server", cascade="all, delete-orphan")


class Billing(Base):
    __tablename__ = "billing"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    server_id = Column(Integer, ForeignKey("servers.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="USD")
    period_start = Column(Date, nullable=False)
    period_end = Column(Date, nullable=False)
    status = Column(String(50), default="pending")
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="billing")
    server = relationship("Server", back_populates="billing")


def get_engine(database_url: str):
    return create_engine(database_url, pool_pre_ping=True)
