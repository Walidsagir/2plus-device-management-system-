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
  organization_name = Column(String,nullable=True)
  organization_registration =Column(String,nullable=True)

class Employee(Base):
    __tablename__ = 'employees'
    id = Column(Integer, primary_key=True)
    employee_name = Column(String(255), nullable=False)
    employee_email = Column(String(255), nullable=False, unique=True)
    employee_phone_number = Column(String(255), nullable=False)
    organization_id = Column(Integer, ForeignKey('organizations.id'))
    organization = relationship('Organization', back_populates='employees')
    number_of_assigned_devices = Column(Integer, default=0)
    location = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(WAT))



class  Organization(Base):
    __tablename__ = 'organizations'
    id = Column(Integer, primary_key=True)
    organization_name = Column(String(255), nullable=False)
    organization_registration = Column(String(255), nullable=False)
    devices = relationship('Device', back_populates='organization')
    employees  = relationship('Employee', back_populates='organization')
    created_at = Column(DateTime, default=lambda: datetime.now(WAT))

class Device(Base):
    __tablename__ = 'devices'
    id = Column(Integer, primary_key=True)
    device_name = Column(String(255), nullable=False)
    device_type = Column(String(255), nullable=False)
    organization_id = Column(Integer, ForeignKey('organizations.id'))
    organization = relationship('Organization', back_populates='devices')
    manufacturer = Column(String(255), nullable=False)
    imei1 = Column(String(255), nullable=False, unique=True)
    imei2 = Column(String(255), nullable=True, unique=True)
    under_maintenance = Column(Boolean, default=False)
    needs_repair = Column(Boolean, default=False)
    hardware_issues = relationship(
        'HardwareIssue',
        back_populates='device',
        cascade="all, delete-orphan",
    )
    owners_name = Column(String(255), nullable=False)
    owners_phone_number = Column(String(255), nullable=False)
    under_maintainence = Column(Boolean, default=False)
    needs_repaire = Column(Boolean, default=False)
    software_issue = Column(Boolean, default=False)
    hardware_issue = Column(Boolean, default=False)
    active = Column(Boolean,default=True)
    new_license = Column(Boolean,default=True)
    reonboarding = Column(Boolean,default=False)
    hardware_issue_id = Column(Integer, ForeignKey('hardware_issues.id'), nullable=True)
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
    chargin_point = Column(Boolean, default=False)
    others = Column(Boolean, default=False)
    description = Column(String(255), nullable=True)

  

def get_db():
  with Session(engine) as db:
    yield db


def init():
  Base.metadata.drop_all(bind=engine)
  Base.metadata.create_all(engine)
