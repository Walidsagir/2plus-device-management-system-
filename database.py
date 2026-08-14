from sqlalchemy import Column,String, Integer,create_engine, ForeignKey
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

def get_db():
  with Session(engine) as db:
    yield db


def init():
  Base.metadata.create_all(engine)
