from sqlalchemy import Column,String, Integer,create_engine,Boolean, ForeignKey,DateTime
from sqlalchemy.orm import declarative_base, relationship, Session
import os
from datetime import datetime, timedelta, timezone

WAT = timezone(timedelta(hours=1))


DATABASE = os.getenv("DATABASE")

engine = create_engine(DATABASE)



Base = declarative_base()

class Users(Base):
  __tablename__= "users"
  id = Column(Integer,primary_key = True)
  first_name = Column(String,nullable = False)
  last_name = Column(String,nullable=False)
  email = Column(String,nullable=False)
  password = Column(String,nullable=False)
  phone_number = Column(String,nullable =False)
  address = Column(String,nullable=False)
  is_organization=Column(Boolean,default=False)
  agent_id = Column(Integer,ForeignKey ("agents.id"),nullable=True)
  organization_id = Column(Integer, ForeignKey("organizations.id"),nullable=True)

class Agents(Base):
    __tablename__ = 'agents'
    id = Column(Integer, primary_key=True)
    agent_name = Column(String(255), nullable=False)
    agent_email = Column(String(255), nullable=False, unique=True)
    agent_phone_number = Column(String(255), nullable=False)
    organization_id = Column(Integer, ForeignKey('organizations.id'))
    organization = relationship('Organization', back_populates='agents')
    number_of_assigned_devices = Column(Integer, default=0)
    location = Column(String(255), nullable=True)
    device_id = Column(Integer, ForeignKey("devices.id"),nullable = True)
    devices= relationship("Devices",back_populates="agents")
    created_at = Column(DateTime, default=lambda: datetime.now(WAT))



class  Organization(Base):
    __tablename__ = 'organizations'
    id = Column(Integer, primary_key=True)
    organization_name = Column(String(255), nullable=False)
    organization_registration = Column(String(255), nullable=False)
    devices = relationship('Device', back_populates='organization')
    agents  = relationship('Agents', back_populates='organization')
    created_at = Column(DateTime, default=lambda: datetime.now(WAT))

class Device(Base):
    __tablename__ = 'devices'
    id = Column(Integer, primary_key=True)
    device_model = Column(String(255), nullable=False)
    device_manufacturer = Column(String(255), nullable=False)
    organization_id = Column(Integer, ForeignKey('organizations.id'))
    device_type = Column(String(255),nullable = False)
    serial_number = Column(String(255),nullable=True)
    
    organization = relationship('Organization', back_populates='devices')
    manufacturer = Column(String(255), nullable=False)
    imei1 = Column(String(255), nullable=False, unique=True)
    imei2 = Column(String(255), nullable=True, unique=True)
    under_maintenance = Column(Boolean, default=False)
    
    hardware_issues = relationship(
        'HardwareIssue',
        back_populates='device',
        cascade="all, delete-orphan",
    )
    
    
    hardware_issues = Column(Boolean, default=False)
    hardware_issue_id = Column(Integer, ForeignKey('hardware_issues.id'), nullable=True)
    
    software_issues = relationship(
        'softwareIssue',
        back_populates='device',
        cascade="all, delete-orphan",
    )
    software_issue_id = Column(Integer, ForeignKey('software_issues.id'), nullable=True)

    operational = Column(String,default="fully") # we also have options like partially and no
    active = Column(Boolean,default=True)
    status = Column(String,default="Registered")
    created_at = Column(DateTime, default=lambda: datetime.now(WAT))
    location = Column(String(255), nullable=True)


class HardwareIssue(Base):
    __tablename__ = 'hardware_issues'
    id = Column(Integer, primary_key=True)
    device_id = Column(Integer, ForeignKey('devices.id'))
    device = relationship('Device', back_populates='hardware_issues')
    reported_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(String(255), nullable=True)
    scanner = Column(Boolean, default=False)
    touch_screen = Column(Boolean, default=False)
    screen = Column(Boolean, default=False)
    charging_point = Column(Boolean, default=False)
    battery = Column(Boolean,default=False)
    power = Column(Boolean,default=False)
    camera = Column(Boolean, default=False)
    others = Column(Boolean, default=False)
    description = Column(String(255), nullable=True)

class softwareIssue(Base):
    __tablename__ = "software_issues"
    id = Column(Integer, primary_key = True)
    organization_licenses = Column(Integer,nullable = True)
    multiple_ids = Column(Boolean, default=False)
    license_sharing = Column(Boolean, default = False)
    duplicate_device = Column(Boolean,default = False)
    authentication_problem = Column(Boolean,default = False)
    application_error = Column(Boolean,default = False)
    synchronization_problem = Column(Boolean,default = False)
    other = Column(String,default = "")
    description = Column(String,default = "")
    device = relationship("Devices",back_populates = "software_issues")
  

  

def get_db():
  with Session(engine) as db:
    yield db


def init():
  Base.metadata.drop_all(bind=engine)
  Base.metadata.create_all(engine)
