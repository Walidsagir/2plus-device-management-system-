from sqlalchemy import Column, String, Integer, create_engine, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import declarative_base, relationship, Session
import os
from datetime import datetime, timedelta, timezone

WAT = timezone(timedelta(hours=1))

DATABASE = os.getenv("DATABASE")
if not DATABASE:
    raise RuntimeError("DATABASE environment variable is not set")

engine = create_engine(DATABASE)

Base = declarative_base()


class Users(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    password = Column(String, nullable=False)
    phone_number = Column(String, nullable=False)
    address = Column(String, nullable=False)
    is_organization = Column(Boolean, default=False)
    
    agent = relationship("Agent", back_populates="users", foreign_keys=[agent_id])
    organization = relationship(
        "Organization", back_populates="users", foreign_keys=[organization_id]
    )


class Agent(Base):
    __tablename__ = "agents"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True)
    number_of_assigned_devices = Column(Integer, default=0)
    location = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(WAT))

    organization = relationship("Organization", back_populates="agents")
    devices = relationship("Device", back_populates="agent")
    users = relationship(
        "Users", back_populates="agent", foreign_keys="Users.agent_id"
    )


class Organization(Base):
    __tablename__ = "organizations"
    id = Column(Integer, primary_key=True)
    organization_name = Column(String(255), nullable=False)
    organization_registration = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(WAT))

    devices = relationship(
        "Device", back_populates="organization", cascade="all, delete-orphan"
    )
    agents = relationship("Agent", back_populates="organization")
    users = relationship(
        "Users", back_populates="organization", foreign_keys="Users.organization_id"
    )
    issues = relationship(
        "Issue", back_populates="organization", cascade="all, delete-orphan"
    )


class Device(Base):
    __tablename__ = "devices"
    id = Column(Integer, primary_key=True)
    device_model = Column(String(255), nullable=False)
    device_manufacturer = Column(String(255), nullable=False)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True)
    device_type = Column(String(255), nullable=False)
    serial_number = Column(String(255), nullable=True)
    agent_id = Column(Integer, ForeignKey("agents.id"), nullable=True)

    imei1 = Column(String(255), nullable=False, unique=True)
    imei2 = Column(String(255), nullable=True, unique=True)
    under_maintenance = Column(Boolean, default=False)

    operational = Column(String, default="fully")  # options like partially and no
    active = Column(Boolean, default=True)
    status = Column(String, default="Registered")
    created_at = Column(DateTime, default=lambda: datetime.now(WAT))
    last_onboarded_at = Column(DateTime, nullable=True)
    location = Column(String(255), nullable=True)

    organization = relationship("Organization", back_populates="devices")
    agent = relationship("Agent", back_populates="devices")
    issues = relationship(
        "Issue", back_populates="device", cascade="all, delete-orphan"
    )


class Issue(Base):
    __tablename__ = "issues"
    id = Column(Integer, primary_key=True)

    device_id = Column(Integer, ForeignKey("devices.id"), nullable=True)  # null for org-level license issues
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)

    category = Column(String(20), nullable=False)  # 'hardware' | 'software' | 'license'
    status = Column(String(20), default="open")  # open | in_progress | resolved | closed
    severity = Column(String(20), default="medium")  # low | medium | high | critical
    title = Column(String(255), nullable=False)
    description = Column(String, default="")

    reported_at = Column(DateTime, default=lambda: datetime.now(WAT))
    reported_by = Column(Integer, ForeignKey("agents.id"), nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(String(255), nullable=True)

    device = relationship("Device", back_populates="issues")
    organization = relationship("Organization", back_populates="issues")
    components = relationship(
        "IssueComponent", back_populates="issue", cascade="all, delete-orphan"
    )


class IssueComponent(Base):
    """One row per ticked box: 'screen', 'battery', 'license_sharing', ..."""

    __tablename__ = "issue_components"
    id = Column(Integer, primary_key=True)
    issue_id = Column(Integer, ForeignKey("issues.id"), nullable=False)
    component = Column(String(50), nullable=False)

    issue = relationship("Issue", back_populates="components")


def get_db():
    with Session(engine) as db:
        yield db


def init():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
