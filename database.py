from sqlalchemy import Column, String, Integer, create_engine, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import declarative_base, relationship, Session
import os
from datetime import datetime, timedelta, timezone

WAT = timezone(timedelta(hours=1))

DATABASE = os.getenv("DATABASE", "sqlite:///database.db")
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
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True)

    agent = relationship("Agent", back_populates="user", uselist=False)
    organization = relationship("Organization", back_populates="users")


class Agent(Base):
    __tablename__ = "agents"
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True)
    number_of_assigned_devices = Column(Integer, default=0)
    total_enrollments = Column(Integer, default=0)
    location = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(WAT))
    organization_requests = relationship("AgentOrganizationRequest", back_populates="agent", cascade="all, delete-orphan")

    organization = relationship("Organization", back_populates="agents")
    devices = relationship("Device", back_populates="agent")
    user = relationship("Users", back_populates="agent")


class Organization(Base):
    __tablename__ = "organizations"
    id = Column(Integer, primary_key=True)
    organization_name = Column(String(255), nullable=False)
    organization_registration = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(WAT))
    organization_agent_requests = relationship("OrganizationAgentRequest", back_populates="organization", cascade="all, delete-orphan")
    organization_device_requests = relationship("OrganizationDeviceRequest",back_populates="organization",cascade="all,delete-orphan")
    devices = relationship(
        "Device", back_populates="organization", cascade="all, delete-orphan"
    )
    agents = relationship("Agent", back_populates="organization")
    users = relationship("Users", back_populates="organization")
    issues = relationship(
        "Issue", back_populates="organization", cascade="all, delete-orphan"
    )

class OrganizationAgentRequest(Base):
    __tablename__ = "organization_agent_requests"
    id = Column(Integer, primary_key=True)
    agent_id = Column(Integer, ForeignKey("agents.id"), nullable=False)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False)
    status = Column(String(20), default="pending")  # pending | approved | rejected
    agent_name = Column(String(255),nullable=False)
    agent_phone_number = Column(String(255),nullable=False)
    agent_email = Column(String(255),nullable=False)
    organization = relationship("Organization",back_populates="organization_agent_request")

    created_at = Column(DateTime, default=lambda: datetime.now(WAT))

class DeviceAgentRequest(Base):
    __tablename__="device_agent_request"
    id = Column(Integer,primary_key=True)
    agent_id = Column(Integer,ForeignKey("agent.id"))
    organization_id = Column(Integer,ForeignKey("organization.id"))
    agent_name = Column(String,nullable=False)
    agent_phone_number=Column(String,nullable=False)
    agent_email = Column(String(255),nullable=True)
    status = Column(String(255),default="pending")
    organization = relationship("Organization",back_populates="organization_device_requests")

    created_at = Column(DateTime,default=lambda:datetime.now(WAT))


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
    
    status = Column(String, default="Registered")
    created_at = Column(DateTime, default=lambda: datetime.now(WAT))
    last_onboarded_at = Column(DateTime, nullable=True)
    location = Column(String(255), nullable=True)

    onboarding = relationship("Onboarding",back_populates="device", cascade="all, delete-orphan")
    organization = relationship("Organization", back_populates="devices")
    agent = relationship("Agent", back_populates="devices")
    issues = relationship(
        "Issue", back_populates="device", cascade="all, delete-orphan"
    )

class Onboarding(Base):
    __tablename__ = "onboarding"
    id = Column(Integer, primary_key=True)
    onboarding_status = Column(String, default="onboarded")
    created_at = Column(DateTime, default=lambda:datetime.now(WAT))
    device_id = Column(Integer, ForeignKey("devices.id"))
    device = relationship("Device",back_populates="onboarding")


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
    reported_by_agent = relationship("Agent", foreign_keys=[reported_by])
    components = relationship(
        "IssueComponent", back_populates="issue", cascade="all, delete-orphan"
    )


class IssueComponent(Base):
    """One row per ticked box: 'screen', 'battery', 'license_sharing', ..."""

    __tablename__ = "issue_components"
    id = Column(Integer, primary_key=True)
    issue_id = Column(Integer, ForeignKey("issues.id"), nullable=False)
    resolve = Column(Boolean,default = False)
    component = Column(String(50), nullable=False)

    issue = relationship("Issue", back_populates="components")


def get_db():
    with Session(engine) as db:
        yield db


def init():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
