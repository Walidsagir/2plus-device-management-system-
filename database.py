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


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, nullable=False)
    password = Column(String, nullable=False)
    phone_number = Column(String, nullable=False)
    address = Column(String, nullable=False)
    is_organization = Column(Boolean, default=False)
    agent_id = Column(Integer, ForeignKey("agents.id"), nullable=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True)

    agent = relationship("Agent", back_populates="users", foreign_keys=[agent_id])
    organization = relationship("Organization", back_populates="users", foreign_keys=[organization_id])


class Agent(Base):
    __tablename__ = "agents"
    id = Column(Integer, primary_key=True)
    agent_name = Column(String(255), nullable=False)
    agent_email = Column(String(255), nullable=False, unique=True)
    agent_phone_number = Column(String(255), nullable=False)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=True)
    number_of_assigned_devices = Column(Integer, default=0)
    location = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(WAT))

    organization = relationship("Organization", back_populates="agents")
    devices = relationship("Device", back_populates="agent", cascade="all, delete-orphan")
    users = relationship("User", back_populates="agent")


class Organization(Base):
    __tablename__ = "organizations"
    id = Column(Integer, primary_key=True)
    organization_name = Column(String(255), nullable=False)
    organization_registration = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(WAT))

    devices = relationship("Device", back_populates="organization", cascade="all, delete-orphan")
    agents = relationship("Agent", back_populates="organization")
    users = relationship("User", back_populates="organization")


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
    location = Column(String(255), nullable=True)

    organization = relationship("Organization", back_populates="devices")
    agent = relationship("Agent", back_populates="devices")

    hardware_issues = relationship(
        "HardwareIssue",
        back_populates="device",
        cascade="all, delete-orphan",
    )
    software_issues = relationship(
        "SoftwareIssue",
        back_populates="device",
        cascade="all, delete-orphan",
    )


class HardwareIssue(Base):
    __tablename__ = "hardware_issues"
    id = Column(Integer, primary_key=True)
    device_id = Column(Integer, ForeignKey("devices.id"))
    reported_at = Column(DateTime, default=lambda: datetime.now(WAT))
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(String(255), nullable=True)
    scanner = Column(Boolean, default=False)
    touch_screen = Column(Boolean, default=False)
    screen = Column(Boolean, default=False)
    charging_point = Column(Boolean, default=False)
    battery = Column(Boolean, default=False)
    power = Column(Boolean, default=False)
    camera = Column(Boolean, default=False)
    others = Column(Boolean, default=False)
    description = Column(String(255), nullable=True)

    device = relationship("Device", back_populates="hardware_issues")


class SoftwareIssue(Base):
    __tablename__ = "software_issues"
    id = Column(Integer, primary_key=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=True)
    organization_licenses = Column(Integer, nullable=True)
    multiple_ids = Column(Boolean, default=False)
    license_sharing = Column(Boolean, default=False)
    duplicate_device = Column(Boolean, default=False)
    authentication_problem = Column(Boolean, default=False)
    application_error = Column(Boolean, default=False)
    synchronization_problem = Column(Boolean, default=False)
    other = Column(String, default="")
    description = Column(String, default="")

    device = relationship("Device", back_populates="software_issues")


def get_db():
    db = Session(engine)
    try:
        yield db
    finally:
        db.close()


def init():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
