from sqlalchemy import Column,String, Integer,create_engine,Boolean, ForeignKey
from sqlalchemy.orm import declarative_base, relationship, Session
import os


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
  

def get_db():
  with Session(engine) as db:
    yield db


def init():
  Base.metadata.drop_all(bind=engine)
  Base.metadata.create_all(engine)
